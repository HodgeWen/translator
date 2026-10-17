import { BgMessageError } from '@/lib/messaging';
import { t } from '@/lib/i18n';
import {
  ImageTranslationError,
  type ImageTranslationErrorCode
} from '@/lib/image-translate/types';

// 后台错误码 → 已有 i18n 文案键；未知码统一回落为 error_unknown。
const ERROR_MESSAGE_KEYS: Record<ImageTranslationErrorCode, string> = {
  NO_VISION_MODEL: 'error_image_translate_no_vision_model',
  IMAGE_FETCH_FAILED: 'error_image_translate_fetch_failed',
  IMAGE_DECODE_FAILED: 'error_image_load_failed',
  IMAGE_TOO_LARGE: 'error_image_too_large',
  VISION_RECOGNITION_FAILED: 'error_image_translate_recognize_failed',
  TRANSLATION_ALL_FAILED: 'error_image_translate_translate_failed'
};

function isKnownErrorCode(code: string): code is ImageTranslationErrorCode {
  return Object.prototype.hasOwnProperty.call(ERROR_MESSAGE_KEYS, code);
}

export function imageErrorKey(code: string | undefined): string {
  return code && isKnownErrorCode(code) ? ERROR_MESSAGE_KEYS[code] : 'error_unknown';
}

export function imageErrorMessage(code: string | undefined): string {
  return t(imageErrorKey(code));
}

/** 从后台响应错误或页面侧取图错误中提取稳定错误码 */
export function imageErrorCodeFrom(error: unknown): ImageTranslationErrorCode | undefined {
  if (error instanceof ImageTranslationError) return error.code;
  if (error instanceof BgMessageError && error.code && isKnownErrorCode(error.code)) {
    return error.code;
  }
  return undefined;
}
