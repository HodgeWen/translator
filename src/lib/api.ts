import type { ProviderConfig, TranslationRequest, TranslationResponse, LangCode, GlobalSettings } from '@/types';
import { getSettings } from './storage';
import { getCachedTranslation, setCachedTranslation } from './cache';
import { DEFAULT_GLOBAL_PROMPT } from './prompts';

const inflightRequests = new Map<string, Promise<TranslationResponse>>();

function inflightKey(
  text: string,
  sourceLang: string | undefined,
  targetLang: string,
  extraPrompt: string | undefined
): string {
  return `${text}::${sourceLang ?? 'auto'}::${targetLang}::${extraPrompt ?? ''}`;
}

// 8 字节 prompt 摘要：用作缓存盐值。同 prompt 共享缓存；
// 用户改 globalPrompt 后旧缓存自然失效（key 不再命中），TTL 兜底回收。
async function shortPromptHash(prompt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prompt));
  return Array.from(new Uint8Array(buf, 0, 4))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildTranslationCachePartition(globalPrompt: string, extraPrompt?: string): Promise<string> {
  if (!extraPrompt) return shortPromptHash(globalPrompt);
  return shortPromptHash(JSON.stringify([globalPrompt, extraPrompt]));
}

// 鉴权类错误（401/403）应短路当前 provider 的所有剩余 model；429 限流亦同。
// 其它错误（timeout / 5xx / 网络抖动）保持原降级行为继续 fallback。
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

function isProviderFatal(err: unknown): boolean {
  if (!(err instanceof HttpError)) return false;
  return err.status === 401 || err.status === 403 || err.status === 429;
}

interface ProviderModel {
  provider: ProviderConfig;
  model: { id: string; name: string };
}

interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string };
    delta?: { content?: string };
    text?: string;
  }>;
  response?: string;
  output?: string;
  result?: string;
  detected_language?: string;
  source_language?: string;
  usage?: OpenAIUsage;
}

// 现有兜底语义：单个 fallback 字段为空字符串时短路到下一个；全部为空时返回 null，
// 由调用方统一抛 'Empty translation response'。
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

function buildUrl(baseURL: string, query: Record<string, string>): string {
  const url = new URL(baseURL);
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

const PLACEHOLDER_RULE = `\n\nThe text may contain numeric placeholders in the form of #1#, #2#, #3# ... (single "#" on each side). You MUST preserve every placeholder exactly as-is in your output: do not add, remove, modify, reorder, or translate any of them. Treat them as opaque tokens that stand in for inline HTML fragments.`;

function renderPrompt(
  template: string,
  targetLang: string,
  sourceLang: string | undefined,
  isAggregate: boolean,
  hasPlaceholders: boolean,
  extraPrompt?: string
): string {
  const sourceLangLabel = sourceLang || 'auto-detected language';
  let prompt = template
    .replace(/\{\{sourceLang\}\}/g, sourceLangLabel)
    .replace(/\{\{targetLang\}\}/g, targetLang);

  if (hasPlaceholders) {
    prompt += PLACEHOLDER_RULE;
  }

  if (isAggregate) {
    // 聚合分隔符规则。条目 5 仅在批次内确实存在 #N# 占位符时才追加，
    // 避免在所有段落都是纯文本时让模型困惑于一条不存在的"占位符"约束。
    prompt += `\n\nThe input contains multiple paragraphs. Each paragraph is preceded by a marker of the form "<<<N>>>" on its own line, where N is a positive integer (1, 2, 3, ...). You MUST follow this protocol exactly:
1. Translate the content of each paragraph into ${targetLang}.
2. Output every translated paragraph preceded by the SAME "<<<N>>>" marker on its own line, in the SAME order as the input.
3. Do not merge paragraphs, do not skip paragraphs, and do not introduce extra paragraphs or markers that were not in the input.
4. Treat "<<<N>>>" as opaque tokens: never translate, localize, reformat, or alter the digits/symbols inside them.`;
    if (hasPlaceholders) {
      prompt += `\n5. Preserve every "#N#" inline placeholder inside paragraphs verbatim, exactly as instructed above.
6. Do not add any commentary, headings, or text outside the marker/paragraph structure.`;
    } else {
      prompt += `\n5. Do not add any commentary, headings, or text outside the marker/paragraph structure.`;
    }
  }

  if (extraPrompt) {
    prompt += `\n\n${extraPrompt}`;
  }

  return prompt;
}

function buildBody(
  modelId: string,
  text: string,
  targetLang: string,
  sourceLang: string | undefined,
  extraBody: Record<string, unknown>,
  promptTemplate: string,
  isAggregate: boolean,
  hasPlaceholders: boolean,
  provider: ProviderConfig,
  extraPrompt?: string
): Record<string, unknown> {
  const systemPrompt = renderPrompt(promptTemplate, targetLang, sourceLang, isAggregate, hasPlaceholders, extraPrompt);

  // 装配顺序：基础字段 → extraBody → 独立采样字段（独立字段后置覆盖 extraBody 中的同名键）
  const body: Record<string, unknown> = {
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    ...extraBody,
  };

  // temperature 仅在用户显式配置时下发：reasoning 模型（OpenAI o1/o3、DeepSeek-R1 等）
  // 不接受 temperature 参数，强制写入会导致整个 fallback 队列同样失败。
  if (provider.temperature !== undefined) body.temperature = provider.temperature;
  if (provider.topP !== undefined) body.top_p = provider.topP;
  if (provider.maxTokens !== undefined) body.max_tokens = provider.maxTokens;
  if (provider.stream === true) body.stream = true;

  return body;
}

function buildHeaders(provider: ProviderConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: provider.stream === true ? 'text/event-stream' : 'application/json',
    ...provider.headers,
  };

  // Auto-inject Authorization if apiKey exists and user hasn't configured one
  if (provider.apiKey && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }

  return headers;
}

