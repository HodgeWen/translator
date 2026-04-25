# 段落识别引擎重写

> 状态: 已执行

## 目标

当前 `src/entrypoints/content/index.ts` 的 `getTranslatableElements()` 用"选 `p, li, h1…h6, div, blockquote, article, section` 再过滤"的反模式，导致 GitHub README 等复杂页面出现三类硬伤：

1. **父子元素双重命中**：`.markdown-body` 的 `<article>` / `<section>` / 嵌套 `<div>` 与其内部的 `<p>` / `<li>` 同时被选中并翻译，产生重复译文与 DOM 结构破坏。
2. **含 inline code 的段落被整段跳过**：`el.querySelector('code, pre, samp, kbd, var')` 让技术文档中几乎每一段（含 `` `foo` `` 的普通段落）都被过滤，README 几乎没有可翻译段落。
3. **兜底规则过激**：`el.children.length > 20`、`fontFamily includes 'monospace'`、`closest('nav, header, footer, aside, ...')` 等硬规则在 SPA 站点下会漏杀或误伤。

本计划只重写"谁应该被翻译"的判定逻辑，为后续占位符（plan-3）/批量协议（plan-4）/样式隔离（plan-5）打好地基。

## 内容

### 1. 在 `src/lib/` 新增 `block-detect.ts`

提供纯函数 API，完全无副作用，便于单元测试与复用：

```
export interface BlockCandidate {
  el: HTMLElement;
  text: string;          // textContent 去首尾空白
  hasInlineCode: boolean;
  depth: number;         // DOM 深度，用于父子去重
}

export function collectBlocks(root: ParentNode): BlockCandidate[];
export function isTranslatableBlock(el: HTMLElement): boolean;
```

判定规则（按 kiss-translator `getDefaultSelector` + `BLOCK_ELEMS` 思路）：

- **候选白名单（必走）**：`P, LI, H1-H6, BLOCKQUOTE, DT, DD, FIGCAPTION, SUMMARY, CAPTION, TD, TH`。这些一定是段落或段落级单元。
- **候选灰名单（条件走）**：`DIV, SECTION, ARTICLE, ASIDE, MAIN`——**仅当该元素的直接文本节点长度占其 `textContent` 的 ≥ 50% 时视为段落**（即它自己直接包文字，不是纯容器）。该判定是避免父子同时命中的关键。
- **硬排除（直接否）**：
  - 标签名属于 `SCRIPT, STYLE, NOSCRIPT, IFRAME, TEXTAREA, INPUT, BUTTON, SELECT, SVG, CANVAS, VIDEO, AUDIO, PRE, CODE`（只排 `PRE/CODE` 本体，不排"包含 inline code 的段落"）。
  - `isContentEditable`、`[contenteditable="true"]` 祖先。
  - `translate="no"` 或 `.notranslate` 本体或祖先。
  - `role="code"` / `role="math"` 本体或祖先。
  - `aria-hidden="true"` 祖先。
  - 祖先含 `data-translator-processed` 或 `data-translator-clone`（自身迭代产生的节点）。
- **软排除**：
  - 文本长度 `< 5`。
  - 目标 `offsetParent === null`（display:none 或脱离文档）。
  - `getBoundingClientRect()` 宽高都为 0。
  - **取消** `fontFamily includes 'monospace'` 规则（大量现代站点的正文正好是等宽回落字体）。
  - **取消** `el.children.length > 20` 规则（换成"直接文本占比 ≥ 50%"后不再需要）。
  - **取消** 整个段落含 `<code>/<samp>/<kbd>/<var>` 就跳过的规则；inline code 留给 plan-3 占位符处理。

### 2. 父子去重算法

`collectBlocks()` 的返回流程：

1. 调用 `root.querySelectorAll(allCandidateTags)` 得到所有候选。
2. 对每个候选跑 `isTranslatableBlock`。
3. 通过过滤后，将结果收集成集合 `S`。
4. 对 `S` 做 **"最近可翻译祖先去重"**：若 `el.parentElement` 向上直到 `root` 之间存在已在 `S` 的元素，则跳过 `el`（保留最外层），反之保留（典型场景：`<article><p>…</p><p>…</p></article>`，若 `<article>` 不满足灰名单"直接文本占比 ≥ 50%"则它不会入选，自然保留 `<p>`；若 `<article>` 本身主要是直接文字则它入选，内部 `<p>` 被跳过）。
5. 按 DOM 出现顺序返回。

实现使用 `Node.compareDocumentPosition` 或 `contains()` 线性扫描即可，数据量都是 O(候选数)。

### 3. 改造 `content/index.ts` 调用点

- `getTranslatableElements()` 全部替换为调用 `collectBlocks(document)`，返回 `BlockCandidate[]`。
- `startTranslation()` 遍历 `BlockCandidate` 而非裸 `HTMLElement`。
- `setupMutationObserver()` 中对新增节点调用 `collectBlocks(node)`。
- `setupCtrlHover()` 中用 `isTranslatableBlock(target.closest(BLOCK_SELECTOR))` 判定，不再写死选择器。

