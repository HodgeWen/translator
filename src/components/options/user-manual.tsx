interface Section {
  title: string
  content: string
}

const manualZhCN: Section[] = [
  {
    title: '简介',
    content: `星禾翻译是一款基于大语言模型的浏览器翻译扩展，支持任意兼容 OpenAI API 的服务商。提供四种翻译方式：

• 页面全文翻译 — 按 Alt+W 一键翻译整页内容
• 悬浮翻译 — 按住快捷键（默认 Ctrl）并指向段落即可翻译
• 输入框翻译 — 在输入框中连按三次快捷键即可翻译内容
• 弹窗翻译 — 点击扩展图标手动输入文本翻译

翻译服务分两种类型：Single（单服务商 + 模型自动降级）和 Pool（多服务商按权重轮询）。展示样式与翻译语气支持三级级联：服务默认 → 个人默认 → 全局覆盖。`
  },
  {
    title: '配置引导',
    content: `第一步 - 服务商：进入「服务商」标签页添加翻译服务商。填写名称、接口地址、API Key 和模型。高级选项可设置自定义请求头、查询参数、采样参数（Temperature 等）、服务专属 Prompt（支持 {{sourceLang}}/{{targetLang}} 变量）和流式响应。

第二步 - 翻译服务：在「翻译服务」标签页创建翻译通道。Single 模式选择一个服务商和模型，开启 Fallback 可在失败后自动使用同服务商其他模型。Pool 模式将多个服务商组合加入池中按权重分配请求，失败自动切换。服务级支持自定义 Prompt、默认展示样式和默认翻译语气。

第三步 - 设置与语气：在「显示」标签页配置。四种样式：原文替换（直接替换）、双语对照（原文和译文同时显示）、下划线（译文加下划线，鼠标悬停查看原文）、纯净替换。七种内置翻译语气（正常/技术向/科技前沿/幽默/文学/正式/口语），支持在「预设与风格」中添加自定义语气。`
  },
  {
    title: '行内 HTML 保留机制',
    content: `翻译时段落内的 HTML 元素（如链接、代码、强调文字）会被智能保留。代码和图片等无需翻译的元素保持原样；链接和强调文本等内容需要翻译但样式需要保留的元素，会先提取其样式信息，翻译内容后再还原样式。对于大模型偶尔产生的杂音也有容错处理。`
  },
  {
    title: '聚合翻译',
    content: `将页面中多个段落合并为一次翻译请求，大幅减少调用次数、提升速度。设置在「通用」标签页：开关、每次最大段落数（默认 5）、每次最大文本长度（默认 2000 字符）、最大并发请求数（默认 3）。聚合失败时自动切换为逐段翻译。`
  },
  {
    title: '翻译缓存与隐私',
    content: `翻译结果会缓存在浏览器本地，有效期 7 天，每天自动清理过期条目。修改翻译提示词后旧缓存自动失效。相同文本的在途请求会自动合并，避免重复调用。

隐私：翻译请求直接发送到你配置的服务商，不经过任何中间服务器。API Key 仅保存在浏览器存储中。导出的设置文件支持加密保护。不收集任何用户数据。`
  },
  {
    title: '备份与恢复',
    content: `在「备份与恢复」标签页操作。导出为 JSON 文件（可选加密保护 API Key）。导入时自动检测加密格式并提示输入密码。还原默认可重置所有设置。`
  }
]

