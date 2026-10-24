import type { ProviderConfig, TranslationRequest, TranslationResponse, LangCode, TokenUsage } from '@/types';
import { getSettings } from './storage';
import { getCachedTranslation } from './cache';
import { DEFAULT_GLOBAL_PROMPT, TONE_INSTRUCTIONS, formatToneInstruction, isLikelyWordOrPhrase, buildPolysemyPrompt } from './prompts';
import { consumeOpenAIStream } from './api/sse-consumer';
import { buildServiceQueue, type ProviderModel } from './api/queue-builder';
import { recordRequestStat, accumulateTokenUsage } from './stats';
import { buildUrl, buildHeaders, applyProviderSampling } from './api/http';
import { buildBody } from './api/prompt';
import { lookupAggregateCache, writeAggregateCache, writeTranslationCache } from './api/aggregate-cache';
import {
  extractTranslatedText,
  toTokenUsage,
  type OpenAIChatResponse,
} from './api/openai-types';

// 对外契约说明（拆分时不可动摇的边界）：
//   - translate / testProvider / buildTranslationCachePartition / HttpError /
//     TranslationAbortError / redactHttpErrorBody / sanitizeHttpErrorBody /
//     truncateHttpErrorBody / parseRetryAfterMs / linkAbortSignals 等**必须定义在本文件**。
//     多个测试用 spyOn(storage, 'getSettings') / spyOn(cache, 'getCachedTranslation') 替换
//     模块命名空间上的属性，本文件对 getSettings / getCachedTranslation 的调用也必须
//     继续直接从 './storage' / './cache' 导入 —— 绕道子模块会让 spy 拦不到调用点。
//   - 搬走的只是纯构造逻辑（URL/请求头、提示词渲染与请求体、聚合缓存读写），
//     它们不持有跨模块可被替换的引用，或只引用 cache 的具名导出（bun 下 spy 仍生效）。

const inflightRequests = new Map<string, Promise<TranslationResponse>>();

/** 「测试连接」按钮的固定超时（与通用设置的 requestTimeout 无关） */
const PROVIDER_TEST_TIMEOUT_MS = 30_000;

// URL / 请求头 / 采样字段构造在 api/http.ts，这里转出以保持既有导入路径可用
export { buildUrl, buildHeaders, applyProviderSampling };


function inflightKey(
  text: string,
  targetLang: string,
  extraPrompt: string | undefined,
  serviceId: string,
  tone: string,
  isAggregate: boolean,
  hasPlaceholders: boolean
): string {
  // 格式开关参与 key：它们会改变 renderPrompt 的规则段落与缓存分区，
  // 相同原文在不同参数下不能复用同一个在途请求。
  return `${text}::${targetLang}::${extraPrompt ?? ''}::${serviceId}::${tone}::${isAggregate ? 1 : 0}${hasPlaceholders ? 1 : 0}`;
}

// 错误体脱敏与限长在 api/error-body.ts（纯字符串处理，无内部依赖）。
// 这里 import 供本文件内部调用，并 re-export 保持既有 `from '@/lib/api'`
// 的导入路径与测试调用点不变。
import { sanitizeHttpErrorBody } from './api/error-body';
export {
  HTTP_ERROR_BODY_LIMIT,
  truncateHttpErrorBody,
  redactHttpErrorBody,
  sanitizeHttpErrorBody,
} from './api/error-body';

// 缓存分区盐值计算在 api/cache-partition.ts（纯函数，无内部依赖）。
// 这里 import 供本文件内部调用，并 re-export 保持既有 `from '@/lib/api'`
// 的导入路径与测试调用点不变。
import { buildTranslationCachePartition } from './api/cache-partition';
export { buildTranslationCachePartition, shortPromptHash } from './api/cache-partition';

// 错误类型与取消信号工具在 api/errors.ts（稳定契约，被识图链路与上层共同依赖）。
// 这里 import 供本文件内部调用，并 re-export 保持既有 `from '@/lib/api'` 导入不变。
import {
  HttpError,
  TranslationAbortError,
  isTranslationAbortError,
  isProviderFatal,
  linkAbortSignals,
  type TranslateOptions,
} from './api/errors';
export {
  HttpError,
  TranslationAbortError,
  isTranslationAbortError,
  isProviderFatal,
  linkAbortSignals,
  type TranslateOptions,
} from './api/errors';

interface ProviderCallResult {
  text: string;
  detectedLang?: string;
  usage?: TokenUsage;
}

// 429 限流退避策略在 api/rate-limit.ts（纯策略函数）。
// 这里 import 供本文件内部调用，并 re-export 保持既有 `from '@/lib/api'` 导入不变。
import {
  RATE_LIMIT_MAX_RETRIES,
  parseRetryAfterMs,
  computeRateLimitDelayMs,
  sleep,
} from './api/rate-limit';
export { parseRetryAfterMs, computeRateLimitDelayMs } from './api/rate-limit';

