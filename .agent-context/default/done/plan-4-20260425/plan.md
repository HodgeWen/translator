# 批量翻译协议改造

> 状态: 已执行

## 目标

当前聚合翻译用 `PARAGRAPH_BREAK` 常量拼接多个段落后整体送 LLM，再 `split` 拆回。该协议在真实 LLM 输出下至少有三类脆弱点：

1. **模型漏分隔符或补额外分隔符**：拆分后数量与原段落不一致，回退逻辑粗暴（全部 fallback 到单段翻译，等于放弃批量收益）。
2. **模型翻译分隔符本身**：`PARAGRAPH_BREAK` 如果是文字串，有概率被"翻译"或"格式化"。
3. **段落间错位静默**：split 后如果错位但数量恰巧相等，会把 A 段译文贴到 B 段元素上，用户很难发现。

本计划改用 **编号协议** + **校验回退**，提升批量翻译的可靠性；同时与 plan-3 的占位符协议兼容（两者都走 `#N#` 家族但使用不同分隔空间：批量用段首编号，行内用段内占位符）。

## 内容

### 1. 协议格式选型

采用**行首编号** 纯文本格式（而非 JSON），兼顾 LLM 稳定性和成本：

发送给 LLM：

```
<<<1>>>
段落一的内容（可能含 #a# #b# 行内占位符）
<<<2>>>
段落二的内容
<<<3>>>
段落三的内容
```

要求模型回：

```
<<<1>>>
Translation of paragraph 1 (占位符原样保留)
<<<2>>>
Translation of paragraph 2
<<<3>>>
Translation of paragraph 3
```

理由：

- `<<<N>>>` 3 个尖括号 + 数字，在主流训练语料里极罕见，模型几乎不会误翻译。
- 行首独占一行，易于正则 `/^<<<(\d+)>>>\s*$/gm` 解析。
- 比 JSON 稳：JSON 失败时整段无法解析；本协议即使丢了某个 marker，其它段仍可恢复。
- 与 plan-3 的 `#N#` 行内占位符不冲突（编号空间不同，视觉不同）。

### 2. 新增 `src/lib/batch-protocol.ts`

```
export interface BatchItem {
  id: number;           // 1-based
  text: string;         // encodeInline 产物（含 #n# 行内占位符）
}

export function encodeBatch(items: BatchItem[]): string;
export function decodeBatch(raw: string, expected: number): {
  translations: Map<number, string>;   // id → translated text
  missing: number[];
  duplicated: number[];
};
```

- `encodeBatch`：按 `<<<N>>>\n{text}\n` 格式拼接，末尾不加多余空行。
- `decodeBatch`：
  - 按 `/^<<<(\d+)>>>\s*$/gm` 分割，取每个 marker 到下一个 marker 之间的文本作为该 id 的译文。
  - 末段到字符串末尾。
  - 去除每段首尾空白（不去段内空行）。
  - 产出 `translations` Map。
  - `missing` = `[1..expected]` 中不在 Map 的编号。
  - `duplicated` = 出现多次的编号（保留最后一次，但记录到数组供日志）。

### 3. 改造 `translateBatchWithFallback`

替换 `const combinedText = texts.join(PARAGRAPH_BREAK)` 为 `encodeBatch`。替换 `result.text.split(PARAGRAPH_BREAK)` 为 `decodeBatch`。

回退策略（分级）：

1. `missing.length === 0` 且 `translations.size === expected`：最佳路径，直接全部 `applyTranslation`。
2. `missing.length > 0` 且 `missing.length < expected / 2`：部分命中——已命中的先 `applyTranslation`，未命中的元素**单段重试一次**（并发受 `maxConcurrentRequests` 限制）。记录 `console.warn({ missing, duplicated })`。
3. `missing.length >= expected / 2` 或 `translations.size === 0`：视为协议失败——整批全部 fallback 单段翻译（保留现有行为），`console.warn('batch protocol failed, full fallback')`。

### 4. Prompt 强化

`src/lib/api.ts` 的翻译 prompt 里，聚合请求时增加以下条款（非聚合时不注入，避免污染单段翻译效果）：

> "下面输入中每个段落由行首 `<<<N>>>` 标识。你必须：
> 1. 翻译每个段落的内容到 {targetLang}；
> 2. 输出格式与输入完全一致：每段译文前保留同样的 `<<<N>>>` 标记；
> 3. 不要合并段落，不要删减段落，不要新增段落；
> 4. 保留段落中出现的所有 `#N#` 行内占位符，原封不动；
> 5. 不翻译 `<<<N>>>` 或 `#N#` 里的数字和符号。"

使用 `isAggregate` 判断注入与否（该字段在现有代码里已存在）。

### 5. 废弃 `PARAGRAPH_BREAK`

- `src/lib/api.ts` 里的 `PARAGRAPH_BREAK` 常量删除。
- `content/index.ts` 对它的引用替换为新协议。
- 全仓 grep 确认无其他引用（若有，一并迁移）。

### 6. 缓存兼容

- 聚合请求不入缓存（当前实现如此，保持）。
- 单段重试走的是 `translateSingleElement`，走原缓存路径——不受影响。
- 若未来要缓存聚合结果，需按 `text` 哈希缓存，但当前不做。

### 7. 不做的事

- 不上 JSON mode / function calling：不是所有 OpenAI-compatible 提供商都稳定支持。
- 不上流式解析：段落级延迟已可接受，流式反而在 split 时更难处理。

## 影响范围

- `src/lib/batch-protocol.ts`：新增。导出 `BatchItem`、`encodeBatch`、`decodeBatch`，按 `<<<N>>>` 行首编号协议拼接/解析批量翻译文本，返回 `translations / missing / duplicated`。
- `src/lib/api.ts`：删除 `PARAGRAPH_BREAK` 常量与导出；`renderPrompt` 在 `isAggregate` 分支改用新的 `<<<N>>>` 协议指令（保留段间顺序、不动 marker 与 `#N#`、不增删段落、不输出额外文本）。
- `src/entrypoints/content/index.ts`：移除 `PARAGRAPH_BREAK` 导入，新增 `encodeBatch / decodeBatch` 导入。重写 `translateBatchWithFallback`，按 `<<<N>>>` 协议发送、按 id 回填译文，并实现分级回退：协议失败（无任何 marker 命中或 `missing >= ⌈expected/2⌉`）走整批 `translateSingleElement` 并发回退；部分失配则只对未命中元素并发单段重试，同时打印 `missing / duplicated` 警告日志；并发都受 `maxConcurrentRequests` 限制。

## 历史补丁
