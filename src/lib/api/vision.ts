import type { TokenUsage } from '@/types';
import {
  applyProviderSampling,
  buildUrl,
  buildHeaders,
  HttpError,
  isProviderFatal,
  isTranslationAbortError,
  linkAbortSignals,
  sanitizeHttpErrorBody,
  TranslationAbortError,
  type TranslateOptions,
} from '../api';
import { consumeOpenAIStream } from './sse-consumer';
import { buildVisionQueue, type ProviderModel } from './queue-builder';
import { getSettings } from '../storage';
import { recordRequestStat, accumulateTokenUsage } from '../stats';
import {
  IMAGE_TRANSLATE_SYSTEM_PROMPT,
  buildImageTranslateUserPrompt,
} from '../image-translate/vision-prompt';
import { parseVisionText } from '../image-translate/vision-parse';
import {
  ImageTranslationError,
  type ImageTranslationErrorCode,
  type VisionTranslationResult,
} from '../image-translate/types';

interface VisionChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * 识图独立超时：真实视觉模型翻译一张图通常需要 5–17s，不能沿用文本请求的
 * settings.requestTimeout（默认 30s，开发配置更短），否则慢模型会被提前中断。
 */
export const IMAGE_VISION_TIMEOUT_MS = 60_000;

/** 部分 provider 用 400/422 + 这些措辞表示「该模型不支持图片输入」 */
const VISION_UNSUPPORTED_HTTP_STATUSES = [400, 422];
const VISION_UNSUPPORTED_BODY_PATTERNS = [
  /not a vlm/i,
  /do(?:es)?(?: not|n't) support (?:image|vision)/i,
  /unsupported (?:image|vision)/i,
];

/** 队列全部失败时按该顺序选主错误码 */
const VISION_FAILURE_CODE_PRIORITY: ImageTranslationErrorCode[] = [
  'VISION_TIMEOUT',
  'VISION_MODEL_UNSUPPORTED',
  'VISION_HTTP_ERROR',
  'VISION_RECOGNITION_FAILED',
];

/** 识图 HTTP 失败：保留 HttpError 的 status 供 provider 级跳过判定，同时携带稳定错误码 */
class VisionHttpError extends HttpError {
  constructor(
    public readonly code: 'VISION_MODEL_UNSUPPORTED' | 'VISION_HTTP_ERROR',
    status: number,
    message: string
  ) {
    super(status, message);
    this.name = 'VisionHttpError';
  }
}

/** 把识图的 HTTP 失败映射为「模型不支持图片」或通用 HTTP 错误 */
function visionHttpError(status: number, body: string): VisionHttpError {
  const unsupported =
    VISION_UNSUPPORTED_HTTP_STATUSES.includes(status) &&
    VISION_UNSUPPORTED_BODY_PATTERNS.some((pattern) => pattern.test(body));

  return new VisionHttpError(
    unsupported ? 'VISION_MODEL_UNSUPPORTED' : 'VISION_HTTP_ERROR',
    status,
    // 与文本链路共用 api.ts 的处理：先脱敏密钥片段再截断到 200 字符，
    // 只截断不脱敏时，回显在体首部的密钥仍会完整进 UI。
    'HTTP ' + status + ': ' + (sanitizeHttpErrorBody(body) || 'Unknown error')
  );
}

function isAbortFailure(error: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) return true;
  return (
    error instanceof Error && (error.name === 'AbortError' || error.message.includes('Request aborted'))
  );
}

function visionTimeoutError(timeout: number): ImageTranslationError {
  return new ImageTranslationError(
    'VISION_TIMEOUT',
    'Vision request did not finish within ' + timeout + 'ms'
  );
}

/** 单次尝试的失败码；解析失败等未分类错误统一按兜底码计 */
function visionFailureCode(error: unknown): ImageTranslationErrorCode {
  if (error instanceof VisionHttpError) return error.code;
  if (error instanceof ImageTranslationError) return error.code;
  return 'VISION_RECOGNITION_FAILED';
}

