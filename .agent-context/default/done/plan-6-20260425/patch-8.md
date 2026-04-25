# Ctrl+Hover 翻译完成后高亮永久残留

## 补丁内容

### 现象

按 Ctrl 悬停段落触发翻译，原文被译文替换后（`original` / `clean` 模式），段落上的紫色背景高亮 `[data-translator-hover-target]` **永久不消失**，需手动刷新页面才能恢复。

### 根因

`applyOriginalStyle` / `applyCleanStyle` 通过 `cloneAsWrapper(el)` → `el.cloneNode(false)` 创建译文 wrapper。`cloneNode` 会**完整复制原 `el` 的全部 attributes**——包括临时挂在原 `el` 上的 `data-translator-hover-target='true'`。随后 `el.replaceWith(wrapper)` 让原 `el` 离开 DOM、wrapper 接管 DOM 槽位，**wrapper 也带着高亮 attribute**。

`tryStartHoverFor` 翻译完成后的 `finally` 块只调用 `paragraph.removeAttribute(HOVER_HIGHLIGHT_ATTR)`，作用在已脱离 DOM 的原 `el` 上，**对仍在 DOM 中、带相同属性的 wrapper 无效**。CSS 选择器 `[data-translator-hover-target]` 命中 wrapper，紫色背景永久残留。

patch-6 引入"翻译期间保持高亮直到完成"的设计时，注释错误地预设：

> // original / clean 模式：paragraph 已离开 DOM，attribute 跟随节点离开（自然消失）

——没有考虑 `cloneNode` 会把 attribute 复制到 wrapper。

### 修复

`tryStartHoverFor` 的 `finally` 块在清掉 `paragraph` 自身属性后，**额外**通过 `state.elementMap.get(paragraph)?.cloneEl` 反查到 wrapper，主动 `wrapper?.removeAttribute(HOVER_HIGHLIGHT_ATTR)`。

- `bilingual` / `underline` 模式：`elementMap` 中的 `cloneEl` 字段未设置（`undefined`），可选链短路，行为不变。
- `original` / `clean` 模式：`cloneEl` 指向 DOM 中的 wrapper，正确清理。

为何不改在 `cloneAsWrapper` 源头就剥掉高亮 attribute：保留 wrapper 复制 attribute 的行为，能保证 `el.replaceWith(wrapper)` 那一刻视觉上高亮"无缝衔接"地保留，配合 `HOVER_MIN_VISIBLE_MS=250ms` 最小可见时长，避免翻译完成瞬间高亮闪断。

### 自检

- `bun compile` 通过。
- 没有 lint 报错。

## 影响范围

- 修改文件: `/Users/whj/codes/translator/src/entrypoints/content/index.ts`
