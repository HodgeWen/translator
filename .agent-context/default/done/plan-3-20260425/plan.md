# 行内占位符保留机制

> 状态: 已执行

## 目标

当前四种显示样式里，`original` / `clean` 用 `wrapper.textContent = translatedText` 直接吃掉 `<a>` / `<code>` / `<strong>` / `<img>` 等全部行内结构；`bilingual` / `underline` 虽然保留原文 HTML 但译文仍是纯文本。对 GitHub README / MDN / 技术博客而言这意味着译后段落里链接全部失活、inline code 变成普通文字、粗体丢失——严重影响可读性和可点击性。

本计划引入 kiss-translator 同款"编号占位符"策略：翻译前把行内富文本节点抽取成 `#1#`、`#2#` 数字标记，发送纯文本给 LLM，译文回传后再把占位符还原为原 HTML 片段。该策略在绝大多数主流 LLM 上测试稳定，比让模型直接翻译 HTML 片段更可靠（后者依赖模型合规性，易破坏标签）。

依赖 plan-2 的 `BlockCandidate` 数据结构。

## 内容

### 1. 在 `src/lib/` 新增 `inline-placeholder.ts`

纯函数 API：

```
export interface EncodedBlock {
  placeholderText: string;   // 送给 LLM 的文本，含 #1# #2# …
  fragments: DocumentFragment[];   // 按编号索引的原 HTML 片段（1-based 对齐 placeholder 数字）
}

export function encodeInline(el: HTMLElement): EncodedBlock;
export function decodeInline(translated: string, fragments: DocumentFragment[]): DocumentFragment;
```

规则：

- **保留占位的行内标签集合（INLINE_KEEP）**：`A, CODE, KBD, SAMP, VAR, IMG, SUB, SUP, ABBR, CITE, MARK, SPAN[class*="math"], SPAN[class*="katex"]`。
- **不保留占位，展平为文字的行内标签（INLINE_FLATTEN）**：`STRONG, B, EM, I, U, SMALL, SPAN`（默认 span）——这些是"文本强调"而非"语义载体"，让它们跟着文字一起翻译更自然；若 `<span>` 带上述特殊 class（math/katex）则归入 KEEP。
- **BR 处理**：直接转 `\n`，译文回填时还原为 `<br>`。
- 遍历 `el.childNodes`：
  - `TextNode` → 原样拼接。
  - `Element` ∈ INLINE_KEEP → 占用新编号 `n`，`placeholderText` 追加 `#n#`，`fragments[n-1]` = 该元素的 `cloneNode(true)` 包装进 `DocumentFragment`。
  - `Element` ∈ INLINE_FLATTEN → 递归 `encodeInline(child)` 并把产物内联到当前流中（编号继续累加）。
  - `BR` → 追加 `\n`。
  - 其它未知元素 → 当作 KEEP 安全处理（避免丢 DOM）。

### 2. 占位符编号格式

- 采用 `#1#`（数字两侧单 `#`）。理由：
  - kiss-translator 验证过主流 LLM（GPT / Claude / Gemini / 文心等）对 `#N#` 的保留率最高，比 `{{N}}` / `[[N]]` 更稳。
  - 不与 Markdown `#` 标题冲突（因为我们发的是纯文本段落而非 Markdown 头）。
  - 数字自 1 起递增，避免 0 导致的边界问题。

### 3. 译文回填 `decodeInline`

- 正则 `/#(\d+)#/g` 扫描译文，按捕获的数字取 `fragments[n-1]`。
- 若编号缺失（LLM 漏保留）→ 日志 `console.warn` + 该占位符位置保持原文为占位符文字（用户可见 `#3#` 作为失败信号，便于发现而不静默丢失）。
- 若出现未见过的高编号 → 同上报 warn。
- 结果构造成 `DocumentFragment` 返回，由 `applyTranslation` 插入 DOM。

### 4. 改造 `content/index.ts` 的四种样式

`applyOriginalStyle` / `applyCleanStyle`：

