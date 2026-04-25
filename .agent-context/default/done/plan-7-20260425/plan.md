# 收尾期代码质量与性能整治

> 状态: 已执行

## 目标

扩展即将发布，需要在收尾阶段清理累积的"语义层信号噪声"——这些问题不会被 TypeScript strict 模式发现，但会拖累发布质量与长期可维护性：

1. **内存泄漏关键点**：`state.elementMap` 用 `Map<HTMLElement, …>` 强引用 DOM 节点；在 SPA 路由跳转、站点动态 `replaceChildren` 等场景下，被翻译过的节点离开 DOM 后仍被 Map 与 IntersectionObserver 持有，长会话单 Tab 持续累积。**特别注意**：`original` / `clean` 模式下 `elementMap` 的 key 是已离开 DOM 的原 `el`，DOM 中实际占据槽位的是 `cloneEl: wrapper`，回收路径必须双向覆盖。
2. **MutationObserver 性能热点**：当前回调对每条 mutation 同步处理，并对每个新增节点立即跑 `querySelectorAll(BLOCK_SELECTOR)` + `getComputedStyle` 兜底。React 类应用一次重渲染会触发数十条 mutation → CPU 抖动。
3. **死代码（≥13 处）堆积**：未使用的导出（类型 / 函数 / 组件）、未消费的字段，混淆语义并增加包体积。
4. **死配置（欺骗用户）**：`streamEnabled`、`fallbackSourceLanguage`、`ModelQueueItem.timeout` 在设置页可编辑，但运行时代码从不消费它们；`api.ts` 走的是 `settings.requestTimeout`，与 UI 上"每模型 timeout"的显式设置语义不一致。
5. **冗余代码**：`sendMessage` 在 `content/index.ts` 与 `popup/main.tsx` 重复定义；`globalPrompt` 默认串在 `storage.ts`（`getDefaultPrompt`）与 `schema.ts` 双处维护。
6. **类型精度**：`BgMessage.payload: unknown` 强迫 `background.ts` 每个 case 都 `as BgXxxPayload` 强转；`lib/api.ts` 响应解析是无类型守卫的链式 `any` 访问。

完成本计划后，整个项目应满足：
- `bun compile` 全绿（基线已满足）。
- 内存与运行性能在长会话与高频 DOM 变化场景下不退化。
- 设置页所有可编辑项都能在运行时被消费。
- 死代码彻底清零（按下方"完成标准"的 ripgrep 命令为准）。

## 内容

### 步骤 1：删除完全未使用的导出与组件（死代码 - 文件/符号层）

**先一次性回归扫描确认无引用**，再删除。

**文件级整体删除**：
- `src/components/popup/model-selector.tsx`：导出的 `PopupModelSelector` 在整个 `src` 下零引用（`popup/main.tsx` 直接使用 `<Select>` 而非该组件）。

**符号级删除**：
- `src/lib/storage.ts`：删除 `subscribeToSettings`、`resetSettings`（全局零引用）。
- `src/lib/cache.ts`：删除 `clearAllCache`（零引用）；`hashKey` 仅模块内被 `getCachedTranslation` / `setCachedTranslation` 调用，去掉 `export` 改为模块私有 `function hashKey(...)`。
- `src/lib/i18n.ts`：删除 `getCurrentUILanguage`（零引用）。
- `src/lib/schema.ts`：删除 `exportFileSchema` 与类型 `ExportFile`（零引用；`storage.importSettings` 实际只 parse `globalSettingsSchema`，不依赖此包装）。
- `src/types/index.ts`：删除 `ContentScriptState`（零引用）与顶层 `ElementState` 接口（`content/index.ts` 内部定义有同名 interface，不冲突；外部零引用）。

**注意**：本步骤**不动** `BgMessageType` 与 `BgMessage`，统一交给步骤 6 一次性改写为判别联合（避免中间态）。

