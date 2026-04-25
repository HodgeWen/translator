# 提供商配置精简、采样参数滑块化与导出加密

> 状态: 已执行

## 目标

针对 `ProviderConfig` 与设置导入导出体验的三个痛点做出修复：

1. `temperature` 等常用采样参数当前埋在「额外 Body」JSON 编辑器里，调参手感差、易写出非法 JSON。需要将常用参数（`temperature` / `top_p` / `max_tokens`）提取为独立的滑块/数字输入控件，并对老用户的 `body.*` 字段做一次性平滑迁移以避免行为回归。
2. 提供商配置中默认的 `headers['Content-Type']` 字段是冗余的——`api.ts` 已经在请求层硬编码注入相同值，留在 UI 反而会让用户误以为可以通过它切换流式。需要从 UI 默认值移除并由请求层统一注入；同时正面解决"流式响应"诉求：新增 provider 级 `stream` 开关，并在 `api.ts` 内实现 SSE 解析，复用现有模型降级链路。
3. 当前 `exportSettings()` 直接输出明文 JSON，包含 `apiKey` 等敏感信息。需要在导出/导入两端加入对称的、可选的「密钥加密」能力：用户可不填（与现状等同），但当 providers 中存在非空 apiKey 时强提示建议设置密钥；并在 UI 中明确告知「密钥丢失即不可恢复」。

## 内容

### 1. 类型与 schema 调整 + 兼容迁移

文件：`src/types/index.ts`、`src/lib/schema.ts`、`src/lib/storage.ts`

- `ProviderConfig` 新增四个可选字段：
  - `temperature?: number`，范围 [0, 2]，UI 默认 0.3。
  - `topP?: number`，范围 (0, 1]，可选，留空表示不下发。
  - `maxTokens?: number`，正整数，可选。
  - `stream?: boolean`，默认 `false`。
- `body: Record<string, unknown>` 字段保留，但在代码注释与 UI hint 中明确语义：作为「额外 Body 覆盖项」，与上述独立字段同名时以**独立字段**为准（独立字段在装配时后置覆盖 `body`）。
- `globalSettingsSchema` 内 `providerConfigSchema` 同步增加：
  - `temperature: z.number().min(0).max(2).optional()`
  - `topP: z.number().gt(0).max(1).optional()`
  - `maxTokens: z.number().int().positive().optional()`
  - `stream: z.boolean().optional().default(false)`
- 在 `storage.ts` 新增**一次性 normalization**（在 `validateSettings` 通过后立刻执行，无独立标志位，幂等）：遍历 `providers`，对每个 provider 执行：
  1. 若 `temperature === undefined` 且 `body.temperature` 是 number，则 `temperature = body.temperature` 并 `delete body.temperature`。
  2. 同理处理 `top_p` → `topP`、`max_tokens` → `maxTokens`、`stream` → `stream`。
  3. 同名键已存在于独立字段时不再读取 `body`，并删除 `body` 中冗余键，避免下次 saveSettings 重复存。
- 兼容性：所有新字段 `.optional()`；旧用户的存量 settings 经 `validateSettings()` + normalization 后，原本 `body.temperature = 0.7` 的行为完全保留——不会被新默认 0.3 静默覆盖。

完成标准：
- `bun compile` 通过。
- 旧版 settings JSON（`body: { temperature: 0.7 }`）通过 `globalSettingsSchema.parse` + normalization 后：`provider.temperature === 0.7` 且 `provider.body.temperature === undefined`。
- 重复加载（已 normalize 过的数据）行为幂等，不再次改动。

### 2. 请求层重构（流式 + 字段优先级）

文件：`src/lib/api.ts`

- `buildBody(model, text, ..., extraBody, provider)`：装配顺序明确：
  1. 基础字段：`{ model, messages }`
  2. spread `extraBody`（用户额外 body 覆盖项，如 OpenAI 之外的扩展）
  3. 仅当 provider 设置了对应字段时合入：`temperature`、`top_p`（来自 `provider.topP`）、`max_tokens`（来自 `provider.maxTokens`）、`stream`
  4. 移除当前硬编码 `temperature: 0.3`，改为 `provider.temperature ?? 0.3` 始终下发（保持与现有默认行为兼容）。
