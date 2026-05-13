interface Section {
  title: string;
  content: string;
}

const manualZhCN: Section[] = [
  {
    title: '简介',
    content: `智能翻译器是一款基于大语言模型（LLM）的浏览器翻译扩展。它支持接入任意兼容 OpenAI API 的服务商或第三方网关，利用大模型对语境和语义的深度理解，提供比传统机翻更自然流畅的翻译结果。

核心特性：
• 页面全文翻译 — 一键将网页翻译成你的母语
• 悬浮翻译 — 按住快捷键悬浮任意文本即可翻译
• 输入框翻译 — 在输入框中连按快捷键，翻译或还原键入内容
• 弹窗翻译 — 打开扩展弹窗手动输入文本进行翻译
• 多服务商支持 — 可配置多个大模型服务商，自由选择模型
• 负载均衡 — 按权重将请求分配到多个服务商，均衡配额
• 聚合翻译 — 将页面多个段落合并为一次请求，提升效率`,
  },
  {
    title: '第一步：配置服务商',
    content: `安装扩展后，首先需要配置至少一个大模型服务商。支持任意兼容 OpenAI Chat Completions API 的服务：

1. 进入「服务商」标签页，点击「添加服务商」
2. 填写名称（任意标识，如 "OpenAI"、"DeepSeek"）
3. 填写接口地址，需包含完整路径（如 https://api.openai.com/v1/chat/completions）
4. 填写 API Key（可选，会自动添加为 Bearer Token）
5. 添加模型：填写模型 ID 和显示名称
   • 模型 ID 为 API 请求中的 "model" 字段值，如 gpt-4o、deepseek-chat
   • 显示名称仅用于界面展示，可任意填写

高级选项（可选）：
• 请求头：自定义 HTTP 请求头，同名键会覆盖默认值。默认已自动注入 Content-Type: application/json 和 Authorization: Bearer（若填写了 API Key）
• 查询参数：附加到请求 URL 的查询字符串
• 额外请求体：合并到请求 JSON 中的额外字段，常用于设置 reasoning_effort（OpenAI）或 enable_thinking（Anthropic）
• 翻译提示词：覆盖全局提示词，支持 {{sourceLang}} 和 {{targetLang}} 变量
• 采样参数：Temperature（0~2，推荐 0~0.3）、Top P（0~1）、Max Tokens
• 流式响应：开启后翻译结果以 SSE 增量推送`,
  },
  {
    title: '页面全文翻译',
    content: `通过快捷键一键翻译整页内容。

使用方式：
1. 按下快捷键 Alt+W（默认）触发页面翻译
2. 再次按下同一快捷键可切换翻译开关（还原原文 / 重新翻译）
3. 快捷键可在 chrome://extensions/shortcuts 中修改

翻译样式（在「显示」标签页中设置）：
• 原文替换 — 替换页面文本但尽可能保留原始 HTML 元素结构
• 双语对照 — 原文和译文同时显示
• 下划线 — 译文加下划线，鼠标悬停时显示原文提示
• 纯净替换 — 无任何标记的完全替换

适用场景：阅读外文文档、新闻、博客等整篇内容。`,
  },
  {
    title: '悬浮翻译',
    content: `按住快捷键并悬浮在任意文本上，即可弹出翻译结果。适合快速查看某个单词、句子或段落的翻译，无需切换页面。

使用方式：
1. 按住快捷键（默认 Ctrl，可在「通用」标签页中修改为 Alt / Shift / Option / Command / Win）
2. 将鼠标悬浮在需要翻译的文本上
3. 弹出翻译浮层，显示原文和译文（双语对照）

快捷键设置：
• 只支持单键：Control / Alt / Shift / Meta（Command/Win）
• 设置路径：「通用」→「悬浮翻译快捷键」`,
  },
  {
    title: '输入框翻译',
    content: `在网页的任意输入框（textarea、contenteditable 等）中快速翻译或还原键入内容。

使用方式：
1. 在输入框中连按三下快捷键（默认 Control，可在「通用」标签页中修改）
2. 输入框中的文本将被翻译为目标语言
3. 再次连按三下快捷键，还原为原文

适用场景：
• 在社交媒体、评论区、邮件中快速翻译想发送的内容
• 将外文回复翻译后再发送`,
  },
  {
    title: '弹窗翻译',
    content: `点击工具栏中的扩展图标打开翻译弹窗，手动输入文本进行翻译。

功能说明：
• 输入文本后点击「翻译」按钮或按 Enter
• 支持直接粘贴文本（粘贴后自动翻译）
• 翻译目标语言默认为母语，自动检测输入语言
• 可手动指定目标语言（下拉切换），本次会话有效
• 支持翻译风格切换：正常 / 技术向 / 科技前沿 / 幽默 / 文学 / 正式 / 口语
• 短词/短语自动触发一词多义展示

翻译详情：
• 点击翻译结果下方的「查看详情」可看到使用的服务商、模型及 token 用量`,
  },
  {
    title: '负载均衡',
    content: `负载均衡功能按权重将翻译请求自动分配到多个服务商，适合同时拥有多个 API Key 或不同服务商配额的用户。

配置步骤：
1. 在「服务商」标签页中添加多个服务商
2. 进入「负载均衡」标签页，开启负载均衡
3. 勾选参与负载均衡的服务商，设置权重（数值越大，分配到的请求越多）
4. 为每个服务商指定优先使用的模型（可选）

工作机制：
• 按权重比例轮询分配请求
• 某服务商失败时自动切换到下一个
• 在弹窗面板中可快速开关负载均衡`,
  },
  {
    title: '聚合翻译',
    content: `聚合翻译将页面中的多个段落合并为一次 API 请求，大幅减少请求次数、提升翻译速度。

相关设置（在「通用」标签页中）：
• 启用聚合翻译 — 开关总控
• 每次最大段落数 — 单次请求最多包含的段落数
• 每次最大文本长度 — 单次请求的文本长度上限（字符数）
• 最大并发请求数 — 同时进行的翻译请求数

注意：段落数或文本长度任一达到上限即触发发送。`,
  },
  {
    title: '语言检测',
    content: `语言检测用于判断页面的原始语言，以决定是否翻译以及翻译方向。

检测机制：
1. franc-min 始终优先使用（本地检测，无需网络）
2. 当 franc-min 无法确定时，可配置额外的 API 检测器作为备用

配置方式（在「语言」标签页中）：
• 添加 API 检测器：填写接口地址和 API Key
• 添加 Google（免 key）：使用 Google 翻译公共端点，无需 API Key。隐私提醒：查询文本会发送至 Google 服务器`,
  },
  {
    title: '备份与恢复',
    content: `在「备份与恢复」标签页中可导出/导入全部设置。

导出：
• 点击「导出设置」生成 JSON 文件
• 可设置加密密钥，以 AES-GCM 加密导出（强烈推荐，保护 API Key）
• 加密密钥丢失后导出文件无法恢复，请妥善保管

导入：
• 选择之前导出的 JSON 文件
• 若文件已加密，需输入对应密钥
• 点击「确认导入」完成

还原默认：
• 点击「还原默认」将所有设置重置为默认值`,
  },
];