- 仍然 `display: none` 原元素，但 `wrapper` 不再是 `<div>`+`textContent`。
- 改为 `const wrapper = el.cloneNode(false) as HTMLElement;`（同标签同属性，避免样式丢失），然后 `wrapper.appendChild(decodeInline(translatedText, fragments))`。
- 这样段落变 `<p>` 译文、列表项变 `<li>` 译文，继承站点 CSS。

`applyBilingualStyle`：

- 在原 `<el>` 末尾插入 `<br>` + 一个 `<span data-translator-bilingual>`，`span.appendChild(decodeInline(...))`，保留链接可点击。
- 如果 `el` 是块级（P/LI/H1-6/BLOCKQUOTE），`span` 改为 `display: block; margin-top: 0.25em`，避免和原文挤一行且破坏行高。
- 通过 `window.getComputedStyle(el).display` 判定。

`applyUnderlineStyle`：

- `wrapper` 用 `<span data-translator-underline>` 包 `decodeInline(...)`，保留链接。
- `title` 仍用纯文本原文作为 hover 提示。

### 5. 与 plan-2 对接

- `translateSingleElement` / `translateBatchWithFallback`：
  - 先调用 `encodeInline(el)` 得 `placeholderText` 与 `fragments`。
  - 发送给 LLM 的 `text` 改为 `placeholderText`。
  - 拿回 `translated` 后，`applyTranslation(el, translated, fragments)` 接收占位符片段参数。
  - `ElementState.translatedText` 类型不变（仍是字符串），但新增字段 `fragments?: DocumentFragment[]`，`restoreElement` 不需要用到它（restore 只要 `originalHTML`）。
- 缓存（`lib/cache.ts`）：缓存 key 不变（文本哈希），缓存 value 仍是译文字符串（含 `#N#`）。这意味着命中缓存后，`decodeInline` 仍需 `fragments`，所以：
  - `fragments` 必须每次从当前 DOM 重新 `encodeInline` 得到（不入缓存）。
  - 缓存的译文含占位符数字——必须保证同一段在同一段 DOM 下 `encodeInline` 产生的编号稳定（由 plan-3 的 DOM 遍历顺序保证）。

### 6. LLM Prompt 适配

`src/lib/api.ts` 的翻译 prompt 增加一条硬性要求（追加到 system prompt 或 instruction 段）：

> "文本中可能包含形如 `#1#`、`#2#` 的编号占位符。译文中必须原封不动保留所有占位符，不要增删改，不要改变编号顺序，也不要翻译占位符里的数字。"

同时聚合翻译的 prompt 也必须包含该条款（plan-4 会重构聚合协议，那时一并校验）。

### 7. 代码风格

- `inline-placeholder.ts` 纯函数；无副作用；导出类型明确。
- `content/index.ts` 新增 `ElementState.fragments` 字段。
- 不新增依赖。

## 影响范围

### 新增

- `src/lib/inline-placeholder.ts`：纯函数模块。导出 `EncodedBlock` 类型、`encodeInline(el)`、`decodeInline(translated, fragments)`。
  - `INLINE_FLATTEN_TAGS = { STRONG, B, EM, I, U, SMALL, SPAN }`：展平为文字并递归子节点；带 `math` / `katex` class 的 `<span>` 特化为 KEEP。
  - KEEP 分支：将元素 `cloneNode(true)` 包进 `DocumentFragment`，记占位符 `#N#`；N 从 1 起自增。
  - `BR` → `\n`；未知元素默认走 KEEP 兜底。
  - `decodeInline` 正则 `/#(\d+)#/g` 解析；缺失编号用 `console.warn` 报告并保留原占位符文本，避免静默丢失；回填时将 `\n` 还原为 `<br>`。

### 修改