- `buildHeaders(provider)`：保持自动注入 `Content-Type: application/json`；当 `provider.stream === true` 时 `Accept` 改为 `text/event-stream`，否则保持 `application/json`。用户在 `provider.headers` 自定义的同名键仍优先（后置 spread）。
- 新增内部函数 `consumeOpenAIStream(response: Response, signal: AbortSignal): Promise<{ text: string; detectedLang?: string }>`：
  - 用 `response.body!.getReader()` + `TextDecoder('utf-8')` 按 chunk 读取，调用 `decoder.decode(value, { stream: true })`。
  - 维护一个 string `buffer`：每 chunk 拼接后，用 `lastIndexOf('\n\n')` 找到"已完整事件"边界，截出 `events = buffer.slice(0, idx)`、`buffer = buffer.slice(idx + 2)`。
  - `events.split('\n\n')` 得到每条事件；事件内按 `\n` 分行；丢弃空行与不以 `data:` 开头的行；`data: [DONE]` 即结束读取。
  - 其余 `data:` 行做 `JSON.parse` 容错（解析失败的 chunk 跳过而非 throw）。
  - 累加 `choices[0]?.delta?.content`；同时若 chunk 顶层出现 `detected_language`/`source_language`，记录为 `detectedLang`。
  - 完成后将累积文本 `trim()`；空文本同样抛 `Empty translation response`。
  - 读取过程中遵守外部 `signal`：若 abort 则 `reader.cancel()` 后重新 throw。
  - **缓存写入**：本函数仅返回累积结果；写 cache 由调用方 `translate()` 在最终成功后**只调用一次** `setCachedTranslation`，**禁止**在 chunk loop 内写 cache。
- `callProvider`：在 `fetch` 后判断 `provider.stream`：
  - 流式分支：调用 `consumeOpenAIStream`，复用同一 `controller.signal` 与 `timeoutId`。
  - 非流式分支：维持现有 `response.json()` + `extractTranslatedText`。
  - 错误抛出形态保持不变，确保 `translate()` 中的降级循环可继续工作。
- **timeout 语义决策（保持总超时）**：流式分支**不**修改 timeout 行为，沿用既有 `requestTimeout`（默认 30000ms）作为"端到端"总超时；超时即 abort 整个流。这一选择属于 YAGNI 决策，需要在两处明确告知用户：
  - i18n key `hint_stream` 文案中追加："长文本可能触发请求超时，可在通用设置中调高请求超时时间。"
  - `api.ts` 的 `consumeOpenAIStream` 函数顶部加一行注释，说明此约束以阻止后续 contributor 误改。

完成标准：
- 关闭流式时与现状行为一致（diff 仅扩展不破坏）。
- 开启流式后请求体含 `stream: true`、`Accept: text/event-stream`，能正确累积跨 chunk 的 SSE 文本并写入 cache（cache 写入恰好 1 次）。
- timeout 在两种模式下都能 abort；流式中途 abort 不污染 cache。

### 3. ProviderSettings UI 改造

文件：`src/components/options/provider-settings.tsx`、`src/lib/storage.ts`

- `DEFAULT_SETTINGS.providers[0]`（`storage.ts`）：
  - `headers` 中移除 `'Content-Type': 'application/json'` 这一项，保持空对象 `{}`。
  - `body` 中移除 `temperature: 0.3`（迁移到独立字段）。
  - 新增独立字段 `temperature: 0.3`、`stream: false`。
- `handleAddProvider`（`provider-settings.tsx`）默认值同步：
  - `headers: {}`、`body: {}`、`temperature: 0.3`、`stream: false`。
- 编辑面板新增「采样参数」区块，位于「额外 Body」之前：
  - `temperature`：滑块（min=0, max=2, step=0.05）+ 右侧只读数值徽标（保留两位小数）；标签使用 i18n key `label_temperature`。
  - `top_p`：滑块（min=0, max=1, step=0.05）+ 数值徽标 + 右侧「启用」开关；开关关闭时下发 `undefined`，开启时下发滑块当前值（首次启用默认 1.0）。
  - `max_tokens`：数字输入（min=1，可留空）；空字符串映射到 `undefined`。
- 编辑面板新增「流式响应」switch，位于「采样参数」之后；附 i18n hint `hint_stream`：开启后请求体注入 `stream: true` 并按 SSE 解析；同时提示长文本可能触发超时（见步骤 2 决策）。
- 「额外 Body」CodeEditor 上方追加 inline 说明（i18n `hint_extra_body_override`）：与上方独立字段同名时以独立字段为准。
- KeyValueList（headers）label 下追加固定提示行（i18n `hint_content_type_auto`）：`Content-Type` 由请求层自动注入，无需手动设置。
- 列表卡片（非编辑态）右上角，对开启了流式的 provider 增加 `Stream` 徽标（参考现有 `Custom Prompt` 徽标样式）。

完成标准：
- UI 上 temperature 用滑块拖动后保存到 `provider.temperature`；旧 provider（无新字段）打开编辑面板时控件显示合理默认。
- headers 列表里默认看不到 `Content-Type`。
- 列表卡片对启用 stream 的 provider 显示 `Stream` 徽标。

### 4. 加密导出 / 解密导入

