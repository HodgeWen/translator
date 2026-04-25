# review 后的轻微问题修复

## 补丁内容

针对 plan-9 review 中提出的三项轻微问题做集中修复，不改变功能边界，仅一致性与代码质量层面收敛：

1. **normalize 同步清理冗余 Content-Type**：`normalizeProvider` 在迁移采样字段的同时，剔除 `headers` 中默认的 `Content-Type: application/json`（仅当 value 是 `application/json`，大小写不敏感；用户自定义的特殊值保留）。这样老用户存量 provider 打开编辑面板时，headers 列表也不会再出现冗余的 Content-Type，与新建 provider 的体验一致。请求层仍然在 `buildHeaders` 中自动注入 `Content-Type: application/json`，运行时行为完全保留。
2. **`OpenAIChatResponse` 类型补齐 `delta` 字段**：移除 `consumeOpenAIStream` 中的内联交叉类型 hack（`OpenAIChatResponse & { choices?: Array<{ delta?: ... }> }`），把 `delta?: { content?: string }` 直接补进 `choices[]` 类型定义，类型表达统一、可被其他流式解析复用。
3. **导出成功后清空 passphrase state**：加密导出成功后清空 `exportPassphrase` 与可见性切换状态，避免口令长时间停留在 React state 内存中（仍非强制 secret cleanup，但在用户视角更直观——一次导出对应一次输入）。

## 影响范围

- 修改文件: `src/lib/storage.ts`
- 修改文件: `src/lib/api.ts`
- 修改文件: `src/components/options/general-settings.tsx`
