# 修复扩展瑕疵：快捷键 / 标题 / 图标 / i18n

> 状态: 已执行

## 目标

修复 5 个用户反馈的小瑕疵，让扩展达到可发布质量：

1. `wxt.config.ts` 中 `commands.toggle-translate.suggested_key` 同时显式声明 Windows / Mac / Linux 三个平台键位，避免依赖隐式 `default` 兜底。
2. 设置页 `通用` Tab 中的快捷键展示与 `chrome.commands.getAll()` 返回的实际生效值一致，并按当前平台渲染：Mac 显示 `Command` 键盘符号图标 + 符号化按键（⌘⌥⇧⌃），Windows/Linux 显示文本式按键（`Alt + W`）。
3. 扩展设置页浏览器 Tab 标题显示 i18n 后的真实标题（如 `翻译器设置`），而不是字面量 `__MSG_options_title__`。
4. 提供专属扩展图标（16/32/48/96/128 五个尺寸），替换 Chrome 默认拼图，主色锚定项目 `--color-primary`。
5. 消除运行时控制台 404：`GET .../_locales/zh-CN/messages.json net::ERR_FILE_NOT_FOUND`。

## 内容

### 步骤 1：修复 i18n 语言代码归一化（解决问题 5）

修改 `src/lib/i18n.ts` 的 `setUILanguage(lang)`，**严格按照下述执行顺序**重写函数体：

1. **入口第一行**先归一化为局部常量：`const normalized = lang.replace(/-/g, '_')`。
2. 之后所有逻辑（`if (normalized === loadedLang) return`、`cache[normalized]` 读写、`chrome.runtime.getURL(\`/_locales/${normalized}/messages.json\`)`、最后赋值 `loadedLang = normalized`）一律使用 `normalized`，**禁止再引用入参 `lang`**。
3. `t()` 与 `getCurrentUILanguage()` 不变（`loadedLang` 已是归一化后的值）。
4. `chrome.i18n.getMessage` 的 fallback 路径不受影响。

完成标准：在 Brave / Chrome 启动扩展后，DevTools Console 不再出现 `_locales/zh-CN/messages.json` 404；同一个 `lang` 重复传入只发起一次 fetch（命中 cache 早返）。

### 步骤 2：修复 Options 浏览器 Tab 标题（解决问题 3）

仅修复 Options，Popup 不动（Popup 是悬浮窗，无 Tab 概念，修复无可观测收益）。

- `src/entrypoints/options/index.html`：将 `<title>__MSG_options_title__</title>` 改为静态默认 `<title>翻译器设置</title>`，避免首屏闪烁出 `__MSG_...__` 字面量（manifest 占位符在 HTML 中不会被替换）。
- `src/entrypoints/options/main.tsx`：在 settings 加载完成、`setUILanguage(s.uiLanguage)` 后写入 `document.title = t('options_title')`；在 `handleUILanguageChange`（用户切换 UI 语言时）调用 `setUILanguage(lang)` 后再次写入 `document.title = t('options_title')`，与 `langVersion` 同步。

完成标准：Options Tab 标题在中文环境显示 `翻译器设置`、英文环境显示 `Translator Settings`；切换 UI 语言后 Tab 标题立即更新。

### 步骤 3：完善快捷键 manifest 平台声明（解决问题 1 上半）

修改 `wxt.config.ts` 中 `manifest.commands['toggle-translate'].suggested_key`，将三平台显式列出：

```ts
suggested_key: {
  default: 'Alt+W',
  windows: 'Alt+W',
  linux: 'Alt+W',
  mac: 'Alt+W',
}
```

**TS 类型兜底**：若 WXT/`@types/chrome` 未声明 `windows` 或 `linux` 字段导致 TS 报错，使用 `as ChromeManifestType['commands']` 或局部 `// @ts-expect-error` + 注释说明，并在本步骤的实施记录中说明所做选择。**禁止直接 `as any` 整段断言**（会丢失整个 manifest 类型保护）。

完成标准：`bun build` 后 `.output/chrome-mv3/manifest.json` 中 `commands.toggle-translate.suggested_key` 三平台键值齐备；`bun compile` 通过。

### 步骤 4：动态展示快捷键 + 平台图标（解决问题 1 下半 + 问题 2）