interface CallProviderOptions {
  promptTemplate: string;
  /** 本次 fetch 的超时预算（重试时会收缩为剩余预算） */
  timeoutMs: number;
  isAggregate: boolean;
  hasPlaceholders: boolean;
  extraPrompt?: string;
  /** 外部取消信号，与内部超时 signal 合并 */
  signal?: AbortSignal;
}

/** 单次请求尝试（不含 429 重试） */
async function callProvider(
  providerModel: ProviderModel,
  text: string,
  targetLang: string,
  options: CallProviderOptions
): Promise<ProviderCallResult> {
  const { provider, model } = providerModel;
  const externalSignal = options.signal;

  if (externalSignal?.aborted) throw new TranslationAbortError();

  const url = buildUrl(provider.baseURL, provider.query);
  const body = buildBody(
    model.id,
    text,
    targetLang,
    provider.body,
    options.promptTemplate,
    options.isAggregate,
    options.hasPlaceholders,
    provider,
    options.extraPrompt
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);
  const unlinkAbort = linkAbortSignals(controller, externalSignal);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(provider),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new HttpError(
        response.status,
        `HTTP ${response.status}: ${sanitizeHttpErrorBody(errorText) || 'Unknown error'}`,
        parseRetryAfterMs(response.headers.get('Retry-After'))
      );
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
    const usage = toTokenUsage(data.usage);

    return { text: translatedText, detectedLang, usage };
  } catch (error) {
    // 外部取消：抛可识别错误，避免被当成模型失败而降级
    if (externalSignal?.aborted) throw new TranslationAbortError();
    throw error;
  } finally {
    clearTimeout(timeoutId);
    unlinkAbort();
  }
}

/**
 * 单模型尝试：遇到 429 时在「该模型的超时预算」内做有限次退避重试。
 * 其它错误（含超时、5xx）不重试，直接交给上层降级到下一个模型。
 */
async function callProviderWithRateLimitRetry(
  providerModel: ProviderModel,
  text: string,
  targetLang: string,
  options: CallProviderOptions,
  budgetMs: number
): Promise<ProviderCallResult> {
  const deadline = Date.now() + budgetMs;
  let lastError: unknown;

  for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    try {
      return await callProvider(providerModel, text, targetLang, { ...options, timeoutMs: remaining });
    } catch (error) {
      lastError = error;

      // 只对 429 重试；取消错误/其它 HTTP 错误原样抛出，由上层决定是否降级
      if (!(error instanceof HttpError) || error.status !== 429) throw error;
      if (attempt === RATE_LIMIT_MAX_RETRIES) break;

      const remainingBudget = deadline - Date.now();
      // Retry-After 会超出剩余预算：放弃退避，直接降级下一个模型
      if (error.retryAfterMs !== undefined && error.retryAfterMs >= remainingBudget) break;

      const delay = computeRateLimitDelayMs(attempt, error.retryAfterMs);
      if (delay >= remainingBudget) break;

      await sleep(delay, options.signal);
    }
  }

  throw lastError ?? new Error('Request timed out');
}