const manualEn: Section[] = [
  {
    title: 'Introduction',
    content: `Translator is a browser translation extension powered by large language models (LLMs). It supports any OpenAI-compatible API provider or third-party gateway, leveraging the deep contextual understanding of LLMs to produce more natural and fluent translations than traditional machine translation.

Key Features:
• Full-page translation — translate an entire webpage into your native language with one shortcut
• Hover translation — hold a key and hover over any text to translate
• Input box translation — triple-press a key in any input field to translate or restore text
• Popup translation — open the extension popup to manually translate text
• Multi-provider support — configure multiple LLM providers and switch models freely
• Load balancing — distribute requests across providers by weight to balance quota usage
• Aggregation — combine multiple paragraphs into a single request for better efficiency`,
  },
  {
    title: 'Step 1: Configure Providers',
    content: `After installation, first configure at least one LLM provider. Any service compatible with the OpenAI Chat Completions API is supported.

1. Go to the "Providers" tab and click "Add Provider"
2. Enter a name (any identifier, e.g. "OpenAI", "DeepSeek")
3. Enter the Base URL with full path (e.g. https://api.openai.com/v1/chat/completions)
4. Enter an API Key (optional; will be auto-sent as Bearer token)
5. Add models: enter Model ID and Display Name
   • Model ID is the "model" field value in API requests, e.g. gpt-4o, deepseek-chat
   • Display Name is only for UI display, can be anything

Advanced options (optional):
• Headers: custom HTTP headers; same-name keys override defaults. Content-Type: application/json and Authorization: Bearer are auto-injected
• Query params: appended to request URL as query string
• Extra body: additional fields merged into the request JSON, useful for reasoning_effort (OpenAI) or enable_thinking (Anthropic)
• Translation prompt: override the global prompt; supports {{sourceLang}} and {{targetLang}} variables
• Sampling: Temperature (0–2, recommended 0–0.3), Top P (0–1), Max Tokens
• Streaming: when enabled, results are delivered incrementally via SSE`,
  },
  {
    title: 'Full-Page Translation',
    content: `Translate an entire page with a single keyboard shortcut.

How to use:
1. Press the default shortcut Alt+W to trigger page translation
2. Press again to toggle translation on/off (restore original / re-translate)
3. The shortcut can be changed at chrome://extensions/shortcuts

Translation styles (set in the "Display" tab):
• Original — replace text while preserving HTML element structure
• Bilingual — show original and translation together
• Underline — underlined translation with original tooltip on hover
• Clean — clean replacement without any visual markers

Best for: reading foreign documentation, news, blog posts, and other full-page content.`,
  },
  {
    title: 'Hover Translation',
    content: `Hold a modifier key and hover over any text to see a translation popup. Perfect for quickly checking a word, sentence, or paragraph without leaving the page.

How to use:
1. Hold the shortcut key (default: Ctrl; can be changed to Alt / Shift / Option / Command / Win in the "General" tab)
2. Hover the mouse over the text you want to translate
3. A translation tooltip appears showing both original and translated text (bilingual)

Shortcut settings:
• Single key only: Control / Alt / Shift / Meta (Command/Win)
• Settings path: "General" → "Hover Translation Shortcut"`,
  },
  {
    title: 'Input Box Translation',
    content: `Quickly translate or restore text in any textarea, contenteditable field, or input on a webpage.

How to use:
1. In any input field, press the shortcut key three times quickly (default: Control; configurable in the "General" tab)
2. The text in the field will be translated to the target language
3. Press the key three times again to restore the original text

Use cases:
• Quickly translate content you want to send in social media, comments, or emails
• Translate foreign replies before sending`,
  },
  {
    title: 'Popup Translation',
    content: `Click the extension icon in the toolbar to open the translation popup and manually enter text.

Features:
• Type text and click "Translate" or press Enter
• Paste text directly (auto-translates on paste)
• Target language defaults to your native language; input language is auto-detected
• Manually override the target language (per-session)
• Choose translation tone: Normal / Technical / Tech-forward / Humorous / Literary / Formal / Colloquial
• Short words/phrases automatically show multiple meanings

Translation details:
• Click "Show Details" below the result to see the provider, model, and token usage`,
  },
  {
    title: 'Load Balancing',
    content: `Load balancing distributes translation requests across multiple providers by weight. Ideal for users with multiple API keys or quotas across different providers.

Configuration:
1. Add multiple providers in the "Providers" tab
2. Go to the "Load Balance" tab and enable load balancing
3. Select participating providers and set weights (higher weight = more requests)
4. Optionally specify a preferred model for each provider

How it works:
• Requests are distributed proportionally by weight (weighted round-robin)
• If a provider fails, the next one is used automatically
• Quickly toggle load balancing from the popup panel`,
  },
  {
    title: 'Aggregation',
    content: `Aggregation combines multiple paragraphs on a page into a single API request, significantly reducing the number of requests and improving translation speed.

Settings (in the "General" tab):
• Enable Aggregation — master switch
• Max Paragraphs per Request — maximum paragraphs in a single request
• Max Text Length per Request — character limit per request
• Max Concurrent Requests — number of simultaneous translation requests

Note: a request is sent once either the paragraph count or text length limit is reached.`,
  },
  {
    title: 'Language Detection',
    content: `Language detection determines the original language of a page to decide whether translation is needed and which direction to translate.

Detection mechanism:
1. franc-min is always used first (local detection, no network needed)
2. When franc-min is uncertain, additional API detectors can be configured as fallback

Configuration (in the "Language" tab):
• Add API Detector: provide endpoint URL and API key
• Add Google (Free): uses Google Translate's public endpoint, no API key required. Privacy note: query text is sent to Google's servers`,
  },
  {
    title: 'Backup & Restore',
    content: `Export and import all settings in the "Backup & Restore" tab.

Export:
• Click "Export Settings" to generate a JSON file
• Optionally set an encryption passphrase to encrypt with AES-GCM (strongly recommended to protect API keys)
• The passphrase cannot be recovered if lost — keep it safe

Import:
• Select a previously exported JSON file
• If the file is encrypted, enter the corresponding passphrase
• Click "Confirm Import" to apply

Reset:
• Click "Restore Default" to reset all settings to their default values`,
  },
];

function getManualSections(uiLanguage: string): Section[] {
  if (uiLanguage.startsWith('zh')) return manualZhCN;
  return manualEn;
}

export function OptionsUserManual({ uiLanguage }: { uiLanguage: string }) {
  const sections = getManualSections(uiLanguage);

  return (
    <div className="space-y-8">
      {sections.map((section, idx) => (
        <div key={idx}>
          <h3 className="text-lg font-semibold mb-3 text-foreground">
            {idx + 1}. {section.title}
          </h3>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {section.content}
          </div>
        </div>
      ))}
    </div>
  );
}
