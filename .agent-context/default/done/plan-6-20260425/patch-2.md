# 快捷键展示美化 + Ctrl+Hover 翻译完善

## 补丁内容

用户在使用 plan-6 产物时反馈两点：

1. 通用设置 → 显示设置 → 快捷键区域的图标"太丑"——指 `Command`/`Keyboard` 这两个 lucide 抽象图标，与后跟的符号化按键混排观感杂乱（Mac 上甚至出现 `[⌘形状图标] ⌥W` 这种"图标 + 同形符号"的别扭组合）。
2. "鼠标悬浮段落或者文本配合 Ctrl 键实现翻译"功能"没有实现"——代码层 `setupCtrlHover` 已存在，但实际体验近乎为零（无视觉反馈、依赖未初始化的 state、无节流）。

本补丁两件事一起修复。

### 修复 1：快捷键展示改用独立 kbd 按键框

`src/components/options/general-settings.tsx`：

- 移除 `Command`、`Keyboard` 两个 lucide 图标导入与渲染分支。
- `formatShortcutTokens` 返回值从 `Array<{ kind, value }>` 简化为 `string[]`：调用方不再需要区分 symbol/text，渲染层一律用同一种 `<kbd>` 容器。Mac 平台仍把 `Command/Ctrl/Alt/Shift` 等修饰符映射成 `⌘⌃⌥⇧`；其他平台保留首字母大写的英文键名。
- 渲染层每个 token 包成一个独立 `<kbd>`：
  - `min-w-[1.75rem] h-7` 固定方形按键尺寸，`rounded-md border border-border bg-background`，并加 `inset shadow` 模拟物理按键凹陷（暗色模式独立阴影），与 macOS 系统偏好设置 / GitHub `<kbd>` 风格一致。
  - Mac 单字符 token（`⌘`/`⌥` 等符号）字号提到 `text-sm` 以保证字形清晰，多字符 token（`Alt`/`Shift`）保持 `text-xs`。
  - token 之间用半透明 `+` 分隔，由 `React.Fragment` 串联避免无意义包裹元素；外层 `flex-wrap` 容纳后续可能更长的快捷键。
- 未绑定时改用一个虚线边框、斜体灰字的"`未设置`"占位胶囊，而非塞进同样的 kbd 框，语义和视觉都更清楚。

### 修复 2：Ctrl+Hover 翻译完善（视觉反馈 + 防抖 + 懒加载设置 + 失焦清理）

`src/entrypoints/content/index.ts` 中 `setupCtrlHover` 重构。

#### 问题根因

原实现仅在 `mouseover` 上同步检查 `e.ctrlKey`，命中后立即 `await translateSingleElement`。失败模式：

- 用户没有先按快捷键启用整页翻译时，`state.targetLang/nativeLanguage/style/aggregate` 都是 content script 顶部声明的默认值（`'zh-CN'` / `'original'` / 空聚合参数），翻译目标语言可能与用户母语不一致。
- `mouseover` 在子元素冒泡时反复触发，无去重/防抖；快速划过会并发发起 `DETECT_LANG`+`TRANSLATE` 请求（`data-translator-pending` 在第一次 `await` 前未设置）。
- 用户毫无视觉反馈，按住 Ctrl 在段落上悬停时段落毫无变化，无从判断"是否生效"。
- 松开 Ctrl 或切窗口后，pending 中的翻译计时器仍可能触发。

#### 实施

1. **懒加载设置**：新增模块级 `ctrlHoverSettingsLoaded` 标志与 `ensureCtrlHoverSettings()`。后者在 `state.isActive === true`（用户已通过快捷键启用整页翻译）时直接 return；否则一次性从 `getSettings()` 拉取并写入 `state.style/nativeLanguage/targetLang/aggregate`。失败保留默认值，仅记录错误。
2. **节流 + 防抖**：模块级 `hoverTarget: HTMLElement | null` 跟踪当前段落，`hoverTimer` 跟踪 200ms 计时器（`HOVER_DEBOUNCE_MS = 200`）。鼠标进入新段落时清除旧高亮与计时器，重新启动；停留同一段落不重置；计时到点再次校验 `hoverTarget === paragraph` 与 `state.elementMap`/`data-translator-pending` 后才发起翻译。
3. **视觉高亮**：模块级 `HOVER_HIGHLIGHT_ATTR = 'data-translator-hover-target'` 写到当前候选段落，由 `styles.css` 渲染 `2px` 主色 box-shadow（不用 `outline` 避免 inline 段落多行换行时只描首尾行）+ `8%` 主色背景 + `cursor: progress`，暗色模式独立色值。计时触发翻译前主动清除该属性，避免与正式译文样式叠加。
4. **生命周期清理**：
   - `mouseout` 时若 `relatedTarget` 已离开当前段落，调用 `clearHoverHighlight()`。
   - `keyup` 监听 `e.key === 'Control'` 清理高亮和计时器。
   - `window.blur` 同样清理（用户切换 tab/窗口）。
5. 集成方式不变：`main()` 中已有的 `setupCtrlHover()` 调用直接复用。

#### 行为表

| 场景 | 行为 |
| --- | --- |
| 未启用整页翻译 + Ctrl 悬停段落 | 段落高亮，停留 200ms 后按用户母语翻译并按默认样式渲染 |
| 已启用整页翻译 + Ctrl 悬停未翻译段落 | 复用 state 中已加载的设置，直接翻译 |
| 鼠标快速划过多个段落 | 仅最后停留段落的计时器存活，前面段落的高亮和计时同步清除 |
| 中途松开 Ctrl | 立即取消高亮和待触发翻译 |
| 切走 tab / 窗口失焦 | 清理高亮，避免悬空 outline |

`bun compile` 通过；无新增 i18n key。

## 影响范围

- 修改文件: `src/components/options/general-settings.tsx`
- 修改文件: `src/entrypoints/content/index.ts`
- 修改文件: `src/entrypoints/content/styles.css`