修改 `src/components/options/general-settings.tsx`，将 L205-211 的 `Keyboard Shortcut` 区块重构为受控展示组件。

**子步骤 4.1**：在该组件内 `useEffect(..., [])` 中调用 `chrome.commands.getAll()`，把命令名为 `toggle-translate` 的 `shortcut` 字段（可能为空字符串，表示用户取消绑定）存入本地 state `actualShortcut: string`。失败时 fallback 为 `settings.shortcutKey`（即 `Alt+W` 默认值）。

**子步骤 4.2**：通过 `navigator.platform.toLowerCase().includes('mac')` 判定平台，得到 `isMac: boolean`。**只在组件挂载时计算一次**，避免每次渲染都判断。

**子步骤 4.3**：在同文件内（不新建文件）编写纯函数 `formatShortcutTokens(raw: string, isMac: boolean): Array<{ kind: 'symbol' | 'text'; value: string }>`：

- 入参约定：Chrome `commands.getAll()` 返回的 `shortcut` 在所有平台均为英文键名 + `+` 分隔（如 `Alt+W`、`Ctrl+Shift+Y`）。
- 实现：先 `.trim()`，再按 `+` split。Mac 平台映射表 `{ Command: '⌘', MacCtrl: '⌃', Ctrl: '⌃', Alt: '⌥', Option: '⌥', Shift: '⇧' }`，命中则返回 `{ kind: 'symbol' }`；其他键（字母 / 功能键）返回 `{ kind: 'text', value: 字面量大写 }`。
- 非 Mac 平台：所有 token 一律 `{ kind: 'text', value: 字面量首字母大写 }`。
- 未识别键名：原样输出为 `text`，不抛异常。
- 空字符串入参：返回空数组。

**子步骤 4.4**：JSX 渲染（必须使用 `cn(...)` 合并类名，禁止裸字符串拼接）：

- 容器 `<code>`：使用 `cn('rounded-md bg-muted px-3 py-1.5 text-sm font-mono inline-flex items-center gap-1.5')`。
- Mac 平台：渲染 `lucide-react` 的 `Command` 图标（`<Command className="h-3.5 w-3.5" />`，呈 ⌘ 形状），后跟符号串（`symbol` 直连，`text` 之间无分隔），如 `[⌘图标] ⌥W`。
- 非 Mac 平台：渲染 `lucide-react` 的 `Keyboard` 图标，token 之间用 ` + ` 拼接，如 `[键盘图标] Alt + W`。
- 当 `actualShortcut` 为空字符串：`<code>` 内显示 `t('shortcut_unbound')`（新增 i18n key），保留右侧 `{t('shortcut_hint')}` 提示。
- 不再硬编码字面量 `Alt+W`。

**子步骤 4.5**：在 `public/_locales/zh_CN/messages.json` 与 `public/_locales/en/messages.json` 中**两个文件都需新增** `shortcut_unbound`：

```json
"shortcut_unbound": { "message": "未设置" }   // zh_CN
"shortcut_unbound": { "message": "Not bound" } // en
```

完成标准：Mac 上 UI 显示 `[⌘图标] ⌥W`；Windows / Linux 上显示 `[键盘图标] Alt + W`；用户在 `chrome://extensions/shortcuts` 修改键位后重开设置页，UI 同步显示新键位；解绑后显示 `未设置`。

### 步骤 5：生成扩展图标资源（解决问题 4）

**子步骤 5.1**：使用图像生成工具产出一张 1024×1024 的 PNG 主图标，主题为「翻译」。视觉规范：

- 底色：项目主色 `--color-primary` 即 `hsl(243 75% 59%)`（≈ `#5046E5`），渐变到 `hsl(243 70% 65%)`（≈ `#6F65EC`），方向 135° 对角线。
- 主元素：白色字形，居中，可选「译」单字 / 「A↔文」双向箭头组合 / 「文/A」上下分栏；首选「A↔文」体现"双向翻译"语义。
- 形状：方形，圆角 22%（macOS 现代图标比例）。
- 临时输出路径：`/tmp/translator-icon-source.png`，**不入仓库**。

**子步骤 5.2**：使用 macOS 自带的 `sips` 命令将主图缩放到 5 个尺寸，分别输出到 `public/icon/{16,32,48,96,128}.png`：

