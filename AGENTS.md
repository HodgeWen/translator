# AGENTS.md — translator-extension

浏览器翻译扩展。支持 OpenAI-compatible LLM 多提供商接入，页面内容实时翻译（四种显示样式），popup 快速翻译，settings 页全量配置。

## 常用命令

```bash
# 开发（Chrome）
bun dev

# 开发（Firefox）
bun dev:firefox

# 构建
bun build
bun build:firefox

# 打包为 zip（用于商店上传）
bun zip
bun zip:firefox

# TypeScript 检查
bun compile
```

## 技术栈

| 层 | 选型 | 版本 |
|---|---|---|
| 扩展框架 | WXT | ^0.20.0 |
| 前端框架 | React | ^19.0.0 |
| 语言 | TypeScript | ^5.8.3 |
| 样式 | Tailwind CSS | ^4.1.4 |
| 构建 | Vite（WXT 内置） | — |
| 包管理 | Bun | — |
| 验证 | Zod | ^3.24.2 |
| 本地存储 | Dexie (IndexedDB) | ^4.0.11 |
| 扩展存储 | chrome.storage.sync | — |
| 语言检测 | franc-min | ^6.2.0 |
| UI 组件 | class-variance-authority + lucide-react | — |
| 代码编辑 | @uiw/react-codemirror | — |
| i18n | chrome.i18n + 自定义运行时切换 | — |

## 目录结构

```
src/
├── entrypoints/
│   ├── background.ts          # Service Worker：消息路由、定时缓存清理、快捷键
│   ├── content/
│   │   ├── index.ts           # 内容脚本：页面翻译、聚合翻译、Intersection Observer、SPA 检测
│   │   └── styles.css         # 内容脚本注入样式
│   ├── popup/
│   │   ├── main.tsx           # Popup UI：快速翻译、历史记录
│   │   └── index.html
│   └── options/
│       ├── main.tsx           # Settings UI：提供商/模型队列/语言/通用配置
│       └── index.html
├── components/
│   ├── ui/                    # 基础组件（Button, Badge, Select, Textarea）
│   └── code-editor.tsx        # JSON 代码编辑器
├── lib/
│   ├── api.ts                 # 翻译 API 调用、模型队列降级、缓存读写
│   ├── storage.ts             # chrome.storage.sync 读写、默认值、导入导出
│   ├── cache.ts               # IndexedDB 缓存（Dexie）
│   ├── schema.ts              # Zod 配置校验 schema
│   ├── i18n.ts                # 运行时多语言切换
│   ├── lang-detect.ts         # 语言检测（franc / API）
│   └── utils.ts               # cn() 工具
├── types/
│   └── index.ts               # 全局类型定义
└── assets/
    └── styles.css             # Tailwind 主题变量 + 暗色模式

public/_locales/               # i18n 消息文件（zh_CN, en）
```

## 代码风格约束

- **TypeScript**：`strict` 启用；`noUnusedLocals`、`noUnusedParameters` 为 `true`。未使用变量会报错。
- **命名**：React 组件 `PascalCase`；函数/变量/类型 `camelCase`；类型接口 `PascalCase`。
- **类名合并**：一律使用 `cn(...)`（`clsx` + `tailwind-merge`），禁止裸字符串拼接 Tailwind 类。
- **组件样式**：UI 组件使用 `class-variance-authority` 变体模式（`variant`、`size`）。
- **路径别名**：`@/*` → `src/*`；`@/components/*`、`@/lib/*`、`@/hooks/*`、`@/types/*`。
- **无 lint/format 配置**：当前未配置 ESLint / Prettier，新增代码保持现有文件风格一致。
- **CSS 主题**：颜色通过 `@theme` 自定义变量定义（如 `--color-primary`），暗色模式由 `.dark` 类切换。

## 关键架构决策

- **WXT `srcDir: 'src'`**：所有源码在 `src/` 下，WXT 自动扫描 `entrypoints/` 生成 manifest。
- **消息通信**：内容脚本 / popup / options 通过 `chrome.runtime.sendMessage` 与 background 通信；background 统一调用 `translate()` / `detectLanguage()`。
- **模型队列降级**：`modelQueue` 定义优先级，翻译时按顺序尝试，失败自动切换下一个模型。
- **聚合翻译**：内容脚本通过 Intersection Observer 收集可视段落，批量拼接后单请求翻译，失败回落逐段翻译。
- **缓存**：翻译结果按 `(textHash, sourceLang, targetLang)` 缓存到 IndexedDB，background 每日 alarm 清理过期条目。
- **i18n 双轨**：manifest 默认 `zh_CN`；运行时通过 `setUILanguage()` 切换，从 `/_locales/{lang}/messages.json` 动态加载。

## 浏览器兼容

- 主要目标：Chrome / Chromium（manifest v3）
- 同时支持：Firefox（`wxt -b firefox`）
- 开发浏览器：`/Applications/Brave Browser.app`（wxt.config.ts 配置）
