# popup 自动方向检测与提示词重置

> 状态: 已执行

## 目标

优化 popup 与全局设置体验：

1. **去除 popup 会话历史**：用户不需要该功能，移除冗余 UI 与数据维护逻辑，让 popup 更聚焦于"输入即译"。
2. **自动方向检测**：popup 根据输入文本自动判断方向——若检测为母语则译往「默认源语言」，否则译往母语。这样用户无需手动切换目标语言，覆盖"看外文 → 看懂"和"输入中文 → 译给老外"两种典型场景。
3. **全局提示词一键还原**：通用翻译提示词支持随时回退到内置默认值，避免用户手改后无法找回原文。

## 内容

### 1. 数据模型新增 `defaultSourceLanguage`

- `src/types/index.ts`：在 `GlobalSettings` 中新增 `defaultSourceLanguage: LangCode`，紧邻 `nativeLanguage` 字段。
- `src/lib/schema.ts`：在 `globalSettingsSchema` 中新增 `defaultSourceLanguage: z.string().min(2).max(10).default('en')`。
- `src/lib/storage.ts`：`DEFAULT_SETTINGS` 增加 `defaultSourceLanguage: 'en'`。
- 字段语义：当 popup 检测到输入即母语时，将其作为翻译目标；不影响现有内容脚本翻译流程。

### 2. 移除 popup 历史

- 删除 `src/components/popup/history-list.tsx` 文件。
- 修改 `src/entrypoints/popup/main.tsx`：
  - 删除 `PopupHistoryList` import、`HistoryItem` 接口、`history` state、`setHistory` 调用、`handleHistorySelect`。
  - 删除 JSX 中 `<PopupHistoryList .../>` 渲染块。
  - 删除 `handleTranslate` 中构造 `newItem` 与写入 history 的代码段（保留 `provider`/`model` 的解析仅在需要时保留；本次连同删除）。
- 删除 i18n 键 `popup_session_history`、`popup_clear`：编辑 `public/_locales/en/messages.json` 与 `public/_locales/zh_CN/messages.json` 各移除对应两个条目（保持 JSON 合法）。

### 3. popup 自动方向检测

- 在 `src/entrypoints/popup/main.tsx` 引入 `detectLanguage` 与 `shouldSkipTranslation`（来自 `@/lib/lang-detect`）。
- 新增辅助 `resolveTargetLang(text, settings)`：调用 `detectLanguage(text)`，若 `shouldSkipTranslation(detected, nativeLanguage)` 为真返回 `defaultSourceLanguage`，否则返回 `nativeLanguage`；当检测返回 `null`（如文本过短）时回退到 `nativeLanguage`，保持现有默认行为。
- `handleTranslate` 改为：先 `await resolveTargetLang(...)` 拿到 `targetLang` 再调用 `sendBgMessage`。
- UI 提示行（"Translate to: zh-CN"）改造：
  - 维护新的 state `targetLangPreview: LangCode`，初始值为 `nativeLanguage`。
  - 新增 `useEffect` 监听 `inputText`，做 200ms 防抖后调用 `resolveTargetLang` 更新 `targetLangPreview`；空文本立即重置为 `nativeLanguage`。
  - 提示行显示 `targetLangPreview`，并新增辅助说明文案 `popup_auto_detect_hint`（如"自动识别输入语言"）作为副标。
- i18n 增加键：
  - `popup_auto_detect_hint`：zh_CN="自动识别输入语言"，en="Auto-detect input language"。

### 4. 全局提示词一键还原

- `src/components/options/general-settings.tsx`：
  - 顶部 import 增加 `RotateCcw`（lucide-react）与 `DEFAULT_GLOBAL_PROMPT`（`@/lib/prompts`）。
  - 在「Global Prompt」卡片内 textarea 上方/标题行右侧追加一个 `Button variant="ghost" size="sm"`，文案为 `t('btn_reset_default')`，点击执行 `onSave({ ...settings, globalPrompt: DEFAULT_GLOBAL_PROMPT })`。
  - 当 `settings.globalPrompt === DEFAULT_GLOBAL_PROMPT` 时按钮禁用（`disabled` 属性），避免无意义点击。