**完成标准**：
- `bun compile` 全绿。
- 在项目根目录执行：
  ```
  rg -n 'subscribeToSettings|resetSettings|clearAllCache|getCurrentUILanguage|exportFileSchema|\bExportFile\b|ContentScriptState|PopupModelSelector' src
  ```
  零命中。

### 步骤 2：移除死配置字段及其 UI / i18n 键

**判定依据**（已 ripgrep 确认）：
- `GlobalSettings.streamEnabled`：仅 `general-settings.tsx` 渲染开关；`api.ts` / `background.ts` 无任何消费。
- `GlobalSettings.fallbackSourceLanguage`：仅 `language-settings.tsx` 渲染选择器；无任何消费方。
- `ModelQueueItem.timeout`：`model-queue.tsx` 可编辑、`popup/main.tsx` `unshift` 时填值；`api.ts:185` 实际使用的是 `settings.requestTimeout`，从未读取 queue item 的 timeout。

**变更**：

a. `src/types/index.ts`：从 `GlobalSettings` 删除 `streamEnabled`、`fallbackSourceLanguage`；从 `ModelQueueItem` 删除 `timeout` 字段。

b. `src/lib/schema.ts`：同步删除 `streamEnabled`、`fallbackSourceLanguage`、`modelQueueItemSchema.timeout` 三处 zod 校验。
   - **风险确认**：`globalSettingsSchema` 未启用 `.strict()`（已确认），旧用户已存的 settings 含这三字段会被 zod 默默忽略，不会校验失败。

c. `src/lib/storage.ts`：从 `DEFAULT_SETTINGS` 删除上述字段；`modelQueue` 默认值移除 `timeout: 30000`。

d. `src/components/options/general-settings.tsx`：删除整段 `streamEnabled` 开关块（包含 `{t('label_stream_enabled')}` / `{t('desc_stream_enabled')}` 块）。

e. `src/components/options/language-settings.tsx`：删除 `fallbackSourceLanguage` Select 块（包含 `{t('label_fallback_source_language')}`）。

f. `src/components/options/model-queue.tsx`：删除 `updateQueueTimeout` 函数与 timeout `<input>` 块（保留行号、enabled、上下移、删除按钮）。

g. `src/entrypoints/popup/main.tsx`：`handleModelChange` 中 `newQueue.unshift({...})` 不再赋 `timeout: 30000`。

h. **i18n 键清理**（防止死键累积）：
   - 实施前先 `rg -n 'label_stream_enabled|desc_stream_enabled|label_fallback_source_language' src wxt.config.ts public/_locales` 锁定使用范围。
   - 删除 `public/_locales/zh_CN/messages.json` 与 `public/_locales/en/messages.json` 中的 `label_stream_enabled`、`desc_stream_enabled`、`label_fallback_source_language` 三个键。
   - **注意 `label_timeout`**：`model-queue.tsx` 与 `language-settings.tsx`（detector 块的 timeout 输入框）都使用此键。本步骤删除 model-queue 中的 timeout 输入后，`label_timeout` 键仍被 detector 块使用 → **不删除该键**。

**完成标准**：
- 编译绿；options 三个 Tab 中以上控件全部消失。
- `rg -n 'streamEnabled|fallbackSourceLanguage' src` 零命中。
- `rg -n '\.timeout\b' src/lib/api.ts src/entrypoints/background.ts` 仅命中 `provider.timeout` / `requestTimeout` 等合法字段，无 `queueItem.timeout` 残留。

### 步骤 3：抽离重复代码与冗余字段

