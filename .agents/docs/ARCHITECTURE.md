# 架构

## 业务架构

浏览器翻译扩展（仅 Chrome / Chromium，manifest v3），给需要阅读外文页面的用户使用。核心域：

- **多提供商 LLM 接入**：任意 OpenAI-compatible API（ baseURL + apiKey + modelQueue），翻译时按模型队列顺序尝试、失败自动降级到下一个模型
- **页面翻译**：内容脚本识别页面段落，可视区域批量聚合翻译（单请求），失败回落逐段翻译；四种译文显示样式（双语/替换等）
- **popup 快速翻译**：弹出窗口手动输入翻译，含历史记录
- **设置页**：提供商、模型队列、语言、显示、统计等全量配置，支持导入/导出（AES-GCM 加密）
- **翻译缓存与统计**：按 `(textHash, sourceLang, targetLang)` 缓存译文；请求日志与 token 用量统计（chart.js 图表展示）

## 技术架构

WXT 扩展，`srcDir: 'src'`，WXT 自动扫描 `entrypoints/` 生成 manifest。四个运行边界：

- **background**（Service Worker）：消息路由中枢。内容脚本 / popup / options 通过 `chrome.runtime.sendMessage`（封装在 `lib/messaging.ts`）与它通信；它统一调用 `translate()` / `detectLanguage()`，并负责每日 alarm 清理过期缓存、注册快捷键（Alt+W toggle-translate）
- **content**（内容脚本）：页面翻译流水线——段落识别（`block-detect`）、行内富文本占位符（`inline-placeholder`，`#N#` / `<sN>` 标记）、Intersection Observer 收集可视段落、批量拼接协议（`batch-protocol`）、DOM 回写（`dom-text-replace` + `style-apply`）、SPA 变化检测、划词/悬停翻译（`ctrl-hover`）、输入框翻译（`input-translate`）、站点特化规则（`site-rules/`）
- **popup / options**（React UI）：popup 快速翻译与历史；options 全量设置

数据存储：

- 配置 → `chrome.storage.sync`（`lib/storage.ts`，Zod schema 校验，导入/导出走 `lib/crypto.ts` AES-GCM）
- 翻译缓存、请求日志、token 统计 → IndexedDB（Dexie，`lib/cache.ts` / `lib/stats.ts`）

关键集成：外部 LLM API（chat/completions，支持 SSE 流式，`lib/api/sse-consumer.ts`）；`chrome.i18n` + 运行时切换双轨（manifest 默认 `zh_CN`，`setUILanguage()` 从 `/_locales/{lang}/messages.json` 动态加载）。

构建与发布：`bun run dev` 开发，`bun run build` / `bun run zip` 产出 Chrome 商店 zip；发版走 `scripts/release.mjs`（bump `package.json#version` → manifest.version 同步，中文约定式 commit + tag + push 触发 CI `.github/workflows/release.yml`，仅构建并发布 Chrome 包），`scripts/verify-release.mjs` 校验 Release。开发浏览器为 Brave（`wxt.config.ts` webExt 配置）；开发模式注入根目录 `dev-settings.json` 供 background 自动导入。

### 技术栈

| 层 | 选型 | 备注 |
| --- | --- | --- |
| 语言 / runtime | TypeScript ^6.0.3 / Bun | strict |
| 扩展框架 | WXT ^0.20.26（内置 Vite） | manifest v3，srcDir: src |
| 前端框架 | React ^19.2.6 | |
| 样式 | Tailwind CSS ^4.3.0（@tailwindcss/vite） | `@theme` 变量 + `.dark` 暗色 |
| 校验 | Zod ^4.4.3 | 配置 schema |
| 本地存储 | Dexie ^4.0.11（IndexedDB） + chrome.storage.sync | |
| 语言检测 | franc-min ^6.2.0 | |
| 图表 | chart.js ^4.5.1 | 统计页 |
| 代码编辑 | @uiw/react-codemirror ^4.25.9 | JSON 编辑 |
| UI 辅助 | lucide-react ^1.14.0、clsx + tailwind-merge | |
| 测试 | bun:test | `tests/` |
| 格式化 | oxfmt ^0.49.0 | `.oxfmtrc.json` |
| 构建 / 包管理 | WXT / Bun | |

## 未决

- 测试何时必须写、收尾验证范围：仓库无明确约定，未定
