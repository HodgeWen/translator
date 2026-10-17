import type { TokenUsage } from '@/types';
import { applyProviderSampling, buildUrl, buildHeaders, HttpError, isProviderFatal } from '../api';
import { consumeOpenAIStream } from './sse-consumer';
import { buildVisionQueue, type ProviderModel } from './queue-builder';
import { getSettings } from '../storage';
import { recordRequestStat, accumulateTokenUsage } from '../stats';
import { IMAGE_VISION_SYSTEM_PROMPT, IMAGE_VISION_USER_PROMPT } from '../image-translate/vision-prompt';
import { parseVisionContent, parseVisionResponse } from '../image-translate/vision-parse';
import { ImageTranslationError, type ImageTextBlock, type VisionRecognitionResult } from '../image-translate/types';

interface VisionChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/** 构造 OpenAI-compatible 多模态识别请求体（system 提示 + user 文本/图片） */
export function buildVisionBody(providerModel: ProviderModel, imageDataUrl: string): Record<string, unknown> {
  const { provider, model } = providerModel;

  const body: Record<string, unknown> = {
    model: model.id,
    messages: [
      { role: 'system', content: IMAGE_VISION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: IMAGE_VISION_USER_PROMPT },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
    ...provider.body,
  };

  applyProviderSampling(body, provider);

  return body;
}

/** 按队列顺序尝试识图；401/403/429 跳过同 provider 剩余模型 */
export async function runVisionQueue<T>(
  queue: ProviderModel[],
  attempt: (providerModel: ProviderModel) => Promise<T>
): Promise<T> {
  const errors: string[] = [];

  for (let i = 0; i < queue.length; i++) {
    const providerModel = queue[i];
    try {
      return await attempt(providerModel);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(providerModel.provider.name + '/' + providerModel.model.name + ': ' + errorMsg);

      if (isProviderFatal(error)) {
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
    'VISION_RECOGNITION_FAILED',
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

async function callVisionModel(
  providerModel: ProviderModel,
  imageDataUrl: string,
  timeout: number
): Promise<{ blocks: ImageTextBlock[]; usage?: TokenUsage }> {
  const { provider } = providerModel;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(buildUrl(provider.baseURL, provider.query), {
      method: 'POST',
      headers: buildHeaders(provider),
      body: JSON.stringify(buildVisionBody(providerModel, imageDataUrl)),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new HttpError(response.status, 'HTTP ' + response.status + ': ' + errorText);
    }

    if (provider.stream === true) {
      const { text } = await consumeOpenAIStream(response, controller.signal);
      return { blocks: parseVisionContent(text) };
    }

    const data = (await response.json()) as VisionChatResponse;
    return { blocks: parseVisionResponse(data), usage: toTokenUsage(data.usage) };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** 识图入口：读取设置 → 构建识别队列 → 逐模型降级识别 */
export async function recognizeImageText(imageDataUrl: string): Promise<VisionRecognitionResult> {
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

  return runVisionQueue(queue, async (providerModel) => {
    const startedAt = Date.now();
    const { provider, model } = providerModel;

    try {
      const { blocks, usage } = await callVisionModel(providerModel, imageDataUrl, settings.requestTimeout);
      recordRequestStat(provider.id, model.id, Date.now() - startedAt, true).catch(() => {});
      accumulateTokenUsage(provider.id, model.id, usage).catch(() => {});
      return { blocks, providerId: provider.id, modelId: model.id };
    } catch (error) {
      recordRequestStat(provider.id, model.id, Date.now() - startedAt, false).catch(() => {});
      throw error;
    }
  });
}
