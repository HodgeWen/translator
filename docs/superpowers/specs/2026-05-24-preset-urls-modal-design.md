# 2026-05-24-preset-urls-modal-design

在管理服务商表单填写时，添加一个内置的常见服务商地址快捷查询弹窗，支持一键复制服务商 Base URL 以及直达服务商官方开发文档，从而优化用户的配置体验。

## 需求背景与目标

目前，用户在浏览器翻译扩展的设置页面（Options UI）配置新的大模型翻译服务商时，需要手动到对应服务商的官网上寻找其标准的 API 对接地址（Base URL）和官方开发文档，整个流程较为繁琐且碎片化。

本设计的目标是：
1. 在服务商编辑表单的 Base URL 字段旁边增加一个**常见服务商地址快捷入口**。
2. 点击后弹出一个高颜值的、与配置面板已有风格高度一致的**磨砂玻璃遮罩弹窗 (Modal)**。
3. 弹窗内按分类（国内主流、国外主流、聚合网关、本地部署）列出 16 家常见服务商。
4. 提供**一键复制**功能，且复制成功时提供 2 秒的过渡视觉状态（已复制！）。
5. 提供**直接访问官方接口文档的外部链接按钮**，点击安全跳转。

## 详细设计与交互流程

### 1. 触发入口设计 (ProviderEditForm)
* 在 `Base URL` 输入框上方的 Label 区域右侧放置一个精致的“常见服务商地址”链接式按钮。
* 按钮内置 `Globe`（地球）图标，并在 Hover 时文字呈现平滑的颜色渐变，增加微交互感。

### 2. 弹窗主体设计 (PresetUrlsModal)
弹窗整体高宽为 `max-w-3xl`（约 768px），最大高度 `max-h-[85vh]`，使用磨砂玻璃质感的背景遮罩。

* **头部 (Header)**：包含 `Globe` 图标和标题“常见服务商接口地址快捷查询”，支持右下角关闭按钮和右上角 `X` 按钮。
* **左侧分类侧边栏 (Sidebar)**：
  - 提供 5 个分类过滤按钮：`全部`、`国内主流`、`国外主流`、`聚合网关`、`本地部署`。
  - 点击分类可平滑过滤右侧的服务商列表。当前选中分类有明显的半透明背景和文字高亮。
* **右侧卡片式列表 (Card List)**：
  - 卡片在 Hover 时有极轻微的背景加深。
  - 显示服务商名称与带有 Emoji 徽标（如 🇨🇳, 🇺🇸, 🌐, 💻）的徽章。
  - **Base URL 区域**：
    - 地址展示在精细的代码容器中，采用 `font-mono` 字体。
    - 卡片右侧自带**【复制】**图标按钮。点击后，将地址存入系统剪贴板，按钮上的文字和图标平滑过渡为 🟢 **“已复制！”**，并维持 2 秒的成功反馈状态。
  - **官方文档链接**：
    - 拥有一个外链图标按钮 **【官方文档 ↗】**。
    - 使用 `rel="noopener noreferrer" target="_blank"` 安全地在新标签页中打开。

## 预设服务商清单

为了方便用户，弹窗将内置以下 16 家国内外主流服务商：

