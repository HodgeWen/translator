# 修复 blockquote 不翻译且样式被破坏（Reddit 等富文本场景）

## 补丁内容

**症状**：在 Reddit 等使用 markdown 渲染的页面上，引用类型段落（`<blockquote><p>…</p></blockquote>`）触发整页翻译后，内容显示为原文（看起来"没翻译"），同时 blockquote 的左边框、缩进、灰底等引用视觉指示被抹除。

**根因（双层叠加）**：

1. **encode 层（`encodeInline`）**：
   - `block-detect.ts` 把 `BLOCKQUOTE` 列在 WHITELIST，无条件作为翻译单元；父子去重保留最外层，于是 `<blockquote>` 被选中、内部的 `<p>` 被丢弃。
   - 进入 `inline-placeholder.encodeInline` 后，blockquote 的子节点是 `<p>`（不在 INLINE_FLATTEN_TAGS 里），按 KEEP 分支被替换为 `#1#` 占位符并整体保留为 fragment。
   - 发送给 LLM 的 placeholderText 形如 `#1#`——根本没有任何文本可译，LLM 原样返回 `#1#`，decode 阶段把原 `<p>` 还原回去，所以视觉上"没翻译"。

2. **CSS 层（`styles.css`）**：
   - 旧规则 `[data-translator-clone] { all: revert; … }` 会把克隆元素的所有属性重置到 UA 默认。
   - 即使 cloneAsWrapper 保留了原 `<blockquote>` 的 class 与 tag，`all: revert` 仍会让站点为 `blockquote` / Reddit 引用类样式定义的 border-left / padding-left / background / color 全部失效，结果克隆 blockquote 看起来像普通段落，引用视觉指示丢失。
   - 注：bilingual / underline 是注入式 span/div，需要 `all: revert` 清洗继承的奇葩 inline 样式；但 clone 是"原标签替身"，做整体 revert 反而破坏了想保留的结构化样式（blockquote 边框、`<li>` 列表标记、`<h*>` 字号等同理）。

**修复**：

1. `src/lib/block-detect.ts`：把 `BLOCKQUOTE` 从 `WHITELIST_TAGS` 移到 `GRAYLIST_TAGS`。灰名单会要求"直接文本占比 ≥ 50%"才视作单元——
   - `<blockquote><p>…</p></blockquote>`（Reddit/GitHub/markdown 通用形态）：blockquote 直接文本为 0%，不过灰名单门槛，去重后内部 `<p>` 成为翻译单元；blockquote 容器原封不动，左边框/缩进/灰底完整保留，`<p>` 内容被正常翻译。
   - `<blockquote>纯文本引用</blockquote>`（裸文本场景）：直接文本占比 100%，仍可作为整段翻译单元，行为与之前一致。

2. `src/entrypoints/content/styles.css`：把 `all: revert` 从 `.translator-ext-wrapper` 与 `[data-translator-clone]` 上去掉，只保留给 `[data-translator-bilingual]` 与 `[data-translator-underline]`。clone 用站点自身样式即可。同步更新文件顶部注释，澄清"clone 自然继承 vs 注入式 span 需 revert"的差异。

类型检查 (`bun compile`) 与构建 (`bun run build`) 均通过。

## 影响范围

- 修改文件: `src/lib/block-detect.ts`
- 修改文件: `src/entrypoints/content/styles.css`