- `src/entrypoints/content/index.ts`：
  - 引入 `encodeInline` / `decodeInline`。
  - `ElementState` 新增可选字段 `fragments?: DocumentFragment[]`。
  - 新增内部工具 `cloneAsWrapper(el)`（`cloneNode(false)` + 去掉 `id`）与 `isInlineDisplay(display)`。
  - `applyOriginalStyle` / `applyCleanStyle`：不再用 `<div>` + `textContent`；改为克隆原 `el`（同 tag 同属性）再 `appendChild(decodeInline(...))`，保留段落原生样式与行内链接/inline code。
  - `applyBilingualStyle`：span 内用 `decodeInline` 结果；基于 `window.getComputedStyle(el).display` 判定块级/行内——块级容器下 span 设为 `display: block; margin-top: 0.25em`，避免与原文挤一行。
  - `applyUnderlineStyle`：wrapper 内用 `decodeInline` 结果，`title` 仍为原文纯文本。
  - `applyTranslation(el, text, fragments)` 多接收 `fragments` 参数，分发到四种样式。
  - `translateSingleElement`：先 `encodeInline(el)` 得到 `placeholderText` 与 `fragments`；发送给 background 的 `text` 改为 `placeholderText`；语言检测仍用 `rawText`；返回后 `applyTranslation(el, result.text, fragments)`。
  - `translateBatchWithFallback`：每个 el 独立 `encodeInline`，以 `PARAGRAPH_BREAK` 拼接后发送；按段 split 后逐个 `applyTranslation` 传入各自的 `fragments`；fallback 仍为逐段 `translateSingleElement`。
  - `restoreElement` 未变（依赖 `originalHTML` 恢复；与 `fragments` 解耦）。

- `src/lib/api.ts`：
  - 新增常量 `PLACEHOLDER_RULE`：在 `renderPrompt` 内对**所有请求**（单段与聚合）无条件追加占位符保留硬性要求，避免自定义 prompt 遗漏该约束。
  - 聚合分支追加说明：「placeholder numbering restarts independently in each paragraph」。

- `src/lib/schema.ts` 与 `src/lib/storage.ts`：
  - 默认 `globalPrompt` 第 4 条的占位符列表新增 `#1#, #2#`，与 `{1}` / `[[1]]` 等并列作为"不翻译"示例。

### 关键行为变化

- 含行内链接 / `<code>` / `<img>` / `<strong>` 等节点的段落：翻译后**保留** `<a>` / `<code>` / `<img>` 等语义节点的点击与渲染能力；`<strong>` / `<em>` / 普通 `<span>` 等纯强调标签会随文本一起被翻译（不再占位，视觉上文本完整）。
- `original` / `clean` 样式下 wrapper 同 tag（如 `<p>`、`<li>`），能继承站点针对该 tag 的 CSS，解决 GitHub README 译文视觉与排版脱节的问题；为避免 `document.getElementById` 命中 clone 元素，wrapper 会清除 `id` 属性。
- `bilingual` 样式下的译文 span 在块级容器中自动切块级 + `margin-top`，避免与原文挤一行造成行高错位。
- `underline` 样式下 hover tooltip 保持原文纯文本（未含占位符）。
- 缓存兼容：单段请求 `text` 为 `placeholderText`，无 inline 元素的段落其 placeholderText 与旧的 `textContent.trim()` 等价——旧缓存条目命中后经 `decodeInline` 以纯文本路径输出，无需迁移。

### TypeScript 编译 / 构建

- `bun compile` 通过。
- `bun run build`（WXT 生产构建）通过：`content-scripts/content.js` 172.74 kB，`background.js` 273.9 kB。

### 手工验证（待用户在 `bun dev` 后逐页验证）

- `https://github.com/cortexkit/opencode-magic-context`：README 段落内 `` `ctx_reduce` `` 等 inline code 在译文中保留 `<code>` 渲染；段首/段中链接 `<a>` 在译文中仍可点击；`<strong>` 粗体随文字翻译（不保留粗体格式，符合 plan）。
- `https://zh.wikipedia.org/wiki/React`：参考条目中 `<a>` 保留跳转；`<sup>` 脚注保留上标。
- `https://news.ycombinator.com/`：story title 中 `<a>` 可点击；comment 中 inline code 不被翻译。
- `https://stackoverflow.com/questions/` 任一问答页：问题/答案正文中 inline code 保留，链接可点击。
- 四种样式切换：分别验证 `original` / `clean` / `bilingual` / `underline` 下的行内节点保留与可交互性。

## 历史补丁