### 4. 单元验证（非自动化测试，人工可复现）

本计划不引入测试框架，但要求 implement 阶段在 `plan.md` 的 `## 影响范围` 下记录以下手工验证 checklist 的通过情况（对五个典型页面逐条验证）：

- `https://github.com/cortexkit/opencode-magic-context`：README 的每个段落都被识别且仅一次；含 `` `ctx_reduce` `` 的段落不再被跳过；`<article>` 与 `<p>` 不重复命中。
- `https://zh.wikipedia.org/wiki/React`：正文 `<p>` 识别，`<ul>` 下 `<li>` 识别，信息框/导航不识别。
- `https://news.ycombinator.com/`：每条 story 的 title 与 comment 正确识别。
- `https://stackoverflow.com/questions/` 任一问题页：问题体、每个答案体被识别，代码块不被识别，comment 被识别。
- `https://x.com/`（登录态任选 feed）：tweet 文本被识别，按钮/菜单不被识别（SPA 路由切换后仍能工作——这条也验证了 plan-2 不破坏 SPA 逻辑）。

### 5. 代码风格约束

- 按 `AGENTS.md`：`noUnusedLocals`/`noUnusedParameters` 严格，新增文件使用 `@/lib/block-detect` 导出风格。
- 不新增依赖。
- 保留现有 `data-translator-*` 属性契约，便于 plan-3/4/5 复用。

## 影响范围

### 新增

- `src/lib/block-detect.ts`：段落识别引擎纯函数模块。导出 `BlockCandidate` 类型、`collectBlocks(root)`、`isTranslatableBlock(el)`、`BLOCK_SELECTOR` 常量。实现白名单（`P, LI, H1-H6, BLOCKQUOTE, DT, DD, FIGCAPTION, SUMMARY, CAPTION, TD, TH`）+ 灰名单（`DIV, SECTION, ARTICLE, ASIDE, MAIN`，要求直接文本占比 ≥ 50%）+ 硬排除（`SCRIPT/STYLE/NOSCRIPT/IFRAME/TEXTAREA/INPUT/BUTTON/SELECT/SVG/CANVAS/VIDEO/AUDIO/PRE/CODE` 本体）+ 祖先排除（contenteditable/translate="no"/.notranslate/aria-hidden/role="code"|"math"/已处理节点）+ 父子去重（保留最外层可翻译块）。

### 修改

- `src/entrypoints/content/index.ts`：
  - 引入 `collectBlocks` / `isTranslatableBlock` / `BLOCK_SELECTOR`。
  - `getTranslatableElements()` 由"选 tag 再过滤"的 28 行硬编码改为 3 行委托给 `collectBlocks`，返回类型调整为接受 `ParentNode`。
  - 新增 `findNearestTranslatableBlock()` 替代 `setupCtrlHover` 里写死的 `closest('p, li, h1, …')`，改为沿 DOM 向上找第一个通过新判定的块。
  - 调用点保持不变：`startTranslation` / `setupMutationObserver` 仍走 `getTranslatableElements`，因此这两处自动获得新引擎。

### 关键行为变化（与旧实现对比）

- 含 inline code 的段落（如 README 里 `` 调用 `ctx_reduce` 会… ``）**不再被整段跳过**。
- 父子元素（`<article>` + 内部 `<p>`）**不再同时命中**；保留最外层可翻译块。
- 取消了 `fontFamily.includes('monospace')` 和 `el.children.length > 20` 两条过激兜底规则。
- 原先 `closest('nav, header, footer, aside, [role="navigation"]…')` 的"按容器位置排除"不再硬编码——这类元素里的 `<p>`/`<li>` 仍可能被识别，但会因"灰名单父容器直接文本占比低"而不会重复命中父容器。若实测发现误伤（如导航文字被翻译），后续用 patch 补充精细化规则。

### TypeScript 编译

`bun compile` 通过，无 lint 错误。

### 手工验证（待用户在 `bun dev` 后逐页验证）

plan 列出的 5 个页面验证 checklist 移交给用户：
- `https://github.com/cortexkit/opencode-magic-context`
- `https://zh.wikipedia.org/wiki/React`
- `https://news.ycombinator.com/`
- `https://stackoverflow.com/questions/` 任一问题页
- `https://x.com/`

**注意**：本计划单独落地时 GitHub README 的视觉效果可能仍然不佳——因为 `original`/`clean` 样式下行内结构仍会被 `textContent` 吃掉（链接/code 变纯文本）；真正的可读性改善需要 plan-3（行内占位符）+ plan-5（CSS 隔离）一起上线。plan-2 只解决了"谁该被翻译"的识别层。

## 历史补丁
