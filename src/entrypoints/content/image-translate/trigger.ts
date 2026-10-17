import type { BgImageTranslatePayload, ImageTranslationResult } from '@/types';
import { ImageTranslationError, type ImageSource } from '@/lib/image-translate/types';
import { sendBgMessage } from '@/lib/messaging';
import { classifyImageSrc, matchesImageSrc, resolveImageSrc } from './image-target';
import { imageErrorCodeFrom, imageErrorMessage } from './errors';
import { ensureImageTranslateSettings, getImageTranslateTargetLang } from './settings';
import { clearImageStatus, setImageErrorStatus, setImageLoadingStatus } from './status-view';
import { removeImageOverlay, showImageOverlay } from './overlay';
import {
  clearImageTranslateState,
  getImageTranslateState,
  nextImageRequestId,
  setImageTranslateState
} from './state';

// 单飞：同一张图片加载中重复触发（悬浮按钮连点、右键重复点击）不再发第二次请求。
const inflight = new WeakMap<HTMLImageElement, Promise<void>>();

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readBlobUrlAsDataUrl(src: string): Promise<string> {
  let blob: Blob;
  try {
    const response = await fetch(src);
    blob = await response.blob();
  } catch (error) {
    throw new ImageTranslationError(
      'IMAGE_FETCH_FAILED',
      'Blob image could not be read: ' + errorDetail(error)
    );
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new ImageTranslationError('IMAGE_DECODE_FAILED', 'Blob image could not be encoded'));
      }
    };
    reader.onerror = () => {
      reject(new ImageTranslationError('IMAGE_DECODE_FAILED', 'Blob image could not be encoded'));
    };
    reader.readAsDataURL(blob);
  });
}

/** http(s) 交给 background 拉取；data: 直接透传；blob: 在页面侧转 data URL */
async function resolveImageSource(src: string): Promise<ImageSource> {
  const kind = classifyImageSrc(src);
  if (kind === 'url') {
    return { kind: 'url', url: src, pageUrl: location.href };
  }
  if (kind === 'dataUrl') {
    return { kind: 'dataUrl', dataUrl: src };
  }
  if (kind === 'blob') {
    return { kind: 'dataUrl', dataUrl: await readBlobUrlAsDataUrl(src) };
  }
  throw new ImageTranslationError(
    'IMAGE_FETCH_FAILED',
    'Unsupported image source: ' + src.slice(0, 32)
  );
}

async function runImageTranslation(image: HTMLImageElement): Promise<void> {
  const src = resolveImageSrc(image);
  if (!src) return;

  const requestId = nextImageRequestId();
  // 加载/错误徽标与覆盖层互斥：重新触发时先移除旧覆盖层。
  removeImageOverlay(image);
  setImageTranslateState(image, { status: 'loading', src, requestId });
  setImageLoadingStatus(image);

  // 更新的请求已接管状态与徽标时直接放弃；图片 src 在请求期间变了则作废本次状态。
  const isCurrentRequest = (): boolean => {
    const current = getImageTranslateState(image);
    if (current?.requestId !== requestId) return false;
    if (resolveImageSrc(image) !== src) {
      clearImageTranslateState(image);
      clearImageStatus(image);
      removeImageOverlay(image);
      return false;
    }
    return true;
  };

  try {
    await ensureImageTranslateSettings();
    const source = await resolveImageSource(src);
    const payload: BgImageTranslatePayload = {
      ...source,
      targetLang: getImageTranslateTargetLang()
    };
    const result = await sendBgMessage<ImageTranslationResult>({
      type: 'IMAGE_TRANSLATE',
      payload
    });

    if (!isCurrentRequest()) {
      clearImageStatus(image);
      return;
    }
    setImageTranslateState(image, {
      status: 'translated',
      src,
      requestId,
      result,
      view: 'translation'
    });
    clearImageStatus(image);
    showImageOverlay(image, result);
  } catch (error) {
    if (!isCurrentRequest()) {
      clearImageStatus(image);
      return;
    }
    const code = imageErrorCodeFrom(error);
    // 失败不留下半成品覆盖层。
    removeImageOverlay(image);
    setImageTranslateState(image, { status: 'error', src, requestId, errorCode: code });
    setImageErrorStatus(image, imageErrorMessage(code), () => {
      void triggerImageTranslation(image);
    });
    console.warn('[Translator] image translation failed:', error);
  }
}

export function triggerImageTranslation(image: HTMLImageElement): Promise<void> {
  const running = inflight.get(image);
  if (running) return running;

  const task = runImageTranslation(image).finally(() => {
    inflight.delete(image);
  });
  inflight.set(image, task);
  return task;
}

function findImageBySrcUrl(srcUrl: string): HTMLImageElement | null {
  for (const image of Array.from(document.images)) {
    if (
      matchesImageSrc(image.currentSrc, srcUrl, location.href) ||
      matchesImageSrc(image.src, srcUrl, location.href)
    ) {
      return image;
    }
  }
  return null;
}

/** 右键菜单（P5）经 TRANSLATE_IMAGE 消息触发指定图片 */
export function triggerImageTranslationBySrcUrl(srcUrl: string): Promise<void> {
  const image = findImageBySrcUrl(srcUrl);
  if (!image) {
    console.warn('[Translator] image not found for srcUrl:', srcUrl);
    return Promise.resolve();
  }
  return triggerImageTranslation(image);
}
