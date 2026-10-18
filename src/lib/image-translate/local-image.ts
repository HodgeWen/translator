import type { LangCode } from '@/types'
import { MAX_IMAGE_BYTES } from './image-processing'

/** popup 本地图片入口允许的 MIME 类型 */
export const LOCAL_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

/** 可直接用于 <input type="file" accept> 的格式列表 */
export const LOCAL_IMAGE_ACCEPT = LOCAL_IMAGE_MIME_TYPES.join(',')

export type LocalImageFileError = 'UNSUPPORTED_FORMAT' | 'EMPTY_FILE' | 'TOO_LARGE'

export interface LocalImageFileInfo {
  type: string
  size: number
}

/**
 * 选择/拖拽/粘贴文件的第一道校验：只放行 PNG/JPEG/WebP，拒绝空文件与
 * 与后台一致的 20MB 上限（单张 ≥ 20MB 视为超限）。
 */
export function validateLocalImageFile(file: LocalImageFileInfo): LocalImageFileError | null {
  if (!LOCAL_IMAGE_MIME_TYPES.includes(file.type as (typeof LOCAL_IMAGE_MIME_TYPES)[number])) {
    return 'UNSUPPORTED_FORMAT'
  }
  if (file.size === 0) return 'EMPTY_FILE'
  if (file.size >= MAX_IMAGE_BYTES) return 'TOO_LARGE'
  return null
}

const LOCAL_IMAGE_FILE_ERROR_KEYS: Record<LocalImageFileError, string> = {
  UNSUPPORTED_FORMAT: 'error_image_invalid_format',
  EMPTY_FILE: 'error_image_load_failed',
  TOO_LARGE: 'error_image_too_large'
}

/** 本地文件校验错误 → i18n key */
export function localImageFileErrorKey(error: LocalImageFileError): string {
  return LOCAL_IMAGE_FILE_ERROR_KEYS[error]
}

// 后台图片链路返回的错误码 → popup 用户文案
const IMAGE_TRANSLATION_ERROR_KEYS: Record<string, string> = {
  NO_VISION_MODEL: 'error_image_translate_no_vision_model',
  IMAGE_FETCH_FAILED: 'error_image_translate_fetch_failed',
  IMAGE_DECODE_FAILED: 'error_image_load_failed',
  IMAGE_TOO_LARGE: 'error_image_too_large',
  VISION_TIMEOUT: 'error_image_translate_vision_timeout',
  VISION_MODEL_UNSUPPORTED: 'error_image_translate_model_unsupported',
  VISION_HTTP_ERROR: 'error_image_translate_http_error',
  VISION_RECOGNITION_FAILED: 'error_image_translate_recognize_failed',
  TRANSLATION_ALL_FAILED: 'error_image_translate_translate_failed'
}

/** 后台错误码 / 本地解码错误 → i18n key；未知错误回落到通用翻译失败 */
export function imageTranslationErrorKey(code: string | undefined): string {
  return (code && IMAGE_TRANSLATION_ERROR_KEYS[code]) || 'error_translation_failed'
}

/**
 * popup 手动选择优先；自动模式沿用当前目标语言预览（与外层目标语言提示一致）。
 * preview 为空时回落到母语，保证请求始终有合法目标语言。
 */
export function resolveLocalImageTargetLang(
  manualTarget: string,
  targetLangPreview: LangCode,
  nativeLanguage: LangCode
): LangCode {
  if (manualTarget !== 'auto') return manualTarget
  return targetLangPreview || nativeLanguage
}