新文件：`src/lib/crypto.ts`
修改：`src/lib/storage.ts`、`src/components/options/general-settings.tsx`

- `crypto.ts` 提供两个纯函数（基于 WebCrypto）：
  - `encryptJSON(plaintext: string, passphrase: string): Promise<string>`
  - `decryptJSON(ciphertext: string, passphrase: string): Promise<string>`
  - 算法：PBKDF2-SHA256（200_000 轮）派生 256-bit AES-GCM key；随机 16-byte salt + 12-byte IV。
  - 加密产物外层为 JSON 字符串，结构固定：
    ```
    {
      "format": "translator-encrypted-v1",
      "kdf": "PBKDF2-SHA256",
      "iterations": 200000,
      "salt": "<base64>",
      "iv": "<base64>",
      "ciphertext": "<base64>"
    }
    ```
  - 解密时校验 `format` 与 `kdf` 字段，不匹配抛 `Error('UNSUPPORTED_ENCRYPTED_FORMAT')`；解密失败（GCM 校验失败）抛 `Error('DECRYPT_FAILED')`。
  - **不**写回 `chrome.storage.sync`，仅用于导出文件，不冲击 sync 项配额。
- `storage.ts` 改造：
  - `exportSettings(passphrase?: string): Promise<string>`：当 `passphrase` 为非空字符串时，对原导出 JSON（含 `version/exportedAt/settings`）整体调用 `encryptJSON` 并返回密文 JSON 字符串；否则维持现有明文输出。
  - `importSettings(text: string, passphrase?: string): Promise<void>`：先 `JSON.parse`；若顶层对象的 `format === 'translator-encrypted-v1'`，则要求 `passphrase` 非空（否则抛 `Error('PASSPHRASE_REQUIRED')`），调用 `decryptJSON` 后再 `JSON.parse` 内层并按现有 `globalSettingsSchema.parse(parsed.settings)` 验证；否则按当前明文路径执行。
- `general-settings.tsx`「备份与恢复」区块布局调整：
  - 导出区域：保留导出按钮，新增 password 输入框（带 Eye/EyeOff 切换可见性），label 使用 `label_export_passphrase`；下方 hint：
    - 当 `settings.providers.some(p => p.apiKey?.trim())` 为真时，hint 使用 `hint_export_passphrase_warn`（强提示，文案含"建议加密、密钥丢失后导出文件无法恢复"，颜色 amber）。
    - 否则使用 `hint_export_passphrase`（普通灰字，文案中也包含"密钥丢失后无法恢复"提醒）。
  - 点击导出时把当前 password 值传给 `exportSettings`；导出文件名后缀：加密文件用 `.enc.json`，明文沿用 `.json`。
  - 导出成功后通过 `useToast` 弹一次 toast（i18n `toast_export_encrypted_remember`），二次提醒密钥丢失风险。
  - 导入区域：选择文件后调用统一的 `handleImportFile`：
    - 读取文本 → `JSON.parse` 探测 `format` 字段。
    - 若是加密格式，进入"密钥输入态"：在导入按钮下方展开 inline 区域（受控 state `pendingImportText`、`pendingImportPassphrase`、`isAwaitingPassphrase`），含密码输入框 + 确认/取消按钮；确认后才调用 `importSettings(text, passphrase)`。
    - 若解密失败抛 `DECRYPT_FAILED` → 通过 `onError` 展示 i18n `error_import_decrypt_failed`，**保留** `pendingImportText` 与"密钥输入态"以便用户重试；用户点取消才清空。
    - 若是明文，直接走原流程。

完成标准：
- 不填密钥导出 → 输出 `.json`，与现状字节级等价（除文件名外）。
- 填写密钥导出 → 输出 `.enc.json`，文件首字符为 `{` 且包含 `"format":"translator-encrypted-v1"`；用相同密钥导入可恢复完整 settings；用错误密钥导入展示 `error_import_decrypt_failed` 错误提示且保留输入态。
- 当任何 provider 含非空 apiKey，导出区 hint 文案为 warn 版本；warn 与普通版本均含"密钥丢失后导出文件无法恢复"。

### 5. i18n 词条

文件：`public/_locales/zh_CN/messages.json`、`public/_locales/en/messages.json`

新增 keys（zh_CN / en 均需）：

