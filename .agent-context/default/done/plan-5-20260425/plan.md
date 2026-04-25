# 译文 CSS 隔离与显示样式升级

> 状态: 已执行

## 目标

当前 `src/entrypoints/content/styles.css` 只有一条 `[data-translator-hidden] { display: none !important; }`；译文样式全靠 JS 里的 inline style。三个结果：

1. **译文被站点 CSS 覆盖**：GitHub 的 `.markdown-body * { color: … }` 会覆盖译文颜色；Twitter 的 `[data-testid] span { font-weight: 400 }` 会抹掉 `bilingual` 的区分样式。
2. **inline style 维护困难**：分散在四个 `applyXxxStyle` 函数里，改一个配色要改四处。
3. **`bilingual` 样式对块级元素破碎**：当前用 `<br><span style="display:inline">`，在 `<p>` 里可以，在 `<blockquote>` / `<h1>` / `<li>` 内行高与对齐都错。

本计划统一译文样式到 CSS 文件，用高特异性选择器 + `all: revert` 基线，避免被站点样式污染；同时升级 `bilingual` / `underline` 在块级场景的显示。依赖 plan-3 完成（占位符产生的 DOM 片段需要样式 hook 类）。

## 内容

### 1. 重写 `src/entrypoints/content/styles.css`

采用"类名前缀 + `:where()` 降特异性 + 关键属性用高特异性覆盖"的双层策略：

```css
/* ─── 隐藏原元素 ─────────────────────────── */
[data-translator-hidden] {
  display: none !important;
}

/* ─── 通用容器基线（所有译文节点） ─────────── */
.translator-ext-wrapper,
[data-translator-clone],
[data-translator-bilingual],
[data-translator-underline] {
  all: revert;                     /* 清洗继承自站点的奇葩样式 */
  color: inherit;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

/* ─── bilingual: 块级附加段 ─────────────── */
[data-translator-bilingual][data-display="block"] {
  display: block !important;
  margin-top: 0.35em;
  opacity: 0.78;
  font-style: italic;
  line-height: 1.5;
}
[data-translator-bilingual][data-display="inline"] {
  display: inline !important;
  margin-left: 0.4em;
  opacity: 0.75;
  font-style: italic;
}

/* ─── underline: 虚下划线 + hover 强化 ──── */
[data-translator-underline] {
  text-decoration: underline dashed !important;
  text-decoration-color: rgb(100 116 139 / 0.6) !important;
  text-underline-offset: 0.2em;
  cursor: help;
}
[data-translator-underline]:hover {
  text-decoration-color: rgb(59 130 246 / 0.9) !important;
}

/* ─── 内部链接保持可点击 ─────────────────── */
[data-translator-clone] a,
[data-translator-bilingual] a,
[data-translator-underline] a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: currentColor;
  text-decoration-style: dotted;
}

/* ─── 暗色模式支持（站点 .dark 或 prefers-color-scheme） ─── */
@media (prefers-color-scheme: dark) {
  [data-translator-underline] {
    text-decoration-color: rgb(148 163 184 / 0.6) !important;
  }
}
```

说明：

- 所有 JS 里的 inline style（`style.opacity`、`style.textDecoration` 等）全部删除，迁移到 CSS。
- `all: revert` 把译文节点从站点继承的怪异样式里抽离，再按需 `inherit` 回颜色和字号等"必须跟着站点走"的属性。
- 使用 `!important` 是有意识的选择：内容脚本注入的 CSS 权重必然要压过站点——kiss-translator / 沉浸式翻译 / deepl extension 无一例外。

### 2. 改造 `content/index.ts` 的样式应用函数

- 删除所有 `el.style.xxx = ...` 与 `wrapper.style.xxx = ...` 赋值。
- 改用 `wrapper.dataset.display = (isBlock ? 'block' : 'inline')` 控制 bilingual 行为。
- `isBlock` 判定：`['P','LI','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','DIV','ARTICLE','SECTION','FIGCAPTION','DT','DD','CAPTION','TD','TH'].includes(el.tagName)`。
- 译文 wrapper 一律加类 `translator-ext-wrapper` 便于站点脚本能识别（方便用户 userCSS 二次定制）。

