import type { ProviderConfig, TranslationRequest, TranslationResponse, LangCode, DisplayStyle } from '@/types';
import { getSettings } from './storage';
import { getCachedTranslation, setCachedTranslation } from './cache';
import { DEFAULT_GLOBAL_PROMPT, TONE_INSTRUCTIONS } from './prompts';
import { consumeOpenAIStream } from './api/sse-consumer';
import { buildServiceQueue, type ProviderModel } from './api/queue-builder';

const inflightRequests = new Map<string, Promise<TranslationResponse>>();

function inflightKey(
  text: string,
  sourceLang: string | undefined,
  targetLang: string,
  extraPrompt: string | undefined,
  serviceId: string,
  tone: string
): string {
  return `${text}::${sourceLang ?? 'auto'}::${targetLang}::${extraPrompt ?? ''}::${serviceId}::${tone}`;
}

async function shortPromptHash(prompt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prompt));
  return Array.from(new Uint8Array(buf, 0, 4))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildTranslationCachePartition(globalPrompt: string, extraPrompt?: string, tone?: string): Promise<string> {
  const effectiveTone = tone && tone !== 'normal' ? tone : undefined;
  if (!extraPrompt && !effectiveTone) return shortPromptHash(globalPrompt);
  return shortPromptHash(JSON.stringify([globalPrompt, extraPrompt ?? '', effectiveTone ?? '']));
}

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

  const body: Record<string, unknown> = {
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    ...extraBody,
  };

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

  if (provider.apiKey && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }

  return headers;
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
export async function translate(request: TranslationRequest): Promise<TranslationResponse> {
  const { text, sourceLang, targetLang, isAggregate, hasPlaceholders, extraPrompt } = request;

  const cacheKeySourceLang = sourceLang || 'auto';

  // Resolve settings and activeService/finalTone first to generate the correct in-flight key
  const settings = await getSettings();

  const activeService = settings.services.find(s => s.id === settings.selectedServiceId) || settings.services[0];
  if (!activeService) {
    throw new Error('No active translation service available. Please configure services in settings.');
  }

  // 级联解析
  let finalStyle: DisplayStyle;
  if (settings.overrideDisplayStyleEnabled) {
    // 个人开启自定义覆盖
    finalStyle = settings.customDisplayStyle;
  } else {
    // 继承服务配置
    const serviceStyle = activeService.defaultDisplayStyle;
    finalStyle = serviceStyle === 'personal_default' ? settings.displayStyle : serviceStyle;
  }

  let finalTone: string;
  if (settings.overrideTranslationToneEnabled) {
    finalTone = settings.customTranslationTone;
  } else {
    const serviceTone = activeService.defaultTranslationTone;
    finalTone = serviceTone === 'personal_default' ? settings.translationTone : serviceTone;
  }

  const cacheKey = inflightKey(text, cacheKeySourceLang, targetLang, extraPrompt, activeService.id, finalTone);

  const existing = inflightRequests.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      // For debug/future integration, log the final display style
      console.debug('[Translator] Using display style:', finalStyle);

      // 拼装提示词与风格
      let basePrompt = settings.globalPrompt;
      if (activeService.prompt?.trim()) {
        const servicePrompt = activeService.prompt.trim();
        // 如果服务专属 Prompt 包含 {{targetLang}}，则完全覆盖全局 Prompt
        if (servicePrompt.includes('{{targetLang}}')) {
          basePrompt = servicePrompt;
        } else {
          // 否则追加到全局 Prompt 后面
          basePrompt = `${settings.globalPrompt}\n\nAdditional translation instructions for this service:\n${servicePrompt}`;
        }
      }
      let toneInstruction = '';
      // 优先在自定义风格里寻找，其次在内置寻找
      const customToneObj = settings.customTones.find(t => t.id === finalTone);
      if (customToneObj) {
        toneInstruction = customToneObj.promptInstruction;
      } else {
        toneInstruction = TONE_INSTRUCTIONS[finalTone as keyof typeof TONE_INSTRUCTIONS] || '';
      }
      const finalPromptTemplate = toneInstruction ? `${basePrompt}\n\n${toneInstruction}` : basePrompt;

      const promptSalt = await buildTranslationCachePartition(basePrompt, extraPrompt, finalTone);

      const cached = await getCachedTranslation(text, cacheKeySourceLang, targetLang, promptSalt);
      if (cached) {
        return {
          text: cached.text,
          providerId: 'cache',
          modelId: 'cache',
        };
      }

      const models = buildServiceQueue(settings, activeService);

      if (models.length === 0) {
        throw new Error('No translation models available. Please configure providers in settings.');
      }

      const timeout = settings.requestTimeout;
      const errors: string[] = [];

      for (let i = 0; i < models.length; i++) {
        const providerModel = models[i];
        try {
          const result = await callProvider(
            providerModel,
            text,
            targetLang,
            sourceLang,
            finalPromptTemplate,
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