- i18n 增加键：
  - `btn_reset_default`：zh_CN="还原默认"，en="Restore default"。

### 5. 设置页新增"默认源语言"

- `src/components/options/language-settings.tsx`：
  - 把现有"母语"两栏布局扩展：将外层 `grid-cols-2` 拆为母语/源语言两个独立 Select，并把 UI 语言独立为上方一行（或保持两行 grid）。具体结构：将顶部 grid 改为两行——第一行 UI 语言独占；第二行母语 + 默认源语言并列。
  - 新增 Select 复用 `LANGUAGE_OPTIONS`，绑定 `settings.defaultSourceLanguage`，`onChange` 写回。
- i18n 增加键：
  - `label_default_source_language`：zh_CN="默认源语言"，en="Default source language"。
  - `hint_default_source_language`：zh_CN="当输入语言为母语时，翻译为该语言"，en="When the input language is your native language, translate into this."。

### 6. 自检与回归

- `bun compile` 通过 TypeScript 严格检查（特别注意未使用变量）。
- 手动验证：
  - popup 不再渲染历史区域，无任何残留 import。
  - 输入"hello world how are you" → hint 显示 `zh-CN`。
  - 输入"今天天气真的好啊看起来不错" → hint 显示 `en`（默认值）。
  - 设置页"通用翻译提示词"卡片有"还原默认"按钮，已是默认时禁用。
  - 设置页语言区可选择默认源语言，刷新后保留。

## 影响范围

- `src/types/index.ts`：`GlobalSettings` 新增 `defaultSourceLanguage` 字段；`LangDetectProvider.type` 扩展 `'google_free'`。
- `src/lib/schema.ts`：`globalSettingsSchema` 新增 `defaultSourceLanguage`；`langDetectProviderSchema.type` 同步扩展。
- `src/lib/storage.ts`：`DEFAULT_SETTINGS` 新增 `defaultSourceLanguage: 'en'`。
- `src/lib/lang-detect.ts`：新增 `detectByCharset` CJK 兜底与 `detectWithGoogleFree` Google 公共端点检测；接入 `detectLanguage` 主流程；新增 `detectLanguageLocal`（仅本地）；调整 kana 阈值 0.1→0.25 并补注释。
- `src/lib/languages.ts`：新增，集中维护共享 `LANGUAGE_OPTIONS`。
- `src/components/popup/history-list.tsx`：删除。
- `src/entrypoints/popup/main.tsx`：移除历史相关 state/JSX；新增 `resolveTargetLang` 与防抖 `useEffect`；hint 行新增手动目标语言 Select（默认 auto，本次会话生效）；预览路径改用 `detectLanguageLocal` 避免输入泄露。
- `src/components/options/general-settings.tsx`：Global Prompt 卡片新增"还原默认"按钮（默认值时禁用）。
- `src/components/options/language-settings.tsx`：顶部布局拆为 UI 语言独占一行 + 母语/默认源语言并列；新增默认源语言 Select；语言检测区新增"添加 Google（免 key）"按钮与 google_free 类型卡片渲染；改用共享 `LANGUAGE_OPTIONS`。
- `public/_locales/en/messages.json`：移除 `popup_session_history`、`popup_clear`；新增 `popup_auto_detect_hint`、`popup_target_auto`、`popup_manual_override_hint`、`label_default_source_language`、`hint_default_source_language`、`btn_reset_default`、`btn_add_google_free_detector`、`preset_google_free_name`、`hint_google_free_detector`（含隐私告知）。
- `public/_locales/zh_CN/messages.json`：同上同步。

## 历史补丁

- patch-1: 手动目标语言覆盖 / Google 公共检测 / CJK 字符集兜底
- patch-2: 隐私防护 / 阈值收紧 / 文案告知