function findSSEBoundary(buffer: string): { index: number; length: number } | null {
  const lf = buffer.indexOf('\n\n');
  const crlf = buffer.indexOf('\r\n\r\n');
  if (lf === -1 && crlf === -1) return null;
  if (lf === -1) return { index: crlf, length: 4 };
  if (crlf === -1) return { index: lf, length: 2 };
  return lf < crlf ? { index: lf, length: 2 } : { index: crlf, length: 4 };
}

// SSE 流式累积。注意：此处复用调用方传入的 timeout signal 作为"端到端"总超时；
// 这是 YAGNI 决策——长文本若触发超时，请在通用设置中调高 requestTimeout。
async function consumeOpenAIStream(
  response: Response,
  signal: AbortSignal
): Promise<{ text: string; detectedLang?: string }> {
  if (!response.body) {
    throw new Error('Empty translation response');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let acc = '';
  let detectedLang: string | undefined;
  let done = false;

  const onAbort = () => {
    reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', onAbort);

  const processEvent = (rawEvent: string): void => {
    const lines = rawEvent.split(/\r?\n/);
    for (const line of lines) {
      if (!line || !line.startsWith('data:')) continue;
      const dataStr = line.slice(5).trim();
      if (dataStr === '[DONE]') {
        done = true;
        break;
      }
      try {
        const json = JSON.parse(dataStr) as OpenAIChatResponse;
        const deltaContent = json.choices?.[0]?.delta?.content;
        if (typeof deltaContent === 'string') acc += deltaContent;
        const lang = json.detected_language ?? json.source_language;
        if (lang && !detectedLang) detectedLang = lang;
      } catch {
        // JSON 解析失败的 chunk（多见于事件分隔不规则的服务端）。
        // 丢弃无法解析的 chunk，避免将损坏的 JSON 片段混入翻译结果。
      }
    }
  };

  try {
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) {
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let boundary = findSSEBoundary(buffer);
      while (boundary) {
        const rawEvent = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);
        processEvent(rawEvent);
        if (done) break;
        boundary = findSSEBoundary(buffer);
      }
    }

    const trailing = buffer.trim();
    if (!done && trailing) {
      processEvent(trailing);
    }
  } finally {
    signal.removeEventListener('abort', onAbort);
    try {
      reader.releaseLock();
    } catch {
      // 已 cancel 时 releaseLock 可能 throw，忽略
    }
  }

  if (signal.aborted) {
    throw new Error('Request aborted');
  }

  const trimmed = acc.trim();
  if (!trimmed) {
    throw new Error('Empty translation response');
  }
  return { text: trimmed, detectedLang };
}

