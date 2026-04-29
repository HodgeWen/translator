import type { ProviderConfig, TranslationRequest, TranslationResponse, LangCode, GlobalSettings } from '@/types';
import { getSettings } from './storage';
import { getCachedTranslation, setCachedTranslation } from './cache';

interface ProviderModel {
  provider: ProviderConfig;
  model: { id: string; name: string };
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
  text: string,
  targetLang: string,
  sourceLang: string | undefined,
  isAggregate: boolean
): string {
  const sourceLangLabel = sourceLang || 'auto-detected language';
  let prompt = template
    .replace(/\{\{sourceLang\}\}/g, sourceLangLabel)
    .replace(/\{\{targetLang\}\}/g, targetLang)
    .replace(/\{\{text\}\}/g, text);

  prompt += PLACEHOLDER_RULE;

  if (isAggregate) {
    prompt += `\n\nThe input contains multiple paragraphs. Each paragraph is preceded by a marker of the form "<<<N>>>" on its own line, where N is a positive integer (1, 2, 3, ...). You MUST follow this protocol exactly:
1. Translate the content of each paragraph into ${targetLang}.
2. Output every translated paragraph preceded by the SAME "<<<N>>>" marker on its own line, in the SAME order as the input.
3. Do not merge paragraphs, do not skip paragraphs, and do not introduce extra paragraphs or markers that were not in the input.
4. Treat "<<<N>>>" as opaque tokens: never translate, localize, reformat, or alter the digits/symbols inside them.
5. Preserve every "#N#" inline placeholder inside paragraphs verbatim, exactly as instructed above.
6. Do not add any commentary, headings, or text outside the marker/paragraph structure.`;
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
  provider: ProviderConfig
): Record<string, unknown> {
  const systemPrompt = renderPrompt(promptTemplate, text, targetLang, sourceLang, isAggregate);

  // 装配顺序：基础字段 → extraBody → 独立采样字段（独立字段后置覆盖 extraBody 中的同名键）
  const body: Record<string, unknown> = {
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    ...extraBody,
  };

  body.temperature = provider.temperature ?? 0.3;
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

  try {
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });

      let idx = buffer.indexOf('\n\n');
      while (idx !== -1) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        const lines = rawEvent.split('\n');
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
            // 忽略 JSON 解析失败的 chunk（多见于事件分隔不规则的服务端）
          }
        }
        if (done) break;
        idx = buffer.indexOf('\n\n');
      }
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
  isAggregate: boolean
): Promise<{ text: string; detectedLang?: string }> {
  const { provider, model } = providerModel;

  const url = buildUrl(provider.baseURL, provider.query);
  const body = buildBody(model.id, text, targetLang, sourceLang, provider.body, promptTemplate, isAggregate, provider);

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
      clearTimeout(timeoutId);
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    if (provider.stream === true) {
      try {
        return await consumeOpenAIStream(response, controller.signal);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    clearTimeout(timeoutId);
    const data = (await response.json()) as OpenAIChatResponse;
    const translatedText = extractTranslatedText(data);
    if (!translatedText) {
      throw new Error('Empty translation response');
    }
    const detectedLang = data.detected_language ?? data.source_language;

    return { text: translatedText, detectedLang };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
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
  const { text, sourceLang, targetLang, isAggregate } = request;

  // Check cache first
  const cacheKeySourceLang = sourceLang || 'auto';
  const cached = await getCachedTranslation(text, cacheKeySourceLang, targetLang);
  if (cached) {
    return {
      text: cached,
      providerId: 'cache',
      modelId: 'cache',
    };
  }

  const settings = await getSettings();

  // 根据是否开启负载均衡选择不同的 provider 队列
  const models = settings.loadBalance.enabled
    ? pickLoadBalanceQueue(settings)
    : buildFallbackQueue(settings);

  if (models.length === 0) {
    throw new Error('No translation models available. Please configure providers in settings.');
  }

  const timeout = settings.requestTimeout;
  const errors: string[] = [];

  for (const providerModel of models) {
    try {
      const promptTemplate = getPromptTemplate(settings, providerModel.provider);
      const result = await callProvider(
        providerModel,
        text,
        targetLang,
        sourceLang,
        promptTemplate,
        timeout,
        isAggregate || false
      );

      // Cache the result
      await setCachedTranslation(text, cacheKeySourceLang, targetLang, result.text);

      return {
        text: result.text,
        providerId: providerModel.provider.id,
        modelId: providerModel.model.id,
        detectedLang: result.detectedLang as LangCode | undefined,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`${providerModel.provider.name}/${providerModel.model.name}: ${errorMsg}`);
      // Continue to next model in queue
    }
  }

  throw new Error(`All translation models failed:\n${errors.join('\n')}`);
}