```bash
mkdir -p public/icon
for size in 16 32 48 96 128; do
  sips -z $size $size /tmp/translator-icon-source.png --out public/icon/$size.png
done
```

**子步骤 5.3**：在 `wxt.config.ts` 的 `manifest` 中显式声明：

```ts
icons: {
  16: 'icon/16.png',
  32: 'icon/32.png',
  48: 'icon/48.png',
  96: 'icon/96.png',
  128: 'icon/128.png',
}
```

**子步骤 5.4**：清理 `/tmp/translator-icon-source.png`（构建产物 `.output/` 不需要源文件）。

完成标准：`bun build` 后 `.output/chrome-mv3/manifest.json` 含 `icons` 字段，`.output/chrome-mv3/icon/` 含 5 个 PNG，浏览器扩展栏显示新图标，所有尺寸不糊。

### 步骤 6：自检与回归

- 运行 `bun compile` 确认 TS 类型通过（重点关注步骤 3 的 `windows`/`linux` 字段、步骤 4 新增 lucide 图标导入）。
- 运行 `bun build` 确认 `.output/chrome-mv3/manifest.json` 中 `commands.toggle-translate.suggested_key` 四字段齐备、`icons` 五字段齐备。
- 在 Brave 中加载 `.output/chrome-mv3-dev/`，依次验证：
  1. 扩展栏图标显示新图标（Mac 任务栏 / Brave 工具条均不糊）。
  2. 打开 Options，浏览器 Tab 标题显示中文 `翻译器设置`。
  3. 通用 Tab 内快捷键区显示 `[⌘图标] ⌥W`（Mac）。
  4. DevTools Console 全程无 `_locales/zh-CN/messages.json` 404。
  5. 在 `chrome://extensions/shortcuts` 改键位为 `Ctrl+Shift+Y`，重新打开设置页，UI 显示 `[⌘图标] ⌃⇧Y`。
  6. 切换 UI 语言为 English，Tab 标题变为 `Translator Settings`，快捷键描述区文字同步切换。

## 影响范围

