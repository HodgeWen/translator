import type {
  BgImageTranslatePayload,
  ImageTranslationBlock,
  ImageTranslationResult,
} from '@/types';
import { translate } from '@/lib/api';
import { getCachedImageTranslation, setCachedImageTranslation } from '@/lib/cache';
import { detectLanguageLocal, shouldSkipByLanguage } from '@/lib/lang-detect';
import { recognizeImageText, resolveVisionRunContext } from '@/lib/api/vision';
import { IMAGE_VISION_PROMPT_VERSION } from './vision-prompt';
import {
  loadImageBytes,
  prepareImageForVision,
  sampleBackgroundColor,
  sha256Hex,
  type PreparedImage,
} from './image-processing';
import {
  ImageTranslationError,
  type ImageTextBlock,
  type RecognizedImageBlock,
} from './types';

const TRANSLATION_CONCURRENCY = 3;

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

export async function shouldSkipImageBlock(text: string, targetLang: string): Promise<boolean> {
  // 图片没有 lang 属性，先做本地语言检测，再复用页面翻译的目标语言跳过判定。
  const detectedLang = await detectLanguageLocal(text);
  return shouldSkipByLanguage(detectedLang, null, text, targetLang);
}

/** 逐块复用现有 translate()：已是目标语言的块跳过，单块失败不拖垮其余块 */
async function translateBlocks(
  blocks: RecognizedImageBlock[],
  targetLang: string
): Promise<ImageTranslationBlock[]> {
  const skipFlags = await Promise.all(
    blocks.map((block) => shouldSkipImageBlock(block.text, targetLang))
  );

  const results: ImageTranslationBlock[] = blocks.map((block, index) => ({
    ...block,
    skipped: skipFlags[index],
  }));

  const pending = results.filter((block) => !block.skipped);
  let failedCount = 0;

  await runWithConcurrency(pending, TRANSLATION_CONCURRENCY, async (block) => {
    try {
      const response = await translate({ text: block.text, targetLang });
      block.translatedText = response.text;
    } catch {
      failedCount += 1;
    }
  });

  if (pending.length > 0 && failedCount === pending.length) {
    throw new ImageTranslationError(
      'TRANSLATION_ALL_FAILED',
      'All recognized image text blocks failed to translate'
    );
  }

  return results;
}

function addSampledBackgrounds(
  prepared: PreparedImage,
  blocks: ImageTextBlock[]
): RecognizedImageBlock[] {
  return blocks.map((block) => ({
    ...block,
    bgColor: sampleBackgroundColor(
      prepared.pixels,
      prepared.scaledWidth,
      prepared.scaledHeight,
      block.box
    ),
  }));
}

/**
 * 图片翻译后台编排：先确认有视觉模型（无模型不拉图）→ 取图/哈希/查识别缓存 →
 * 未命中时缩放识图并写缓存 → 逐块复用 translate()。
 */
export async function translateImage(
  payload: BgImageTranslatePayload
): Promise<ImageTranslationResult> {
  const visionContext = await resolveVisionRunContext();

  const image = await loadImageBytes(payload);
  const imageHash = await sha256Hex(image.bytes);

  const cached = await getCachedImageTranslation(imageHash, IMAGE_VISION_PROMPT_VERSION);
  if (cached) {
    return {
      blocks: await translateBlocks(cached.blocks, payload.targetLang),
      providerId: cached.providerId,
      modelId: cached.modelId,
      cached: true,
      width: cached.width,
      height: cached.height,
    };
  }

  const prepared = await prepareImageForVision(image);
  const recognition = await recognizeImageText(prepared.dataUrl, visionContext);
  const blocks = addSampledBackgrounds(prepared, recognition.blocks);

  await setCachedImageTranslation({
    imageHash,
    promptVersion: IMAGE_VISION_PROMPT_VERSION,
    blocks,
    width: prepared.width,
    height: prepared.height,
    providerId: recognition.providerId,
    modelId: recognition.modelId,
  });

  return {
    blocks: await translateBlocks(blocks, payload.targetLang),
    providerId: recognition.providerId,
    modelId: recognition.modelId,
    cached: false,
    width: prepared.width,
    height: prepared.height,
  };
}
