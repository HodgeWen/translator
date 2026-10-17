import type { ImageTranslationResult } from '@/types';
import type { ImageTranslationErrorCode } from '@/lib/image-translate/types';
import type { ImageOverlayView } from './overlay-model';

export type ImageTranslateStatus = 'loading' | 'translated' | 'error';

// 每张图片的翻译状态：P6 覆盖层据此渲染/切回/关闭，requestId 用于丢弃迟到结果。
export interface ImageTranslateState {
  status: ImageTranslateStatus;
  src: string;
  requestId: number;
  result?: ImageTranslationResult;
  errorCode?: ImageTranslationErrorCode;
  /** 覆盖层原文/译文视图；关闭覆盖层会清除状态，迟到结果随之作废 */
  view?: ImageOverlayView;
}

const imageStates = new WeakMap<HTMLImageElement, ImageTranslateState>();
let requestSeq = 0;

export function nextImageRequestId(): number {
  requestSeq += 1;
  return requestSeq;
}

export function getImageTranslateState(
  image: HTMLImageElement
): ImageTranslateState | undefined {
  return imageStates.get(image);
}

export function setImageTranslateState(
  image: HTMLImageElement,
  next: ImageTranslateState
): void {
  imageStates.set(image, next);
}

export function clearImageTranslateState(image: HTMLImageElement): void {
  imageStates.delete(image);
}

/** 覆盖层切换原文/译文；状态已被关闭或新请求替换时忽略 */
export function setImageTranslateView(image: HTMLImageElement, view: ImageOverlayView): void {
  const current = imageStates.get(image);
  if (!current) return;
  imageStates.set(image, { ...current, view });
}