### 3. 四种样式的最终 DOM 契约

固化成文档写在 `content/styles.css` 顶部注释中，便于未来贡献者理解：

```
original  → 原 el[data-translator-hidden] + el.after(clone[data-translator-clone])
            clone 是原 el 同标签的克隆，内部含译文 DocumentFragment
clean     → 同 original（语义上差别留给 UI 层，DOM 契约一致）
bilingual → 原 el 保留，末尾追加 <br data-translator-br> + <span/<div>[data-translator-bilingual][data-display=block|inline]>
underline → 原 el 清空，追加 <span[data-translator-underline] title="原文文本">
```

### 4. Shadow DOM 选项（不在本计划范围，但写下结论）

考虑过用 Shadow DOM 彻底隔离，但放弃，原因：

- 站点 CSS 对译文的"继承"（颜色、字号）是我们想要的，Shadow DOM 会阻断 `inherit`。
- Shadow DOM 对 `::selection` / 复制粘贴 / 扩展 userscript 交互都有负面影响。
- 现有 `all: revert` + `!important` 组合对 99% 站点足够。

如果将来遇到某个特定站点仍然污染，考虑"加 `:not(.translator-ext-wrapper)` 给站点定位"或用户自定义 CSS override，而非上 Shadow DOM。

### 5. 验收 checklist

在 implement 阶段需对以下页面逐一验证（在 `## 影响范围` 记录结果）：

- **GitHub README**（`opencode-magic-context`）：四种样式下译文颜色与原文一致，inline 链接可点击，`bilingual` 下译文与原文清晰分层。
- **MDN 英文文档**（任选 `Array.prototype.map`）：代码块不被翻译（plan-2 保证），段内 inline code 占位符原样渲染（plan-3 保证），`bilingual` 样式下段落行高正常。
- **X/Twitter**：tweet 文本 `bilingual` 下不破坏卡片布局。
- **暗色模式网站**（如 `https://news.ycombinator.com/`、GitHub 暗色）：译文对比度足够，虚下划线颜色自适应。

### 6. 不新增依赖

- 不引入 CSS-in-JS。
- 不引入 `!important` 以外的 specificity hack。
- 不改 Tailwind 配置。

## 影响范围

### 代码变更

- `src/entrypoints/content/styles.css`
  - 由 5 行（仅 `[data-translator-hidden]`）扩展到 ~75 行。
  - 新增 4 个译文节点的基线样式块（`all: revert` + `inherit` 关键属性）。
  - 新增 `[data-translator-bilingual][data-display="block|inline"]` 双向选择器。
  - 新增 `[data-translator-underline]` 默认 + hover 样式。
  - 新增内部链接 inherit 样式与 `prefers-color-scheme: dark` 媒体查询。
  - 顶部添加 4 种样式的 DOM 契约注释。

- `src/entrypoints/content/index.ts`
  - 删除 `isInlineDisplay()`，新增 `BLOCK_TAGS` 集合与 `isBlockElement()` 按 tagName 判定。
  - `applyOriginalStyle()`：删除 `el.style.display = 'none'`，wrapper 增加 `translator-ext-wrapper` class。
  - `applyCleanStyle()`：同上。
  - `applyBilingualStyle()`：删除 `span.style.opacity / fontStyle / display / marginTop` 全部 inline style；改为通过 `dataset.display = 'block' | 'inline'` 控制。
  - `applyUnderlineStyle()`：删除 `wrapper.style.textDecoration / textDecorationColor / cursor` 全部 inline style；新增 `translator-ext-wrapper` class。
  - `restoreElement()` 的 `original / clean` 分支：删除 `el.style.display = ''`（不再需要）。

### 验收（待用户在浏览器侧验证）

按 plan `### 5. 验收 checklist` 在以下页面分别切换 4 种样式人工核对：

- GitHub README（`opencode-magic-context`）
- MDN 英文文档（如 `Array.prototype.map`）
- X / Twitter timeline
- 暗色模式：HackerNews / GitHub dark

注：Vitest / 自动化测试无法覆盖站点 CSS 污染场景，本计划不附自动化测试。

## 历史补丁