a. **统一消息壳**：新增 `src/lib/messaging.ts`，导出 `sendBgMessage<T>(message): Promise<T>`。
   - **签名（精确给出，避免 R-3 类型 narrow 失败）**：先在步骤 6 完成 `BgMessage` 判别联合后再实施本子项；签名为：
     ```ts
     import type { BgMessage, TranslationResponse } from '@/types';

     export function sendBgMessage<T = unknown>(message: BgMessage): Promise<T> {
       return new Promise((resolve, reject) => {
         chrome.runtime.sendMessage(message, (response) => {
           if (chrome.runtime.lastError) {
             reject(new Error(chrome.runtime.lastError.message));
           } else if (response?.success) {
             resolve(response.data as T);
           } else {
             reject(new Error(response?.error ?? 'Unknown error'));
           }
         });
       });
     }
     ```
   - **调用样例（强制 type narrow）**：调用方使用 `as const` 或 `satisfies`，避免对象字面量的 `type` 字段被推断为 `string`：
     ```ts
     // content/index.ts
     await sendBgMessage<{ lang: string | null }>({
       type: 'DETECT_LANG',
       payload: { text },
     });
     await sendBgMessage<TranslationResponse>({
       type: 'TRANSLATE',
       payload: { text, sourceLang, targetLang, isAggregate: true },
     });
     ```
     由于 `sendBgMessage` 的参数类型已声明为 `BgMessage`（步骤 6 改造后是判别联合），TS 会要求字面量精确匹配某一分支，自动 narrow 不会失败。**实施时若编译报错（TS 推断 `type: string`），改用 `satisfies BgMessage`**。
   - `src/entrypoints/content/index.ts:66-78` 与 `src/entrypoints/popup/main.tsx:26-38` 删除本地 `sendMessage`，改 import `sendBgMessage`。
   - **统一 fallback 错误信息**：抛 `new Error(response?.error ?? 'Unknown error')`（去掉 popup 路径里的 `t('error_unknown')`，i18n 包装由调用方 catch 处理；`popup/main.tsx:152` 已有 `err instanceof Error ? err.message : t('error_translation_failed')` 兜底，UX 不退化）。

b. **统一默认 prompt 来源**：新建 `src/lib/prompts.ts`，仅导出 `export const DEFAULT_GLOBAL_PROMPT = '...'`（值取自当前 `getDefaultPrompt` 返回的字符串）。
   - `src/lib/storage.ts`：删除 `getDefaultPrompt` 整个函数；`DEFAULT_SETTINGS.globalPrompt` 改为 `DEFAULT_GLOBAL_PROMPT`。
   - `src/lib/schema.ts`：`globalPrompt: z.string().min(1).default(...)` 的字面量改为 `.default(DEFAULT_GLOBAL_PROMPT)`。
   - 双处 import 同一个常量，消除字符串重复维护。
   - **循环依赖检查**：`prompts.ts` 不 import 任何项目文件，仅导出常量；`schema.ts` / `storage.ts` import `prompts.ts`——单向依赖，无循环。

c. **简化 `BlockCandidate`**：当前 `collectBlocks` 唯一调用方（`content/index.ts:86`）只用 `b.el`，`depth` / `hasInlineCode` / `text` 字段构造但零消费。
   - `src/lib/block-detect.ts`：将 `collectBlocks` 返回类型从 `BlockCandidate[]` 改为 `HTMLElement[]`；删除 `BlockCandidate` 接口与 `getDomDepth` 函数；export 仅保留 `BLOCK_SELECTOR`、`isTranslatableBlock`、`collectBlocks`。
   - `src/entrypoints/content/index.ts:86`：`getTranslatableElements` 改为 `return collectBlocks(root)`，删除 `.map((b) => b.el)`。

d. **删除 `ElementState.fragments` 字段**：在 `content/index.ts` 的 4 个 `applyXxxStyle` 中保存 `fragments` 到 `elementMap`，但 `restoreElement` / `restoreAll` / 切换样式路径都不读取该字段（apply* 在调用时已经把 fragments 传入 `decodeInline` 消费完毕）。
   - `src/entrypoints/content/index.ts`：从 `interface ElementState`（行 11-17）删除 `fragments?: DocumentFragment[]`；4 个 apply* 函数中 `state.elementMap.set(el, { ..., fragments })` 删掉 `fragments` 字段。
   - **保留 `cloneEl`**：`restoreElement` 的 `case 'original' | 'clean'` 分支与步骤 4 的清理路径都依赖该字段，必须保留。