- `src/lib/i18n.ts`：`setUILanguage` 入口归一化 `lang`，将 `-` 替换为 `_`，后续逻辑统一使用 `normalized`，消除 `_locales/zh-CN/messages.json` 404。
- `src/entrypoints/options/index.html`：`<title>` 由 `__MSG_options_title__` 改为静态 `翻译器设置`，避免首屏闪烁字面量。
- `src/entrypoints/options/main.tsx`：`loadSettings` 与 `handleUILanguageChange` 在 `setUILanguage` 后写入 `document.title = t('options_title')`，UI 语言切换时同步更新 Tab 标题。
- `wxt.config.ts`：`commands.toggle-translate.suggested_key` 显式声明 `default/windows/linux/mac` 四字段；新增 `manifest.icons`（16/32/48/96/128）。`@types/chrome` 已支持 `windows`/`linux`，无需类型断言。
- `src/components/options/general-settings.tsx`：导入 `useEffect/useMemo/useState`；新增模块级常量 `MAC_SYMBOL_MAP` 与纯函数 `formatShortcutTokens`（返回 `string[]`）；组件内通过 `chrome.commands.getAll()` 读取 `toggle-translate` 实际生效快捷键到 `actualShortcut` state，平台判定 `IS_MAC` 提到模块级常量；快捷键展示区每个 token 渲染为独立 `<kbd>` 按键框（macOS 系统偏好设置风格），token 间以半透明 `+` 分隔，未绑定时渲染虚线边框斜体占位胶囊。
- `public/_locales/zh_CN/messages.json` / `public/_locales/en/messages.json`：新增 `shortcut_unbound`（`未设置` / `Not bound`）。
- `public/icon/{16,32,48,96,128}.png`：新增 5 个尺寸扩展图标，主题为「A↔文」白色字形 + 主色对角线渐变（`#5046E5` → `#6F65EC`），22% 圆角方形，源图经 `sips -c` 居中裁剪为 1024×1024 后 `sips -z` 缩放生成；临时源图已清理。
- `src/entrypoints/content/index.ts`：`setupCtrlHover` 重构为"按住 Ctrl 悬停 → 高亮 → 停留 200ms 触发翻译"完整链路，新增 `ensureCtrlHoverSettings()` 在用户未启用整页翻译时按需懒加载 `getSettings()` 写入 `state.style/nativeLanguage/targetLang/aggregate`；模块级 `hoverTarget`/`hoverTimer` 跟踪当前候选段落与防抖计时器；监听 `mouseout`/`window.blur` 清理高亮与计时器（`keyup(Control)` 仅复位按键状态机，不再清理）。`applyOriginalStyle`/`applyCleanStyle` 改为 `el.replaceWith(wrapper)` 让译文 wrapper 直接接管原 `el` 的 DOM 槽位，原 `el` 节点离开 DOM 仅由 `state.elementMap` 持有引用作存储，配合模块级 `wrapperToOriginal: WeakMap<HTMLElement, HTMLElement>` 反查；`restoreElement` 的 original/clean 分支反向 `wrapper.replaceWith(el)` 还原。新增 `findToggleTarget`/`tryToggleRestore` 与模块级 `ctrlPressed` 标志：`keydown('Control')`（屏蔽 `ctrlPressed`/`e.repeat` auto-repeat）命中已翻译 wrapper / 已注入段落时同步恢复原文，未命中再走翻译路径，实现「再按 Ctrl 恢复」toggle。`clearHoverHighlight` 拆为只在防抖阶段（`hoverTimer != null`）生效的 `cancelHoverDebounce`，hoverTimer 回调改为 `try/finally` 保留高亮直到翻译完成、并在 `HOVER_MIN_VISIBLE_MS=250ms` 最小可见时长前用 `await new Promise(setTimeout)` 补齐，确保 Ctrl 短按即松开也能完成翻译、翻译期间松键 / mouseout 不会中断高亮；finally 同时清理 `paragraph` 自身与 `state.elementMap.get(paragraph)?.cloneEl` 反查到的 wrapper 上的 `[data-translator-hover-target]` 属性（`cloneNode(false)` 会把高亮 attribute 复制到 wrapper，仅清理原 `el` 会导致 original/clean 模式高亮永久残留）。
- `src/entrypoints/content/styles.css`：新增 `[data-translator-hover-target]` 样式，使用主色 `box-shadow` + `8%` 透明背景标记 Ctrl+Hover 候选段落（暗色模式独立色值），不用 `outline` 以避免 inline 段落多行换行时只描首尾行；将 `all: revert` 从 `.translator-ext-wrapper`/`[data-translator-clone]` 上撤掉，只保留给 `[data-translator-bilingual]`/`[data-translator-underline]`，让原标签替身的 clone 自然继承站点 CSS（保住 blockquote 左边框、`<li>` 列表标记、`<h*>` 字号等结构化样式）。删除 `[data-translator-hidden]` 规则与"隐藏原元素"段落——original/clean 改用 `replaceWith` 占位后，原 `el` 永远不再出现在 DOM 中，无需 CSS 隐藏；文件头 DOM 契约注释更新为「`replaceWith` 占位 + elementMap 存储 + `replaceWith` 还原」。
- `src/lib/block-detect.ts`：将 `BLOCKQUOTE` 从 WHITELIST 迁到 GRAYLIST，让 `<blockquote><p>…</p></blockquote>` 形态在父子去重时让出位置给内部 `<p>` 作翻译单元，避免 `inline-placeholder` 把整段 `<p>` 编码成 `#1#` 占位符导致 LLM 无文本可译；裸文本 blockquote（直接文本占比 ≥ 50%）仍按整段翻译。`hasExcludedAncestor` 内移除 `data-translator-hidden` 死分支（patch-5 已不再设置该属性）。

## 历史补丁

- patch-1: 快捷键展示组件清洁度优化
- patch-2: 快捷键展示美化 + Ctrl+Hover 翻译完善
- patch-3: Ctrl+Hover 翻译"先悬停后按键"姿势失效
- patch-4: 修复 blockquote 不翻译且样式被破坏（Reddit 等富文本场景）
- patch-5: Ctrl 切换恢复 + 译文占据原文 DOM 槽位修复样式偏差
- patch-6: Ctrl+Hover 短按可触发 + 翻译期间高亮持续 0.25s
- patch-7: 清理 block-detect 中 data-translator-hidden 死分支
- patch-8: 修复 Ctrl+Hover 翻译完成后 wrapper 上高亮永久残留