- `label_sampling`（"采样参数" / "Sampling"）
- `label_temperature`、`label_top_p`、`label_max_tokens`、`label_top_p_enable`（"启用" / "Enable"）
- `label_stream`（"流式响应" / "Streaming response"）、`hint_stream`（含"长文本可能触发请求超时，可在通用设置中调高请求超时时间"）
- `hint_extra_body_override`（"与上方独立字段同名时以独立字段为准。" / "Standalone fields above take precedence over keys of the same name in this JSON."）
- `hint_content_type_auto`（"Content-Type 由请求层自动注入，无需手动设置。" / 英文对应）
- `badge_stream`（卡片徽标）
- `label_export_passphrase`、`hint_export_passphrase`（含"密钥丢失后导出文件无法恢复"）、`hint_export_passphrase_warn`（强提示版，同样含丢失风险提示）
- `label_import_passphrase`、`btn_import_confirm`、`btn_import_cancel`
- `toast_export_encrypted_remember`（"已生成加密备份，请妥善保管密钥，丢失后无法恢复。" / 英文对应）
- `error_import_decrypt_failed`、`error_import_passphrase_required`

完成标准：两份语言包同步新增；options 页未出现 `MISSING_*` 占位。

### 6. 联调与验证

- 运行 `bun compile`，无 TS 错误。
- 手动 smoke：
  1. 升级路径：mock 一份旧 settings（含 `body: { temperature: 0.7, max_tokens: 500 }`）通过现有导入流程进入扩展，验证：编辑面板显示 `temperature=0.7` 且 `max_tokens=500`，`body` JSON 编辑器内不再显示这两个键；保存后再次加载行为幂等。
  2. 流式关闭：复跑一段页面翻译，结果与之前一致。
  3. 流式开启：在 OpenAI compatible endpoint 上启用 stream，验证翻译可成功返回累积文本，且 `network` 面板能看到 SSE；cache 命中后续相同文本返回。
  4. 流式跨 chunk 边界：用 mock SSE（每 chunk 切在 JSON 中段）验证 buffer 拼接正确（实现期可写一段临时 dev-only 验证）。
  5. 流式失败降级：将启用流式的模型 `baseURL` 故意改错，触发降级到下一模型；abort 时 cache 不被污染。
  6. 加密导出 → 输出 `.enc.json` → 用相同密钥导入恢复成功；错误密钥保留输入态并展示错误。
  7. 默认 provider 编辑面板的 headers 列表为空（不再预填 Content-Type）；启用 stream 的 provider 卡片显示 Stream 徽标。

## 影响范围

- `src/types/index.ts`：`ProviderConfig` 新增 `temperature` / `topP` / `maxTokens` / `stream` 可选字段，并对 `body` 字段含义加注释。
- `src/lib/schema.ts`：`providerConfigSchema` 同步新增四个采样字段；`stream` 用 `.optional()` 以保留 normalize 迁移空间。
- `src/lib/storage.ts`：默认 provider 移除 `headers['Content-Type']` 与 `body.temperature`，提升为独立 `temperature` / `stream`；新增 `normalizeProvider` / `normalizeSettings` 一次性平滑迁移；`exportSettings(passphrase?)`、`importSettings(text, passphrase?)` 支持加密；新增 `isEncryptedExport` 帮助 UI 探测加密备份。
- `src/lib/crypto.ts`：新增 PBKDF2-SHA256 + AES-GCM 的 `encryptJSON` / `decryptJSON` / `isEncryptedPayload`，仅作用于导出文件。
- `src/lib/api.ts`：`buildBody` 将基础字段、extraBody、独立采样字段按指定优先级装配；`buildHeaders` 流式时 `Accept: text/event-stream`；新增 `consumeOpenAIStream` SSE 解析；`callProvider` 在流式分支使用累积流式读取并由调用方一次性写缓存。
- `src/components/options/provider-settings.tsx`：新建/编辑面板默认值同步；新增「采样参数」（temperature 滑块、top_p 滑块 + 启用开关、max_tokens）、流式响应 switch、额外 Body 覆盖说明、headers 列表 Content-Type 自动注入提示；列表卡片对启用流式的 provider 显示 `Stream` 徽标。
- `src/components/options/general-settings.tsx`：备份与恢复区改造，新增导出密钥输入框（含可见性切换与 hasApiKey 强提示）、加密备份导入态（密码输入 / 确认 / 取消、错误重试保留态）；导出加密时弹 toast。
- `src/entrypoints/options/main.tsx`：`OptionsGeneralSettings` 增加 `onSuccess` prop，连入 `showSuccess` 以便加密导出 toast。
- `public/_locales/zh_CN/messages.json`、`public/_locales/en/messages.json`：补齐 `label_sampling` / `label_temperature` / `label_top_p` / `label_top_p_enable` / `label_max_tokens` / `label_stream` / `hint_stream` / `hint_extra_body_override` / `hint_content_type_auto` / `badge_stream` / `label_export_passphrase` / `hint_export_passphrase[_warn]` / `label_import_passphrase` / `btn_import_confirm` / `btn_import_cancel` / `toast_export_encrypted_remember` / `error_import_decrypt_failed` / `error_import_passphrase_required` 等词条。

## 历史补丁

- patch-1: review 后的轻微问题修复