async function callProvider(
  providerModel: ProviderModel,
  text: string,
  targetLang: string,
  sourceLang: string | undefined,
  promptTemplate: string,
  timeout: number,
  isAggregate: boolean,
  hasPlaceholders: boolean,
  extraPrompt?: string
): Promise<{ text: string; detectedLang?: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const { provider, model } = providerModel;

  const url = buildUrl(provider.baseURL, provider.query);
  const body = buildBody(model.id, text, targetLang, sourceLang, provider.body, promptTemplate, isAggregate, hasPlaceholders, provider, extraPrompt);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(provider),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new HttpError(response.status, `HTTP ${response.status}: ${errorText}`);
    }

    if (provider.stream === true) {
      return await consumeOpenAIStream(response, controller.signal);
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const translatedText = extractTranslatedText(data);
    if (!translatedText) {
      throw new Error('Empty translation response');
    }
    const detectedLang = data.detected_language ?? data.source_language;
    const usage = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        }
      : undefined;

    return { text: translatedText, detectedLang, usage };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Fallback Queue ──────────────────────────────────────────────────────
// 顺序：选中的模型 → 同 provider 剩余模型（按配置顺序）→ 其他 provider 所有模型（按 provider 配置顺序）

function buildFallbackQueue(settings: GlobalSettings): ProviderModel[] {
  const { providers, selectedProviderId, selectedModelId } = settings;
  const queue: ProviderModel[] = [];
  const seen = new Set<string>();

  const addModel = (provider: ProviderConfig, model: { id: string; name: string }) => {
    const key = `${provider.id}:${model.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    queue.push({ provider, model });
  };

  // 1. 选中的模型
  const selectedProvider = providers.find(p => p.id === selectedProviderId);
  if (selectedProvider) {
    const selectedModel = selectedProvider.models.find(m => m.id === selectedModelId);
    if (selectedModel) {
      addModel(selectedProvider, selectedModel);
    }
    // 2. 同 provider 剩余模型
    for (const model of selectedProvider.models) {
      addModel(selectedProvider, model);
    }
  }

  // 3. 其他 provider 所有模型
  for (const provider of providers) {
    for (const model of provider.models) {
      addModel(provider, model);
    }
  }

  return queue;
}

// ─── Load Balance (Weighted Round-Robin) ─────────────────────────────────
// 模块级计数器：跟踪各 provider 已分配次数，实现加权轮询。
// Service Worker 存活期间保持状态；重启后重置（可接受，RR 本身无持久化要求）。

const lbCounter = new Map<string, number>();

function pickLoadBalanceQueue(settings: GlobalSettings): ProviderModel[] {
  const { loadBalance, providers } = settings;
  const activeEntries = loadBalance.providers.filter(lbp => {
    return providers.some(p => p.id === lbp.providerId && p.models.length > 0);
  });

  if (activeEntries.length === 0) return [];

  // 清理已删除 provider 残留在 lbCounter 的计数，防止 SW 长期存活时缓慢泄漏。
  const activeIds = new Set(activeEntries.map(e => e.providerId));
  for (const id of lbCounter.keys()) {
    if (!activeIds.has(id)) lbCounter.delete(id);
  }

  // 加权轮询：选 counter/weight 最小的 provider
  let minRatio = Infinity;
  let pickedIdx = 0;
  for (let i = 0; i < activeEntries.length; i++) {
    const entry = activeEntries[i];
    const count = lbCounter.get(entry.providerId) ?? 0;
    const ratio = count / entry.weight;
    if (ratio < minRatio) {
      minRatio = ratio;
      pickedIdx = i;
    }
  }

  const picked = activeEntries[pickedIdx];
  lbCounter.set(picked.providerId, (lbCounter.get(picked.providerId) ?? 0) + 1);

  // 构建单个 provider 的模型队列：选中模型优先 → 其余按配置顺序
  const buildProviderModels = (
    provider: ProviderConfig,
    lbEntry: { modelId?: string }
  ): ProviderModel[] => {
    const result: ProviderModel[] = [];
    const seen = new Set<string>();

    // 优先使用指定模型
    if (lbEntry.modelId) {
      const selectedModel = provider.models.find(m => m.id === lbEntry.modelId);
      if (selectedModel) {
        seen.add(selectedModel.id);
        result.push({ provider, model: selectedModel });
      }
    }

    // 剩余模型按配置顺序
    for (const model of provider.models) {
      if (!seen.has(model.id)) {
        seen.add(model.id);
        result.push({ provider, model });
      }
    }

    return result;
  };

  const queue: ProviderModel[] = [];
  const seenKeys = new Set<string>();

  const addModels = (models: ProviderModel[]) => {
    for (const pm of models) {
      const key = `${pm.provider.id}:${pm.model.id}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        queue.push(pm);
      }
    }
  };

  // 先放选中的 provider
  const pickedProvider = providers.find(p => p.id === picked.providerId);
  if (pickedProvider) {
    addModels(buildProviderModels(pickedProvider, picked));
  }

  // 再放其余参与负载的 provider
  for (const entry of activeEntries) {
    if (entry.providerId === picked.providerId) continue;
    const provider = providers.find(p => p.id === entry.providerId);
    if (!provider) continue;
    addModels(buildProviderModels(provider, entry));
  }

  return queue;
}