const manualEn: Section[] = [
  {
    title: 'Introduction',
    content: `XingHe Translator is a browser translation extension powered by LLMs, supporting any OpenAI-compatible API provider. Four translation modes:

• Full-page translation — press Alt+W to translate an entire page
• Hover translation — hold a key (default Ctrl) and point at any paragraph
• Input box translation — press the shortcut key three times in any input field
• Popup translation — click the extension icon to manually enter text

Two translation service types: Single (one provider with model fallback) and Pool (multiple providers with weighted distribution). Display style and translation tone support 3-level cascading: service default → personal default → global override.`
  },
  {
    title: 'Configuration Guide',
    content: `Step 1 - Providers: Go to the "Providers" tab to add a translation provider. Enter a name, API endpoint URL, API Key, and models. Advanced options include custom headers, query params, sampling parameters (Temperature, etc.), service-specific Prompt (supports {{sourceLang}}/{{targetLang}} variables), and streaming.

Step 2 - Services: Create a translation channel in the "Services" tab. Single mode selects one provider and model, with optional fallback to other models from the same provider. Pool mode combines multiple providers with weighted request distribution and auto-failover. Service-level settings: custom Prompt, default display style, default translation tone.

Step 3 - Display & Tone: Configure in the "Display" tab. Four styles: Original (direct replacement), Bilingual (original and translation shown together), Underline (underlined text, hover to see original), Clean (no markers). 7 built-in tones (Normal/Technical/Tech-forward/Humorous/Literary/Formal/Colloquial), with support for custom tones added in "Presets & Tones".`
  },
  {
    title: 'Inline HTML Preservation',
    content: `HTML elements within paragraphs (links, code, emphasis) are intelligently preserved during translation. Non-translatable elements like code and images remain intact. Styled elements whose content needs translation but whose styling should be kept are processed to preserve their appearance after translation. The system also handles occasional LLM output irregularities gracefully.`
  },
  {
    title: 'Aggregation',
    content: `Combines multiple paragraphs into a single translation request, significantly reducing the number of API calls and improving speed. Configure in the "General" tab: enable/disable, max paragraphs per request (default 5), max text length (default 2000 chars), max concurrent requests (default 3). Automatically falls back to per-paragraph translation if aggregation fails.`
  },
  {
    title: 'Translation Cache & Privacy',
    content: `Translation results are cached locally in the browser with a 7-day lifespan. Expired entries are cleaned up daily. Changing the translation prompt automatically invalidates old cache entries. Identical in-flight requests are merged to avoid redundant calls.

Privacy: Requests go directly to your configured provider — no intermediate servers. API keys are stored only in browser storage. Exported settings files support encryption. No user data is collected.`
  },
  {
    title: 'Backup & Restore',
    content: `In the "Backup & Restore" tab. Export to JSON (optional encryption to protect API keys). Import auto-detects encrypted format and prompts for the passphrase. Restore default resets all settings.`
  }
]

function getManualSections(uiLanguage: string): Section[] {
  if (uiLanguage.startsWith('zh')) return manualZhCN
  return manualEn
}

/* ───────── 翻译流程图形化展示 ───────── */

interface FlowStage {
  title: string
  badge: string
  items: string[]
}