/** 队列全部失败时的聚合码：VISION_TIMEOUT > 模型不支持图片 > HTTP 错误 > 兜底 */
function aggregateVisionFailureCode(codes: ImageTranslationErrorCode[]): ImageTranslationErrorCode {
  for (const code of VISION_FAILURE_CODE_PRIORITY) {
    if (codes.includes(code)) return code;
  }
  return 'VISION_RECOGNITION_FAILED';
}

/** 构造 OpenAI-compatible 多模态直译请求体（system 提示 + user 文本/图片） */
export function buildVisionBody(
  providerModel: ProviderModel,
  imageDataUrl: string,
  targetLang: string
): Record<string, unknown> {
  const { provider, model } = providerModel;

  const body: Record<string, unknown> = {
    model: model.id,
    messages: [
      { role: 'system', content: IMAGE_TRANSLATE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildImageTranslateUserPrompt(targetLang) },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
    ...provider.body,
  };

  applyProviderSampling(body, provider);

  return body;
}

/**
 * 按队列顺序尝试识图；鉴权类（401/403）与 429 跳过同 provider 剩余模型。
 * 外部取消（TranslationAbortError）直接向上抛，绝不降级到下一个模型。
 */
export async function runVisionQueue<T>(
  queue: ProviderModel[],
  attempt: (providerModel: ProviderModel) => Promise<T>
): Promise<T> {
  const errors: string[] = [];
  const codes: ImageTranslationErrorCode[] = [];

  for (let i = 0; i < queue.length; i++) {
    const providerModel = queue[i];
    try {
      return await attempt(providerModel);
    } catch (error) {
      // 调用方取消：不是模型失败，立即终止整条队列
      if (isTranslationAbortError(error)) throw error;

      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(providerModel.provider.name + '/' + providerModel.model.name + ': ' + errorMsg);
      codes.push(visionFailureCode(error));

      if (isVisionProviderFatal(error)) {
        const failedProviderId = providerModel.provider.id;
        while (i + 1 < queue.length && queue[i + 1].provider.id === failedProviderId) {
          i++;
          const skipped = queue[i];
          errors.push(skipped.provider.name + '/' + skipped.model.name + ': skipped (provider-level fatal error)');
        }
      }
    }
  }

  throw new ImageTranslationError(
    aggregateVisionFailureCode(codes),
    'All vision models failed:\n' + errors.join('\n')
  );
}

function toTokenUsage(raw: VisionChatResponse['usage']): TokenUsage | undefined {
  if (!raw) return undefined;
  return {
    promptTokens: raw.prompt_tokens ?? 0,
    completionTokens: raw.completion_tokens ?? 0,
    totalTokens: raw.total_tokens ?? 0,
  };
}

/**
 * 识图链路的 provider 级致命判定：只认鉴权类（401/403）。
 *
 * 429 是瞬时限流而非 provider 失效：识图没有退避重试，但跳过该 provider 的其余
 * 视觉模型并不合理 —— 同一 provider 的不同模型常有独立配额。此前把 429 当致命，
 * 会让「首选模型限流」直接丢掉整个 provider 的备选模型。
 */
function isVisionProviderFatal(error: unknown): boolean {
  return isProviderFatal(error);
}

/**
 * 识图请求的共享管线：发请求、超时/HTTP 错误映射、流式或整包响应取回消息内容。
 * 具体提示词与解析由调用方决定。
 * 外部 signal 与内部超时 signal 合并：外部取消映射为 TranslationAbortError（不降级），
 * 内部超时才映射为 VISION_TIMEOUT。
 */
async function postVisionChat(
  providerModel: ProviderModel,
  body: Record<string, unknown>,
  timeout: number,
  externalSignal?: AbortSignal
): Promise<{ content: unknown; usage?: TokenUsage }> {
  const { provider } = providerModel;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const unlinkAbort = linkAbortSignals(controller, externalSignal);

  try {
    const response = await fetch(buildUrl(provider.baseURL, provider.query), {
      method: 'POST',
      headers: buildHeaders(provider),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw visionHttpError(response.status, errorText);
    }

    if (provider.stream === true) {
      const { text } = await consumeOpenAIStream(response, controller.signal);
      return { content: text };
    }

    const data = (await response.json()) as VisionChatResponse;
    const choice = data.choices?.[0];
    if (!choice || typeof choice !== 'object' || !choice.message) {
      throw new ImageTranslationError('VISION_RECOGNITION_FAILED', 'Vision response has no message content');
    }
    return {
      content: choice.message.content,
      usage: toTokenUsage(data.usage),
    };
  } catch (error) {
    // 外部取消优先：取消不是模型的问题，不能映射成 VISION_TIMEOUT 触发降级
    if (externalSignal?.aborted || isTranslationAbortError(error)) throw new TranslationAbortError();
    if (isAbortFailure(error, controller.signal)) throw visionTimeoutError(timeout);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    unlinkAbort();
  }
}

/** 单次图片直译请求；timeout 由调用方注入，测试可传短超时验证中止映射 */
export async function callVisionModel(
  providerModel: ProviderModel,
  imageDataUrl: string,
  targetLang: string,
  timeout: number,
  signal?: AbortSignal
): Promise<{ text: string; usage?: TokenUsage }> {
  const { content, usage } = await postVisionChat(
    providerModel,
    buildVisionBody(providerModel, imageDataUrl, targetLang),
    timeout,
    signal
  );
  return { text: parseVisionText(content), usage };
}

export interface VisionRunContext {
  queue: ProviderModel[];
}

/**
 * 读取设置并解析识图队列。无可用视觉模型时在解码图片之前就报错，
 * 供 background 先做能力检查再决定是否处理图片。
 */
export async function resolveVisionRunContext(): Promise<VisionRunContext> {
  const settings = await getSettings();
  const activeService = settings.services.find(s => s.id === settings.selectedServiceId) || settings.services[0];

  if (!activeService) {
    throw new ImageTranslationError(
      'NO_VISION_MODEL',
      'No active translation service available. Please configure services in settings.'
    );
  }

  const queue = buildVisionQueue(settings, activeService);
  if (queue.length === 0) {
    throw new ImageTranslationError(
      'NO_VISION_MODEL',
      'No vision-capable models available. Please mark a model as supporting image input in settings.'
    );
  }

  return { queue };
}

/** 队列内单次尝试的统计包装：成功/失败都记请求日志，token 用量仅成功时有；取消不计失败 */
async function attemptWithStats<T>(
  providerModel: ProviderModel,
  attempt: () => Promise<{ value: T; usage?: TokenUsage }>
): Promise<T> {
  const { provider, model } = providerModel;
  const startedAt = Date.now();

  try {
    const { value, usage } = await attempt();
    recordRequestStat(provider.id, model.id, Date.now() - startedAt, true).catch(() => {});
    accumulateTokenUsage(provider.id, model.id, usage).catch(() => {});
    return value;
  } catch (error) {
    // 外部取消不是模型失败，不写失败统计
    if (!isTranslationAbortError(error)) {
      recordRequestStat(provider.id, model.id, Date.now() - startedAt, false).catch(() => {});
    }
    throw error;
  }
}

/** 图片直译入口：可传入已解析的上下文，避免重复读设置并重复推进 pool 计数 */
export async function translateImageText(
  imageDataUrl: string,
  targetLang: string,
  context?: VisionRunContext,
  options?: TranslateOptions
): Promise<VisionTranslationResult> {
  const { queue } = context ?? (await resolveVisionRunContext());
  const signal = options?.signal;
  if (signal?.aborted) throw new TranslationAbortError();

  return runVisionQueue(queue, (providerModel) =>
    attemptWithStats(providerModel, async () => {
      const { text, usage } = await callVisionModel(
        providerModel,
        imageDataUrl,
        targetLang,
        IMAGE_VISION_TIMEOUT_MS,
        signal
      );
      return {
        value: { text, providerId: providerModel.provider.id, modelId: providerModel.model.id },
        usage,
      };
    })
  );
}