**完成标准**：
- 编译绿；新文件 `src/lib/messaging.ts`、`src/lib/prompts.ts` 创建。
- `rg -n 'function sendMessage\b' src` 零命中（`sendBgMessage` 是新名字，不会命中此正则）。
- `rg -n 'getDefaultPrompt|getDomDepth|BlockCandidate' src` 零命中。

### 步骤 4：修复内存泄漏 — `state.elementMap` 强引用 DOM 节点

**问题量化**：
- `state.elementMap: Map<HTMLElement, ElementState>` 在 `applyXxxStyle` 中 set，在 `restoreElement` / `restoreAll` 中 delete。
- 但当站点自身（如 React SPA）调用 `parent.removeChild(el)` / `parent.replaceChildren(...)` 删除已翻译节点时，没有任何 hook 把对应 entry 从 Map 删除 → entry 保留，HTMLElement 引用保留，无法 GC。

**约束**：
- `restoreAll` 仍需要遍历 `elementMap` 来恢复样式 → 不能直接换 `WeakMap`。
- 解决方案：**保持 Map，但补一条"节点离场即清理"的主动回收路径**。
- **关键约束（Review R-1）**：在 `original` / `clean` 模式下，`elementMap` 的 key 是**原 `el`**（已离开 DOM），DOM 中实际占据槽位的是 `state.elementMap.get(el).cloneEl`（即 wrapper）。当站点把 wrapper 从 DOM 移除时，`removedNodes` 包含的是 wrapper 而非原 `el`，单纯 `root.contains(key)` 无法命中。回收路径必须同时检查 `cloneEl`。

**变更**：

a. 在 `src/entrypoints/content/index.ts` 新增工具函数（精确给出，避免实施时遗漏 cloneEl 双向检查）：
   ```ts
   function cleanupRemovedSubtree(root: HTMLElement): void {
     // 在 detached subtree 上，DOM API 的 `contains` 仍然有效（在 disconnected 节点
     // 内部也能正确判定父子关系）。这里同时检查 elementMap 的 key 与 cloneEl：
     //  - bilingual / underline 模式：key（原 el）仍在 DOM 树中，命中 key 路径。
     //  - original / clean 模式：key（原 el）已离开 DOM，DOM 槽位由 cloneEl 占据，
     //    站点移除的 root 包含的是 cloneEl，命中 cloneEl 路径。
     const victims: HTMLElement[] = [];
     state.elementMap.forEach((entry, key) => {
       const inByKey = key === root || root.contains(key);
       const inByClone =
         entry.cloneEl !== undefined &&
         (entry.cloneEl === root || root.contains(entry.cloneEl));
       if (inByKey || inByClone) victims.push(key);
     });
     for (const el of victims) {
       state.elementMap.delete(el);
       state.observer?.unobserve(el);
       state.pendingAggregateElements.delete(el);
     }
   }
   ```
   - 复杂度：每次清理 O(elementMap.size)；mutation 节流后频率 ≤ 5/s，可接受。

b. 在 `setupMutationObserver` 回调里同步处理 `removedNodes`（步骤 5 节流时仍**实时执行**清理路径，不入节流批）：
   ```ts
   for (const m of mutations) {
     m.removedNodes.forEach((node) => {
       if (node instanceof HTMLElement) cleanupRemovedSubtree(node);
     });
   }
   ```

c. 加固 `stopTranslation`：
   ```ts
   function stopTranslation(): void {
     state.observer?.disconnect();
     state.observer = null;
     restoreAll();
     state.pendingAggregateElements.clear();
     if (state.aggregateDebounceTimer !== null) {
       window.clearTimeout(state.aggregateDebounceTimer);
       state.aggregateDebounceTimer = null;
     }
   }
   ```

