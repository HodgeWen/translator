import { describe, expect, test } from 'bun:test';
import { buildImageCacheKey, isImageCacheEntryExpired } from '../src/lib/cache';
import {
  MAX_IMAGE_BYTES,
  assertImageByteLimit,
  assertImageEdgeLimit,
  computeScaledSize,
  decodeDataUrl,
  sha256Hex,
} from '../src/lib/image-translate/image-processing';
import { ImageTranslationError } from '../src/lib/image-translate/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function errorCode(run: () => void): string | undefined {
  try {
    run();
  } catch (error) {
    return error instanceof ImageTranslationError ? error.code : undefined;
  }
  return undefined;
}

describe('image scaling and limits', () => {
  test('scales the longest edge down to 2048 while keeping the aspect ratio', () => {
    expect(computeScaledSize(4096, 1024)).toEqual({ width: 2048, height: 512 });
    expect(computeScaledSize(1024, 4096)).toEqual({ width: 512, height: 2048 });
    expect(computeScaledSize(1000, 800)).toEqual({ width: 1000, height: 800 });
    expect(computeScaledSize(10000, 1)).toEqual({ width: 2048, height: 1 });
    expect(computeScaledSize(100, 100, 64)).toEqual({ width: 64, height: 64 });
  });

  test('rejects invalid dimensions', () => {
    expect(errorCode(() => computeScaledSize(0, 100))).toBe('IMAGE_DECODE_FAILED');
    expect(errorCode(() => computeScaledSize(100, Number.NaN))).toBe('IMAGE_DECODE_FAILED');
  });

  test('enforces the 20MB byte limit and 16384px edge limit', () => {
    expect(() => assertImageByteLimit(MAX_IMAGE_BYTES - 1)).not.toThrow();
    expect(errorCode(() => assertImageByteLimit(MAX_IMAGE_BYTES))).toBe('IMAGE_TOO_LARGE');

    expect(() => assertImageEdgeLimit(16384, 100)).not.toThrow();
    expect(errorCode(() => assertImageEdgeLimit(16385, 100))).toBe('IMAGE_TOO_LARGE');
  });
});

describe('image bytes and hash input', () => {
  test('hashes the original image bytes with SHA-256', async () => {
    const bytes = new TextEncoder().encode('abc');

    await expect(sha256Hex(bytes)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  test('decodes base64 and URL-encoded data URLs', () => {
    const base64 = decodeDataUrl('data:image/png;base64,' + btoa('png-bytes'));
    expect(base64.mimeType).toBe('image/png');
    expect(new TextDecoder().decode(base64.bytes)).toBe('png-bytes');

    const encoded = decodeDataUrl('data:text/plain,hello%20world');
    expect(encoded.mimeType).toBe('text/plain');
    expect(new TextDecoder().decode(encoded.bytes)).toBe('hello world');
  });

  test('maps malformed data URLs to IMAGE_DECODE_FAILED', () => {
    expect(errorCode(() => decodeDataUrl('not-a-data-url'))).toBe('IMAGE_DECODE_FAILED');
  });
});

describe('image translation cache', () => {
  test('builds a stable (imageHash, promptVersion, targetLang) key', () => {
    expect(buildImageCacheKey('abc123', 'v4', 'zh-CN')).toEqual(['abc123', 'v4', 'zh-CN']);
  });

  test('expires translation entries after 7 days', () => {
    const now = Date.UTC(2026, 0, 1);

    expect(isImageCacheEntryExpired({ createdAt: now - 7 * DAY_MS + 1 }, now)).toBe(false);
    expect(isImageCacheEntryExpired({ createdAt: now - 7 * DAY_MS }, now)).toBe(false);
    expect(isImageCacheEntryExpired({ createdAt: now - 7 * DAY_MS - 1 }, now)).toBe(true);
  });
});