export async function translate(request: TranslationRequest, options?: TranslateOptions): Promise<TranslationResponse> {
  const { text, targetLang, isAggregate, hasPlaceholders, extraPrompt, enablePolysemy } = request;
  const externalSignal = options?.signal;

  if (externalSignal?.aborted) throw new TranslationAbortError();

  // Resolve settings and activeService/finalTone first to generate the correct in-flight key
  const settings = await getSettings();

  const activeService = settings.services.find(s => s.id === settings.selectedServiceId) || settings.services[0];
  if (!activeService) {
    throw new Error('No active translation service available. Please configure services in settings.');
  }

  let finalTone: string;
  if (settings.overrideTranslationToneEnabled) {
    finalTone = settings.customTranslationTone;
  } else {
    const serviceTone = activeService.defaultTranslationTone;
    finalTone = serviceTone === 'personal_default' ? settings.translationTone : serviceTone;
  }

  const cacheKey = inflightKey(
    text,
    targetLang,
    extraPrompt,
    activeService.id,
    finalTone,
    isAggregate === true,
    hasPlaceholders === true
  );

  // 带外部 signal 的调用不参与在途去重：共享同一个 promise 会让一个调用方的取消
  // 连带拒绝其他调用方。无 signal 的调用方（background.ts 等）保持原有去重语义。
  if (!externalSignal) {
    const existing = inflightRequests.get(cacheKey);
    if (existing) return existing;
  }

  const promise = (async () => {
    try {
      // 拼装提示词与风格
      let basePrompt = settings.globalPrompt;
      if (activeService.prompt?.trim()) {
        const servicePrompt = activeService.prompt.trim();
        const isOverride = activeService.promptMode === 'override';
        if (isOverride) {
          basePrompt = servicePrompt;
        } else {
          basePrompt = `${settings.globalPrompt}\n\nAdditional translation instructions for this service:\n${servicePrompt}`;
        }
      }

      // 仅在 popup 短文本场景（enablePolysemy=true）且服务开启时启用多义词词典式翻译。
      // 网页翻译永不启用，避免多义项 bullet 输出污染 DOM 结构。
      const shouldApplyPolysemy = enablePolysemy && activeService.enablePolysemy && isLikelyWordOrPhrase(text);
      if (shouldApplyPolysemy) {
        const polysemyPrompt = buildPolysemyPrompt(targetLang);
        basePrompt = `${basePrompt}\n\n${polysemyPrompt}`;
      }
      let toneInstruction = '';
      // 优先在自定义风格里寻找，其次在内置寻找
      const customToneObj = settings.customTones.find(t => t.id === finalTone);
      if (customToneObj) {
        toneInstruction = customToneObj.promptInstruction;
      } else {
        toneInstruction = TONE_INSTRUCTIONS[finalTone as keyof typeof TONE_INSTRUCTIONS] || '';
      }
      const finalPromptTemplate = toneInstruction ? `${basePrompt}${formatToneInstruction(toneInstruction)}` : basePrompt;

      // 传入请求文本：分区函数据此判断格式开关是否已由文本本身表达
      // （聚合的 `<<<N>>>`、占位符的 `#N#` / `<sN>`），只有开关与文本矛盾时
      // 才额外分区，避免无谓的缓存键漂移（详见该函数注释）
      const promptSalt = await buildTranslationCachePartition(
        basePrompt,
        extraPrompt,
        finalTone,
        isAggregate,
        hasPlaceholders,
        text
      );

      // 聚合请求按段落查缓存：批次组成不再进入缓存键（否则滚动节奏一变就全量
      // miss，见 lookupAggregateCache 的实测数据）。切分有歧义时回落整批缓存。
      const cached = isAggregate === true
        ? await lookupAggregateCache(text, targetLang, promptSalt)
        : (await getCachedTranslation(text, targetLang, promptSalt))?.text ?? null;
      if (cached) {
        return {
          text: cached,
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
        const startTime = Date.now();
        let result: ProviderCallResult;

        try {
          result = await callProviderWithRateLimitRetry(
            providerModel,
            text,
            targetLang,
            {
              promptTemplate: finalPromptTemplate,
              timeoutMs: timeout,
              isAggregate: isAggregate || false,
              hasPlaceholders: hasPlaceholders || false,
              extraPrompt,
              signal: externalSignal,
            },
            timeout
          );
        } catch (error) {
          // 外部取消不是模型的问题：不记失败统计、不降级，直接抛可识别的 abort 错误
          if (externalSignal?.aborted || isTranslationAbortError(error)) {
            throw new TranslationAbortError();
          }

          const responseTime = Date.now() - startTime;
          recordRequestStat(providerModel.provider.id, providerModel.model.id, responseTime, false).catch(() => {});

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

          continue;
        }

        // 已成功且已计费：统计与缓存写入的失败都不得触发降级
        const responseTime = Date.now() - startTime;
        const pid = providerModel.provider.id;
        const mid = providerModel.model.id;
        // 异步记录统计，不阻塞翻译
        recordRequestStat(pid, mid, responseTime, true).catch(() => {});
        accumulateTokenUsage(pid, mid, result.usage).catch(() => {});
        if (isAggregate === true) {
          // 逐段写缓存，与 lookupAggregateCache 的读法对齐；失败不触发降级
          await writeAggregateCache(text, result.text, targetLang, promptSalt);
        } else {
          await writeTranslationCache(text, targetLang, result.text, promptSalt);
        }

        return {
          text: result.text,
          providerId: pid,
          modelId: mid,
          detectedLang: result.detectedLang as LangCode | undefined,
          usage: result.usage,
        };
      }

      throw new Error(`All translation models failed:\n${errors.join('\n')}`);
    } finally {
      // 只清理自己登记过的条目：带 signal 的调用不参与去重、也不写 inflightRequests，
      // 若无条件 delete 会把另一个无 signal 调用方仍在进行中的请求条目删掉，
      // 导致后续同 key 请求重新发起 fetch（重复计费）。
      if (!externalSignal) inflightRequests.delete(cacheKey);
    }
  })();

  if (!externalSignal) inflightRequests.set(cacheKey, promise);
  return promise;
}

export async function testProvider(
  provider: ProviderConfig,
  text: string,
  targetLang: string
): Promise<{ text: string; modelName: string; usage?: TokenUsage }> {
  const model = provider.models[0];
  if (!model) throw new Error('No models configured');

  const promptTemplate = DEFAULT_GLOBAL_PROMPT;
  const url = buildUrl(provider.baseURL, provider.query);
  const body = buildBody(model.id, text, targetLang, provider.body, promptTemplate, false, false, provider);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROVIDER_TEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(provider),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${sanitizeHttpErrorBody(errorText) || 'Unknown error'}`);
    }

    // 流式 provider 的响应是 SSE，不能走 response.json()（会抛 JSON Parse error）
    if (provider.stream === true) {
      const { text: streamedText } = await consumeOpenAIStream(response, controller.signal);
      return { text: streamedText, modelName: model.name };
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const translatedText = extractTranslatedText(data);
    if (!translatedText) {
      throw new Error('Empty translation response');
    }

    return {
      text: translatedText,
      modelName: model.name,
      usage: toTokenUsage(data.usage),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
