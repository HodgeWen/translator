import { describe, expect, test } from 'bun:test'
import { MAX_IMAGE_BYTES } from '../src/lib/image-translate/image-processing'
import {
  imageTranslationErrorKey,
  localImageFileErrorKey,
  resolveLocalImageTargetLang,
  validateLocalImageFile
} from '../src/lib/image-translate/local-image'

describe('local image file validation', () => {
  test('accepts PNG, JPEG and WebP files below the size limit', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(validateLocalImageFile({ type, size: 1024 })).toBeNull()
    }
  })

  test('rejects unsupported MIME types', () => {
    for (const type of ['image/gif', 'image/svg+xml', 'text/plain', '']) {
      expect(validateLocalImageFile({ type, size: 1024 })).toBe('UNSUPPORTED_FORMAT')
    }
  })

  test('rejects empty files', () => {
    expect(validateLocalImageFile({ type: 'image/png', size: 0 })).toBe('EMPTY_FILE')
  })

  test('uses the same 20MB boundary as the background pipeline', () => {
    expect(validateLocalImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES - 1 })).toBeNull()
    expect(validateLocalImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES })).toBe('TOO_LARGE')
  })
})

describe('local image target language', () => {
  test('uses the explicit popup selection when not in auto mode', () => {
    expect(resolveLocalImageTargetLang('fr', 'ja', 'en')).toBe('fr')
  })

  test('reuses the popup target preview in auto mode', () => {
    expect(resolveLocalImageTargetLang('auto', 'ja', 'en')).toBe('ja')
  })

  test('falls back to the native language when the preview is empty', () => {
    expect(resolveLocalImageTargetLang('auto', '', 'en')).toBe('en')
  })
})

describe('local image error copy', () => {
  test('maps validation errors to localized message keys', () => {
    expect(localImageFileErrorKey('UNSUPPORTED_FORMAT')).toBe('error_image_invalid_format')
    expect(localImageFileErrorKey('EMPTY_FILE')).toBe('error_image_load_failed')
    expect(localImageFileErrorKey('TOO_LARGE')).toBe('error_image_too_large')
  })

  test('maps background image error codes and falls back for unknown errors', () => {
    expect(imageTranslationErrorKey('NO_VISION_MODEL')).toBe(
      'error_image_translate_no_vision_model'
    )
    expect(imageTranslationErrorKey('IMAGE_DECODE_FAILED')).toBe('error_image_load_failed')
    expect(imageTranslationErrorKey('TRANSLATION_ALL_FAILED')).toBe(
      'error_image_translate_translate_failed'
    )
    expect(imageTranslationErrorKey(undefined)).toBe('error_translation_failed')
    expect(imageTranslationErrorKey('UNKNOWN')).toBe('error_translation_failed')
  })
})
