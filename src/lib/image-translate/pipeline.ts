import type { BgImageTranslatePayload, ImageTranslationResult } from '@/types';
import { getCachedImageTranslation, setCachedImageTranslation } from '@/lib/cache';
import { translateImageText, resolveVisionRunContext } from '@/lib/api/vision';
import { IMAGE_VISION_PROMPT_VERSION } from './vision-prompt';
import {
  decodeDataUrl,
  prepareImageForVision,
  sha256Hex,
} from './image-processing';

/**
 * 图片翻译后台编排：先确认有视觉模型（无模型不解码图片）→ 解码/哈希/查译文缓存 →
 * 未命中时缩放图片并交给视觉模型一次直译 → 写缓存 → 返回整图译文文本。
 */
export async function translateImage(
  payload: BgImageTranslatePayload
): Promise<ImageTranslationResult> {
  const visionContext = await resolveVisionRunContext();

  const image = decodeDataUrl(payload.dataUrl);
  const imageHash = await sha256Hex(image.bytes);

  const cached = await getCachedImageTranslation(imageHash, IMAGE_VISION_PROMPT_VERSION, payload.targetLang);
  if (cached) {
    return {
      text: cached.text,
      providerId: cached.providerId,
      modelId: cached.modelId,
      cached: true,
    };
  }

  const prepared = await prepareImageForVision(image);
  const translation = await translateImageText(prepared.dataUrl, payload.targetLang, visionContext);

  await setCachedImageTranslation({
    imageHash,
    promptVersion: IMAGE_VISION_PROMPT_VERSION,
    targetLang: payload.targetLang,
    text: translation.text,
    providerId: translation.providerId,
    modelId: translation.modelId,
  });

  return {
    text: translation.text,
    providerId: translation.providerId,
    modelId: translation.modelId,
    cached: false,
  };
}