function TranslationFlowDiagram({ isZh }: { isZh: boolean }) {
  const stages: FlowStage[] = isZh
    ? [
        {
          title: '触发翻译',
          badge: '操作方式',
          items: [
            'Alt + W — 一键全文翻译',
            'Ctrl + 悬浮 — 指向段落翻译',
            '连按三次快捷键 — 输入框翻译',
            '点击扩展图标 — 弹窗翻译',
          ],
        },
        {
          title: '内容定位',
          badge: '扫描识别',
          items: [
            '扫描当前页面上的可见内容',
            '识别需要翻译的正文段落',
            '排除代码、图片、导航等无需翻译的区域',
            '页面切换后自动重新定位新内容',
          ],
        },
        {
          title: '文本预处理',
          badge: '格式保留',
          items: [
            '自动判断原文的语言',
            '保留文本中的格式标记（链接、样式等）',
            '代码片段和图片引用保持原样',
            '无需翻译的元素直接跳过',
          ],
        },
        {
          title: '合并发送',
          badge: '效率优化',
          items: [
            '多个段落合并为一次翻译，减少等待次数',
            '刚翻译过的内容直接复用已有结果',
            '短期重复查看的页面无需重新翻译',
          ],
        },
        {
          title: '服务调度',
          badge: '选择服务',
          items: [
            'Single 模式 — 使用指定服务，失败时自动切换其他模型',
            'Pool 模式 — 多服务组合按权重分配，失败自动替换',
            '应用服务自定的翻译提示词、展现方式和语气',
          ],
        },
        {
          title: '结果展示',
          badge: '呈现译文',
          items: [
            '四种展示风格：替换原文 / 双语对照 / 下划线 / 纯净替换',
            '原文中的格式标记完整还原',
            '同一页面随时在原文和译文之间切换，无需重新翻译',
          ],
        },
      ]
    : [
        {
          title: 'Trigger',
          badge: 'Action',
          items: [
            'Alt + W — Full-page translation',
            'Ctrl + Hover — Point to translate',
            'Triple-tap shortcut — Input box',
            'Click icon — Popup translation',
          ],
        },
        {
          title: 'Locate Content',
          badge: 'Scan & Identify',
          items: [
            'Scan visible content on the page',
            'Identify translatable paragraphs',
            'Skip code, images, navigation, etc.',
            'Re-locate content after page navigation',
          ],
        },
        {
          title: 'Prepare Text',
          badge: 'Preserve Format',
          items: [
            'Auto-detect source language',
            'Preserve formatting marks (links, styles)',
            'Keep code snippets and image references intact',
            'Skip non-translatable elements',
          ],
        },
        {
          title: 'Batch & Send',
          badge: 'Optimize',
          items: [
            'Merge paragraphs into one request, fewer round trips',
            'Reuse recent results for repeated content',
            'No re-translation needed for revisited pages',
          ],
        },
        {
          title: 'Service Dispatch',
          badge: 'Select Service',
          items: [
            'Single mode — use one service, auto-fallback on failure',
            'Pool mode — weighted distribution across services',
            'Apply custom prompts, display style, and tone',
          ],
        },
        {
          title: 'Display Result',
          badge: 'Show Translation',
          items: [
            'Four styles: Replace / Bilingual / Underline / Clean',
            'Original formatting fully restored',
            'Toggle between original and translation anytime, no re-request',
          ],
        },
      ]

  const gradients = [
    'from-sky-400 to-blue-500',
    'from-indigo-400 to-indigo-600',
    'from-violet-400 to-purple-600',
    'from-fuchsia-400 to-pink-600',
    'from-orange-400 to-rose-500',
    'from-emerald-400 to-teal-600',
  ]

  return (
    <div className="relative py-2">
      {/* 中央竖线 */}
      <div
        className="absolute left-[1.625rem] top-0 bottom-0 w-0.5 -translate-x-1/2"
        style={{
          background:
            'linear-gradient(to bottom, #38bdf8, #6366f1, #a855f7, #d946ef, #f43f5e, #14b8a6)',
        }}
      />

      {stages.map((stage, i) => (
        <div key={i} className="relative mb-5 last:mb-0">
          {/* 连接箭头（除最后一项） */}
          {i < stages.length - 1 && (
            <div className="absolute left-[1.625rem] bottom-0 translate-y-full -translate-x-1/2 z-10 pb-5">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-muted-foreground/30"
              >
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>
          )}

          <div className="flex items-start gap-4">
            {/* 步骤编号 */}
            <div
              className={`relative z-10 flex-shrink-0 w-[3.25rem] h-[3.25rem] rounded-xl bg-gradient-to-br ${gradients[i]} flex items-center justify-center text-white font-bold text-base shadow-md`}
            >
              {i + 1}
            </div>

            {/* 卡片 */}
            <div className="flex-1 min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold text-white bg-gradient-to-r ${gradients[i]}`}
                >
                  {stage.badge}
                </span>
                <h4 className="font-semibold text-sm text-foreground">
                  {stage.title}
                </h4>
              </div>
              <ul className="space-y-1.5">
                {stage.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span
                      className={`mt-1.5 block w-1.5 h-1.5 flex-shrink-0 rounded-full bg-gradient-to-r ${gradients[i]}`}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function OptionsUserManual({ uiLanguage }: { uiLanguage: string }) {
  const isZh = uiLanguage.startsWith('zh')
  const sections = getManualSections(uiLanguage)
  const skipIndex = 1 // 替换掉原"架构概览"章节

  return (
    <div className="space-y-8">
      {/* 0 - 简介 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">
          {isZh ? '1. 简介' : '1. Introduction'}
        </h3>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {sections[0].content}
        </div>
      </div>

      {/* 1 - 翻译流程图形化展示 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">
          {isZh ? '2. 翻译流程' : '2. Translation Flow'}
        </h3>
        <TranslationFlowDiagram isZh={isZh} />
      </div>

      {/* 其余文字章节 */}
      {sections.slice(skipIndex + 1).map((section, idx) => (
        <div key={idx}>
          <h3 className="text-lg font-semibold mb-3 text-foreground">
            {idx + 3}. {section.title}
          </h3>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {section.content}
          </div>
        </div>
      ))}
    </div>
  )
}