d. `restoreAll` 当前实现 `forEach` 内部 `delete` 当前 key 后又 `clear()`，行为安全但意图模糊。重写为：
   ```ts
   function restoreAll(): void {
     const keys = Array.from(state.elementMap.keys());
     for (const el of keys) restoreElement(el);
     // restoreElement 已逐个 delete；最终 clear 是冗余但无副作用，作防御保留。
     state.elementMap.clear();
   }
   ```

**完成标准**：
- 编译绿。
- 手测：在 React SPA（推荐 https://react.dev）启用翻译 → 在 mutationObserver 节点移除路径打日志（实施时临时加 `console.debug` 验证后删除）确认 `cleanupRemovedSubtree` 在两种模式（`original` 与 `bilingual`）下都被触发。
- DevTools Memory Snapshot：在 SPA 上"启用 → 翻译多段 → 切换路由 5 次 → 强制 GC → snapshot"，HTMLElement count 不持续增长。

### 步骤 5：MutationObserver 节流 + 批处理

**问题量化**：当前 `setupMutationObserver` 回调对每条 mutation 同步执行 `getTranslatableElements(node)`（= `collectBlocks` = `querySelectorAll` + `isTranslatableBlock` 过滤，含 `getComputedStyle` 兜底）。在 GitHub PR / Twitter / React 类应用上，一次重渲染可触发 20-50 条 mutation，每条都要走完上述流程 → 主线程占用过高。

**变更**（仅作用于 `src/entrypoints/content/index.ts` 内部）：

a. 在文件顶部模块级新增（不放进 `state` 对象，避免 `restoreAll` 误清）：
   ```ts
   let mutationFlushTimer: number | null = null;
   const pendingMutationNodes: Set<HTMLElement> = new Set();
   const MUTATION_FLUSH_DELAY_MS = 200;
   ```

b. 重写 `setupMutationObserver` 回调：
   ```ts
   const mutationObserver = new MutationObserver((mutations) => {
     if (!state.isActive || !state.observer) return;

     // 移除路径：实时执行（GC 不能等节流，泄漏窗口越短越好）
     for (const m of mutations) {
       m.removedNodes.forEach((n) => {
         if (n instanceof HTMLElement) cleanupRemovedSubtree(n);
       });
     }

     // 添加路径：仅入队 + 调度 flush
     let added = false;
     for (const m of mutations) {
       m.addedNodes.forEach((n) => {
         if (n instanceof HTMLElement && n.isConnected) {
           pendingMutationNodes.add(n);
           added = true;
         }
       });
     }
     if (added) scheduleMutationFlush();
   });
   ```

c. 新增 `scheduleMutationFlush` / `flushMutationQueue`：
   ```ts
   function scheduleMutationFlush(): void {
     if (mutationFlushTimer !== null) return;
     mutationFlushTimer = window.setTimeout(() => {
       mutationFlushTimer = null;
       flushMutationQueue();
     }, MUTATION_FLUSH_DELAY_MS);
   }

   function flushMutationQueue(): void {
     if (!state.isActive || !state.observer) {
       pendingMutationNodes.clear();
       return;
     }
     const nodes = Array.from(pendingMutationNodes);
     pendingMutationNodes.clear();

     // 祖先去重：若 A 包含 B 且都在集合里，仅扫描 A
     // 复杂度 O(n²)；假设 nodes.length < 500（高频应用单次 flush 实测远低于此）。
     // 若日后量级超出，改为 sort by depth + Set 标记。
     const roots = nodes.filter(
       (n) => !nodes.some((m) => m !== n && m.contains(n))
     );

     const newElements: HTMLElement[] = [];
     for (const root of roots) {
       if (!root.isConnected) continue;
       newElements.push(...getTranslatableElements(root));
     }
     for (const el of newElements) {
       if (!state.elementMap.has(el)) {
         state.observer.observe(el);
       }
     }
   }
   ```

