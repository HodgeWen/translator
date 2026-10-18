import { describe, expect, test } from 'bun:test';
import {
  IMAGE_HOVER_BUTTON_SIZE,
  IMAGE_HOVER_MIN_SIZE,
  IMAGE_UI_EDGE_MARGIN,
  classifyImageSrc,
  isImageLargeEnough,
  matchesImageSrc,
  resolveHoverButtonPosition
} from '../src/entrypoints/content/image-translate/image-target';
import { imageErrorKey } from '../src/entrypoints/content/image-translate/errors';

const BASE_URL = 'https://example.com/articles/page.html';

describe('image hover size filter', () => {
  test('accepts images rendered at least 200x200 CSS px', () => {
    expect(IMAGE_HOVER_MIN_SIZE).toBe(200);
    expect(isImageLargeEnough({ width: 200, height: 200 })).toBe(true);
    expect(isImageLargeEnough({ width: 200.5, height: 640 })).toBe(true);
    expect(isImageLargeEnough({ width: 1200, height: 800 })).toBe(true);
  });

  test('rejects icons and images smaller than the threshold on either axis', () => {
    expect(isImageLargeEnough({ width: 32, height: 32 })).toBe(false);
    expect(isImageLargeEnough({ width: 199, height: 400 })).toBe(false);
    expect(isImageLargeEnough({ width: 400, height: 199.9 })).toBe(false);
    expect(isImageLargeEnough({ width: 0, height: 0 })).toBe(false);
    expect(isImageLargeEnough({ width: Number.NaN, height: 400 })).toBe(false);
  });
});

describe('image source classification', () => {
  test('routes http(s) images to the background fetch path', () => {
    expect(classifyImageSrc('https://example.com/photo.png')).toBe('url');
    expect(classifyImageSrc('http://example.com/photo.png?v=2')).toBe('url');
    expect(classifyImageSrc('HTTPS://example.com/photo.png')).toBe('url');
  });

  test('passes data URLs straight through', () => {
    expect(classifyImageSrc('data:image/png;base64,iVBORw0KGgo=')).toBe('dataUrl');
    expect(classifyImageSrc('data:image/svg+xml,%3Csvg%3E%3C/svg%3E')).toBe('dataUrl');
  });

  test('reads blob URLs on the page side', () => {
    expect(classifyImageSrc('blob:https://example.com/0e1f2a3b')).toBe('blob');
  });

  test('marks empty or unsupported sources', () => {
    expect(classifyImageSrc('')).toBe('unsupported');
    expect(classifyImageSrc(null)).toBe('unsupported');
    expect(classifyImageSrc(undefined)).toBe('unsupported');
    expect(classifyImageSrc('chrome-extension://abc/icon.png')).toBe('unsupported');
    expect(classifyImageSrc('ftp://example.com/photo.png')).toBe('unsupported');
    expect(classifyImageSrc('/relative/photo.png')).toBe('unsupported');
  });
});

describe('image src matching for TRANSLATE_IMAGE messages', () => {
  test('matches absolute http(s) URLs', () => {
    expect(
      matchesImageSrc('https://cdn.example.com/a.png', 'https://cdn.example.com/a.png', BASE_URL)
    ).toBe(true);
    expect(
      matchesImageSrc('https://cdn.example.com/a.png', 'https://cdn.example.com/b.png', BASE_URL)
    ).toBe(false);
  });

  test('resolves relative candidates against the page URL', () => {
    expect(matchesImageSrc('/images/a.png', 'https://example.com/images/a.png', BASE_URL)).toBe(
      true
    );
    expect(matchesImageSrc('images/a.png', 'https://example.com/articles/images/a.png', BASE_URL)).toBe(
      true
    );
  });

  test('matches data and blob URLs exactly', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    expect(matchesImageSrc(dataUrl, dataUrl, BASE_URL)).toBe(true);
    expect(matchesImageSrc(dataUrl, dataUrl + 'x', BASE_URL)).toBe(false);
    const blobUrl = 'blob:https://example.com/0e1f2a3b';
    expect(matchesImageSrc(blobUrl, blobUrl, BASE_URL)).toBe(true);
  });

  test('rejects empty or unresolvable sources', () => {
    expect(matchesImageSrc('', 'https://example.com/a.png', BASE_URL)).toBe(false);
    expect(matchesImageSrc('https://example.com/a.png', '', BASE_URL)).toBe(false);
    expect(matchesImageSrc('https://example.com/a.png', 'https://example.com/a.png', 'not-a-url')).toBe(
      false
    );
  });
});

describe('hover button positioning', () => {
  test('anchors the button to the image top-right corner with a margin', () => {
    expect(
      resolveHoverButtonPosition(
        { top: 100, right: 1000 },
        { width: 1200, height: 800 }
      )
    ).toEqual({
      top: 100 + IMAGE_UI_EDGE_MARGIN,
      left: 1000 - IMAGE_HOVER_BUTTON_SIZE - IMAGE_UI_EDGE_MARGIN
    });
  });

  test('keeps the button inside the viewport for edge and offscreen images', () => {
    expect(resolveHoverButtonPosition({ top: 790, right: 20 }, { width: 1200, height: 800 })).toEqual({
      top: 800 - IMAGE_HOVER_BUTTON_SIZE - IMAGE_UI_EDGE_MARGIN,
      left: IMAGE_UI_EDGE_MARGIN
    });
    expect(resolveHoverButtonPosition({ top: -50, right: 1180 }, { width: 1200, height: 800 })).toEqual({
      top: IMAGE_UI_EDGE_MARGIN,
      left: 1180 - IMAGE_HOVER_BUTTON_SIZE - IMAGE_UI_EDGE_MARGIN
    });
    expect(resolveHoverButtonPosition({ top: 40, right: 1400 }, { width: 1200, height: 800 })).toEqual({
      top: 40 + IMAGE_UI_EDGE_MARGIN,
      left: 1200 - IMAGE_HOVER_BUTTON_SIZE - IMAGE_UI_EDGE_MARGIN
    });
  });
});

describe('image translation error message mapping', () => {
  test('maps every background error code to an i18n message key', () => {
    expect(imageErrorKey('NO_VISION_MODEL')).toBe('error_image_translate_no_vision_model');
    expect(imageErrorKey('IMAGE_FETCH_FAILED')).toBe('error_image_translate_fetch_failed');
    expect(imageErrorKey('IMAGE_DECODE_FAILED')).toBe('error_image_load_failed');
    expect(imageErrorKey('IMAGE_TOO_LARGE')).toBe('error_image_too_large');
    expect(imageErrorKey('VISION_TIMEOUT')).toBe('error_image_translate_vision_timeout');
    expect(imageErrorKey('VISION_MODEL_UNSUPPORTED')).toBe(
      'error_image_translate_model_unsupported'
    );
    expect(imageErrorKey('VISION_HTTP_ERROR')).toBe('error_image_translate_http_error');
    expect(imageErrorKey('VISION_RECOGNITION_FAILED')).toBe(
      'error_image_translate_recognize_failed'
    );
    expect(imageErrorKey('TRANSLATION_ALL_FAILED')).toBe('error_image_translate_translate_failed');
  });

  test('falls back to error_unknown for missing or unknown codes', () => {
    expect(imageErrorKey(undefined)).toBe('error_unknown');
    expect(imageErrorKey('SOMETHING_ELSE')).toBe('error_unknown');
    expect(imageErrorKey('toString')).toBe('error_unknown');
    expect(imageErrorKey('__proto__')).toBe('error_unknown');
  });
});
