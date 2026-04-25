# Chrome Web Store 上架准备清单

> 以下信息对应 `wxt.config.ts` 中声明的 manifest 字段与 `public/_locales/` 中的 i18n 消息。

## 1. 基本信息

| 字段 | 内容 |
|---|---|
| 扩展名称（中文） | 智能翻译器 |
| 扩展名称（英文） | Translator |
| 版本号 | `0.1.0` |
| 默认语言 | `zh_CN`（`default_locale`） |
| 简短说明 | 基于 OpenAI 兼容大模型的浏览器翻译扩展。支持多服务商接入、四种页面翻译样式、快捷弹窗翻译。 |
| 详细说明 | 参考 README.md 功能列表，需提供中英双语版本 |

## 2. 权限及用途说明（填表用）

| 权限 | 用途 |
|---|---|
| `storage` | 保存用户配置（服务商、模型、语言偏好设置） |
| `activeTab` | 获取当前标签页信息以发送翻译指令 |
| `scripting` | 在用户主动触发翻译时注入内容脚本 |
| `alarms` | 每日定时清理过期的翻译缓存条目 |
| `host_permissions: <all_urls>` | 在任意网页上支持用户发起的翻译操作 |

> **远程代码检查**：本扩展不使用 `eval()`、不加载远程脚本，所有逻辑打包在本地。

## 3. 图标

| 尺寸 | 文件 | 状态 |
|---|---|---|
| 16x16 | `public/icon/16.png` | 已有 |
| 32x32 | `public/icon/32.png` | 已有 |
| 48x48 | `public/icon/48.png` | 已有 |
| 96x96 | `public/icon/96.png` | 已有 |
| 128x128 | `public/icon/128.png` | 缺失 — `wxt.config.ts` 引用但目录中无此文件，需补充 |

## 4. 截图与宣传图

| 类型 | 尺寸 | 说明 |
|---|---|---|
| 截图（至少 1 张，建议 5 张） | 1280x800 或 640x400 | 展示 popup 快速翻译、设置页面、四种页面翻译样式 |
| 小型宣传图（可选） | 440x280 | |
| 大型宣传图（可选） | 920x680 | |
| Marquee 宣传图（可选） | 1400x560 | |

## 5. 商店分类

- **类别**：生产力工具（Productivity）
- **语言**：中文、英语

## 6. 隐私政策

需提供可公开访问的隐私政策页面 URL，说明以下要点：

- 翻译请求直接发送到用户配置的第三方服务商 API，不经过任何中间服务器
- API Key 存储在 chrome.storage.sync 中，不上传至任何外部服务器
- 不收集任何用户数据，无遥测上报
- 翻译缓存在浏览器本地 IndexedDB 中存储，可随时清除

## 7. 发布前检查项

- [ ] `bun compile` — TypeScript 类型检查无错误
- [ ] `bun build` — 生产构建成功（输出 `.output/chrome-mv3`）
- [ ] 补充缺失的 `public/icon/128.png`
- [ ] 在 Chrome `chrome://extensions` 加载解压目录，确认无明显错误
- [ ] 确认 `manifest.json` 中无多余权限声明
- [ ] 确认未使用 Manifest V2 弃用字段
- [ ] 确认未在 `content_security_policy` 中声明 `unsafe-eval`
- [ ] 确认版本号符合 `x.y.z` 格式
- [ ] 确保 `background.ts` 中无 `eval()` 等受限 API

## 8. 开发者账号

- [ ] 注册 [Chrome Web Store 开发者账号](https://chrome.google.com/webstore/devconsole)（一次性 $5 注册费）
- [ ] 填写开发者信息（名称、地址、网站）

## 9. 提交流程

1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 点击「新增项」→ 上传 `.output/chrome-mv3` 打包的 zip 文件（通过 `bun zip` 生成）
3. 填写商店详情（名称、说明、权限用途、图标、截图）
4. 选择类别、语言、适用地区
5. 填写隐私政策链接
6. 提交审核（通常 1-3 个工作日）