d. `stopTranslation` 中追加：
   ```ts
   pendingMutationNodes.clear();
   if (mutationFlushTimer !== null) {
     window.clearTimeout(mutationFlushTimer);
     mutationFlushTimer = null;
   }
   ```

**完成标准**：
- 编译绿。
- 手测：在 https://github.com 个人首页（高频时间线刷新）启用翻译 → DevTools Performance 录制 5s → MutationObserver 回调每 200ms 内只调用 `flushMutationQueue` 一次（节流生效）。

### 步骤 6：精炼 `BgMessage` 类型为判别联合（含 `BgMessageType` 删除）

**当前**：
```ts
export type BgMessageType = 'TRANSLATE' | 'DETECT_LANG' | 'CLEAR_CACHE' | 'PING';
export interface BgMessage { type: BgMessageType; payload?: unknown; }
```
导致 `background.ts` 每个 case 都 `as BgTranslatePayload` / `as BgDetectLangPayload` 强转，TS 无类型保证。

**变更**：

a. `src/types/index.ts`：删除独立的 `BgMessageType` 类型；把 `BgMessage` 改为判别联合：
   ```ts
   export type BgMessage =
     | { type: 'TRANSLATE'; payload: BgTranslatePayload }
     | { type: 'DETECT_LANG'; payload: BgDetectLangPayload }
     | { type: 'CLEAR_CACHE' }
     | { type: 'PING' };
   ```
   保留 `BgTranslatePayload` / `BgDetectLangPayload` 类型不变。

b. `src/entrypoints/background.ts`：
   - 入参类型签名 `(message: BgMessage, _sender, sendResponse)` 不变。
   - 每个 `case` 分支里直接访问 `message.payload`（判别联合 + switch case 自动 narrow），删除 `as BgTranslatePayload` / `as BgDetectLangPayload`。

c. `src/lib/messaging.ts`（步骤 3 已建）：参数类型与上面声明保持一致；调用方按步骤 3a 给出的样例使用对象字面量调用，TS 自动 narrow。

   **若实施时遇到 TS 编译失败**（典型："Argument of type '{ type: string; payload: ... }' is not assignable to parameter of type 'BgMessage'"），原因是 TS 把对象字面量 `type` 字段宽化为 `string`。修复策略（**实施时按需选用**）：
   1. 在调用处加 `satisfies BgMessage`：`sendBgMessage<T>({ type: 'TRANSLATE', payload: {...} } satisfies BgMessage)`（保持对象字面量类型同时通过校验）。
   2. 或对 `type` 用 `as const`：`{ type: 'TRANSLATE' as const, payload: {...} }`。
   3. **首选方案 1**（语义最清晰），**回退方案 2**。

**完成标准**：
- 编译绿。
- `rg -n 'as BgTranslatePayload|as BgDetectLangPayload' src` 零命中。
- `rg -n '\bBgMessageType\b' src` 零命中。

### 步骤 7：API 响应解析的类型保护

**当前**（`src/lib/api.ts:118-133`）：
```ts
const data = await response.json();
const translatedText =
  data.choices?.[0]?.message?.content?.trim() ||
  data.choices?.[0]?.text?.trim() || ...;
const detectedLang = data.detected_language || data.source_language;
```
`data` 是隐式 `any`，多分支链式访问无类型守卫。

**变更**：