### 国内主流 (Category: domestic)
1. **DeepSeek 官方**: Base URL `https://api.deepseek.com` | [官方文档](https://api-docs.deepseek.com)
2. **阿里通义千问 (DashScope)**: Base URL `https://dashscope.aliyuncs.com/compatible-mode/v1` | [官方文档](https://help.aliyun.com/zh/dashscope/developer-reference/compatibility-of-openai-with-dashscope)
3. **智谱 AI (GLM)**: Base URL `https://open.bigmodel.cn/api/paas/v4` | [官方文档](https://open.bigmodel.cn/dev/api)
4. **月之暗面 (Moonshot)**: Base URL `https://api.moonshot.cn/v1` | [官方文档](https://platform.moonshot.cn/docs/guide)
5. **零一万物 (01.AI)**: Base URL `https://api.lingyiwanwu.com/v1` | [官方文档](https://platform.lingyiwanwu.com/docs)
6. **腾讯混元 (Hunyuan)**: Base URL `https://api.hunyuan.cloud.tencent.com/v1` | [官方文档](https://cloud.tencent.com/document/product/1729/111007)
7. **百度千帆 (Qianfan)**: Base URL `https://qianfan.baidubce.com/v2` | [官方文档](https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Flz02la4s)
8. **字节火山方舟 (Ark)**: Base URL `https://ark.cn-beijing.volces.com/api/v3` | [官方文档](https://www.volcengine.com/docs/82379/1298454)

### 国外主流 (Category: foreign)
9. **OpenAI 官方**: Base URL `https://api.openai.com/v1` | [官方文档](https://platform.openai.com/docs/api-reference)
10. **Anthropic (Claude)**: Base URL `https://api.anthropic.com/v1` | [官方文档](https://docs.anthropic.com/en/api/getting-started)
11. **Google Gemini (兼容)**: Base URL `https://generativelanguage.googleapis.com/v1beta/openai` | [官方文档](https://ai.google.dev/gemini-api/docs/openai)
12. **Groq 官方**: Base URL `https://api.groq.com/openai/v1` | [官方文档](https://console.groq.com/docs/quickstart)

### 聚合/网关 (Category: gateway)
13. **SiliconFlow (硅基流动)**: Base URL `https://api.siliconflow.cn/v1` | [官方文档](https://docs.siliconflow.cn)
14. **OpenRouter**: Base URL `https://openrouter.ai/api/v1` | [官方文档](https://openrouter.ai/docs)
15. **Together AI**: Base URL `https://api.together.xyz/v1` | [官方文档](https://docs.together.ai/docs/quickstart)

### 本地部署 (Category: local)
16. **Ollama**: Base URL `http://localhost:11434/v1` | [官方文档](https://github.com/ollama/ollama/blob/main/docs/openai.md)

## 修改清单与范围

### 1. 新建 `src/components/options/preset-urls-modal.tsx`
* 实现 `PresetUrlsModalProps` 接口：
  - `isOpen: boolean`
  - `onClose: () => void`
* 放置静态服务商列表常量数据。
* 编写分类筛选逻辑及一键复制状态管理（带 2 秒延时清空）。
* 与 `ReasoningHelpModal` 使用一致的遮罩和动画类，保证风格完全统一。

### 2. 修改 `src/components/options/provider-edit-form.tsx`
* 引入新组件 `PresetUrlsModal` 和图标 `Globe`。
* 增加 `showPresetUrls` 状态用于控制 Modal 开关。
* 在 Base URL 字段 Label 右侧渲染触发按钮，在文件底部渲染 `<PresetUrlsModal>`。

### 3. 修改中英文国际化语言文件
* 路径：`public/_locales/zh_CN/messages.json` 和 `public/_locales/en/messages.json`
* 新增词条：
  - `label_preset_urls` / `"常见服务商地址"` / `"Preset Providers"`
  - `preset_urls_modal_title` / `"常见服务商接口地址快捷查询"` / `"Preset Provider Base URLs"`
  - `preset_urls_modal_close` / `"关闭"` / `"Close"`
  - `preset_urls_category_all` / `"全部"` / `"All"`
  - `preset_urls_category_domestic` / `"国内主流"` / `"Domestic"`
  - `preset_urls_category_foreign` / `"国外主流"` / `"Foreign"`
  - `preset_urls_category_gateway` / `"聚合网关"` / `"Aggregators"`
  - `preset_urls_category_local` / `"本地部署"` / `"Local Deployment"`
  - `btn_copy_url` / `"复制"` / `"Copy"`
  - `btn_copied_url` / `"已复制!"` / `"Copied!"`
  - `btn_doc` / `"官方文档"` / `"Doc"`

## 验证与测试方案
1. **界面检查**：在 Options 的服务商设置中，新增或编辑服务商，确认 Base URL 字段旁边是否出现 “常见服务商地址” 的按钮。
2. **弹窗表现**：点击按钮，查看弹窗是否正常弹出，是否支持遮罩模糊效果和渐入动画，右上角 `X` 键和右下角 “关闭” 键是否功能正常。
3. **筛选功能**：点击左侧不同分类，确认右侧服务商列表过滤是否灵敏、正确。
4. **复制功能**：点击右侧服务商的“复制”按钮，确认是否有“已复制!”的状态提示（图标转为 Check 且文字绿色高亮），并确认系统剪贴板中是否确实写入了正确的 Base URL。
5. **外链文档**：点击“官方文档 ↗”，确认新标签页中打开的 URL 页面是否正确无误。