function getPromptTemplate(settings: GlobalSettings, provider: ProviderConfig): string {
  return provider.prompt?.trim() || settings.globalPrompt;
}

export async function translate(request: TranslationRequest): Promise<TranslationResponse> {
  const { text, sourceLang, targetLang, isAggregate, hasPlaceholders, extraPrompt } = request;

  const cacheKeySourceLang = sourceLang || 'auto';
  const cacheKey = inflightKey(text, cacheKeySourceLang, targetLang, extraPrompt);

  const existing = inflightRequests.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const settings = await getSettings();

      // 缓存盐值：以 globalPrompt 摘要作为分桶维度。用户改 prompt → 旧缓存自动失效；
      // provider/model 不进入缓存键，让"同 prompt 共享缓存"以最大化命中率（实测翻译质量
      // 在主流模型间差异远小于网络/费用差异）。
      const promptSalt = await buildTranslationCachePartition(settings.globalPrompt, extraPrompt);

      const cached = await getCachedTranslation(text, cacheKeySourceLang, targetLang, promptSalt);
      if (cached) {
        return {
          text: cached.text,
          providerId: 'cache',
          modelId: 'cache',
        };
      }

      const models = settings.loadBalance.enabled
        ? pickLoadBalanceQueue(settings)
        : buildFallbackQueue(settings);

      if (models.length === 0) {
        throw new Error('No translation models available. Please configure providers in settings.');
      }

      const timeout = settings.requestTimeout;
      const errors: string[] = [];

      for (let i = 0; i < models.length; i++) {
        const providerModel = models[i];
        try {
          const promptTemplate = getPromptTemplate(settings, providerModel.provider);
          const result = await callProvider(
            providerModel,
            text,
            targetLang,
            sourceLang,
            promptTemplate,
            timeout,
            isAggregate || false,
            hasPlaceholders || false,
            extraPrompt
          );

          await setCachedTranslation(text, cacheKeySourceLang, targetLang, result.text, undefined, promptSalt);

          return {
            text: result.text,
            providerId: providerModel.provider.id,
            modelId: providerModel.model.id,
            detectedLang: result.detectedLang as LangCode | undefined,
            usage: result.usage,
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`${providerModel.provider.name}/${providerModel.model.name}: ${errorMsg}`);

          // 鉴权 / 限流类错误：跳过该 provider 的其余 model，避免被同一 apiKey 反复触发限流。
          if (isProviderFatal(error)) {
            const failedProviderId = providerModel.provider.id;
            while (i + 1 < models.length && models[i + 1].provider.id === failedProviderId) {
              i++;
              const skipped = models[i];
              errors.push(`${skipped.provider.name}/${skipped.model.name}: skipped (provider-level fatal error)`);
            }
          }
        }
      }

      throw new Error(`All translation models failed:\n${errors.join('\n')}`);
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, promise);
  return promise;
}

// ─── Provider Connectivity Test ──────────────────────────────────────────

export async function testProvider(
  provider: ProviderConfig,
  text: string,
  targetLang: string
): Promise<{ text: string; modelName: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const model = provider.models[0];
  if (!model) throw new Error('No models configured');

  const promptTemplate = provider.prompt?.trim() || DEFAULT_GLOBAL_PROMPT;
  const url = buildUrl(provider.baseURL, provider.query);
  const body = buildBody(model.id, text, targetLang, undefined, provider.body, promptTemplate, false, false, provider);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(provider),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const translatedText = extractTranslatedText(data);
    if (!translatedText) {
      throw new Error('Empty translation response');
    }

    return {
      text: translatedText,
      modelName: model.name,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
          }
        : undefined,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