a. 在 `src/lib/api.ts` 顶部新增（紧贴 `interface ProviderModel` 之后）：
   ```ts
   interface OpenAIChatResponse {
     choices?: Array<{
       message?: { content?: string };
       text?: string;
     }>;
     response?: string;
     output?: string;
     result?: string;
     detected_language?: string;
     source_language?: string;
   }

   // 接受 LLM 返回空字符串时短路到下一个 fallback 的现有行为（与原代码一致），
   // 全部 fallback 都为空时返回 null，由上层统一抛 'Empty translation response'。
   function extractTranslatedText(data: OpenAIChatResponse): string | null {
     return (
       data.choices?.[0]?.message?.content?.trim() ||
       data.choices?.[0]?.text?.trim() ||
       data.response?.trim() ||
       data.output?.trim() ||
       data.result?.trim() ||
       null
     );
   }
   ```

b. `callProvider` 内：
   ```ts
   const data = (await response.json()) as OpenAIChatResponse;
   const translatedText = extractTranslatedText(data);
   if (!translatedText) {
     throw new Error('Empty translation response');
   }
   const detectedLang = data.detected_language ?? data.source_language;
   return { text: translatedText, detectedLang };
   ```
   不改变现有兜底语义，仅给类型化壳。

**完成标准**：
- 编译绿。
- `src/lib/api.ts` 内不再出现裸 `any` 链式访问。

### 步骤 8：手测 + 编译双保险

**自动化校验**：
1. `bun compile` 全绿（必过）。
2. `bun build` 成功生成 chrome 产物。产物大小变化作为参考指标（不作为硬性完成标准）：删除死代码 / 死键应略减，新增 `messaging.ts` / `prompts.ts` 略增；最终允许 ±2% baseline 浮动，超出时调查原因。

**手测路径**（在 Brave / Chrome 加载 `dist/chrome-mv3` 目录后）：
3. **死配置消失**：进入扩展设置页：
   - "通用"Tab：确认 `streamEnabled` 开关已消失。
   - "语言"Tab：确认 `fallbackSourceLanguage` Select 已消失。
   - "模型队列"Tab：每行不再有 timeout 输入框。
   - 切换 UI 语言（中→英→中），所有控件渲染正常，控制台无 i18n 缺键告警。
4. **核心翻译路径**：
   - 在 https://react.dev 启用翻译 → 滚动 1 屏 → 切换到另一文档页（SPA 路由切换）→ 切回 → 翻译可用、bilingual / underline / clean / original 四种样式切换无残留 DOM 痕迹。
   - DevTools Console 无 error / warn（除已知的"Translation failed: …"业务错误）。
5. **MutationObserver 性能**：
   - 在 https://github.com 个人首页启用翻译 → DevTools Performance 录制 5s → 检查 `flushMutationQueue` 调用聚集为每 200ms 一次（节流生效）。
6. **内存泄漏验证（含 R-1 双模式覆盖）**：
   - 在 https://react.dev（`original` 模式默认）启用翻译 → 翻译多段 → 切换路由若干次 → DevTools Memory → Take heap snapshot → 强制 GC → Take heap snapshot → HTMLElement count 不持续增长。
   - 切换到 `bilingual` 模式重复一次：验证 `cleanupRemovedSubtree` 双路径（key + cloneEl）都生效。
7. **popup**：测试翻译可用、history 仍正常累计；切换 Provider/Model 仍能保存到 modelQueue（`timeout` 字段移除后 `unshift` 行不再传 timeout）。

**完成标准**：以上 7 条全部通过，无 console error；产物大小 ±2% 内可接受。

## 影响范围

### 新增
- `src/lib/messaging.ts`：统一的 background 消息壳 `sendBgMessage<T>(BgMessage)`，替换 content/popup 中的本地 `sendMessage`。
- `src/lib/prompts.ts`：默认全局 prompt 单一来源 `DEFAULT_GLOBAL_PROMPT`，由 `storage.ts` 与 `schema.ts` 共同 import。

### 删除
- `src/components/popup/model-selector.tsx`：未被引用的 `PopupModelSelector` 组件整体删除。

### 修改
- `src/types/index.ts`：删除 `ContentScriptState`、`ElementState`；从 `ModelQueueItem` 删 `timeout`；从 `GlobalSettings` 删 `streamEnabled` / `fallbackSourceLanguage`；删 `BgMessageType`，把 `BgMessage` 改为判别联合（`TRANSLATE` / `DETECT_LANG` / `CLEAR_CACHE` / `PING`）。
- `src/lib/schema.ts`：同步移除 `streamEnabled` / `fallbackSourceLanguage` / `modelQueueItem.timeout` 三处 zod 字段；`globalPrompt` 默认值改用 `DEFAULT_GLOBAL_PROMPT`；删 `exportFileSchema` / `ExportFile`。
- `src/lib/storage.ts`：删 `getDefaultPrompt` / `subscribeToSettings` / `resetSettings`；`DEFAULT_SETTINGS` 移除三个死字段并改用 `DEFAULT_GLOBAL_PROMPT`；`modelQueue` 默认项不再带 `timeout`。
- `src/lib/cache.ts`：`hashKey` 改为模块私有；删 `clearAllCache`。
- `src/lib/i18n.ts`：删 `getCurrentUILanguage`。
- `src/lib/block-detect.ts`：`collectBlocks` 返回类型由 `BlockCandidate[]` 改为 `HTMLElement[]`；删 `BlockCandidate` 接口与 `getDomDepth`。
- `src/lib/api.ts`：新增 `OpenAIChatResponse` 类型与 `extractTranslatedText` 类型守卫，去除 `data` 上的隐式 any 链式访问。
- `src/components/options/general-settings.tsx`：移除 `streamEnabled` 开关块。
- `src/components/options/language-settings.tsx`：移除 `fallbackSourceLanguage` Select 块。
- `src/components/options/model-queue.tsx`：删 `updateQueueTimeout` 函数与 timeout `<input>` 块，保留行号、enabled、上下移、删除按钮。
- `src/components/options/provider-settings.tsx`：扫描 `modelQueue` 时新增 queue item 不再赋 `timeout: 30000`。
- `src/entrypoints/popup/main.tsx`：删本地 `sendMessage`，改用 `sendBgMessage`；`handleModelChange` 中 `unshift` 不再带 `timeout`。
- `src/entrypoints/content/index.ts`：
  - 删本地 `sendMessage`，全部改用 `sendBgMessage`；
  - 从 `ElementState` 删 `fragments` 字段，4 个 `applyXxxStyle` 不再保存 `fragments`；
  - `getTranslatableElements` 不再 `.map((b) => b.el)`；
  - `restoreAll` 改为先快照 keys 再遍历 `restoreElement`；
  - 新增 `cleanupRemovedSubtree`：节点离场时同时按 `key` 与 `cloneEl` 双向命中，主动清 `elementMap` / `observer.unobserve` / `pendingAggregateElements`，覆盖 `original` / `clean` 模式下 wrapper 占据 DOM 槽位的场景；
  - 新增 `scheduleMutationFlush` / `flushMutationQueue` + 模块级 `pendingMutationNodes` / `mutationFlushTimer` / `MUTATION_FLUSH_DELAY_MS = 200`；`setupMutationObserver` 改为：移除路径实时执行 `cleanupRemovedSubtree`；新增路径仅入队 + 200ms 节流后批处理（含祖先去重 + `isConnected` 过滤）；
  - `stopTranslation` 加固：清 `pendingAggregateElements` / 取消 `aggregateDebounceTimer` / 清 `pendingMutationNodes` / 取消 `mutationFlushTimer`。
- `src/entrypoints/background.ts`：消息处理利用 `BgMessage` 判别联合自动 narrow，删除 `as BgTranslatePayload` / `as BgDetectLangPayload` 强转。
- `public/_locales/zh_CN/messages.json` / `public/_locales/en/messages.json`：删除 `label_stream_enabled` / `desc_stream_enabled` / `label_fallback_source_language` 三个死键；保留 `label_timeout`（仍被 detector 块使用）。

## 历史补丁
