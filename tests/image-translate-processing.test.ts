import { describe, expect, test } from 'bun:test';
import { buildImageCacheKey, isImageCacheEntryExpired } from '../src/lib/cache';
import {
  MAX_IMAGE_BYTES,
  assertImageByteLimit,
  assertImageEdgeLimit,
  computeScaledSize,
  decodeDataUrl,
  loadImageBytes,
  sampleBackgroundColor,
  sha256Hex,
} from '../src/lib/image-translate/image-processing';
import {
  boxToPercentRect,
  boxToPixelRect,
  contrastRatioForHex,
  fitFontSize,
  pickContrastColor,
} from '../src/lib/image-translate/layout';
import { shouldSkipImageBlock } from '../src/lib/image-translate/pipeline';
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

function makePixels(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => [number, number, number, number]
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const [r, g, b, a] = colorAt(x, y);
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = a;
    }
  }
  return pixels;
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

  test('decodes base64 and URL-encoded data URLs', async () => {
    const base64 = decodeDataUrl('data:image/png;base64,' + btoa('png-bytes'));
    expect(base64.mimeType).toBe('image/png');
    expect(new TextDecoder().decode(base64.bytes)).toBe('png-bytes');

    const encoded = decodeDataUrl('data:text/plain,hello%20world');
    expect(encoded.mimeType).toBe('text/plain');
    expect(new TextDecoder().decode(encoded.bytes)).toBe('hello world');

    const loaded = await loadImageBytes({
      kind: 'dataUrl',
      dataUrl: 'data:image/png;base64,' + btoa('png-bytes'),
    });
    expect(loaded.bytes).toEqual(base64.bytes);
  });

  test('maps malformed data URLs to IMAGE_DECODE_FAILED', () => {
    expect(errorCode(() => decodeDataUrl('not-a-data-url'))).toBe('IMAGE_DECODE_FAILED');
  });
});

describe('layout helpers', () => {
  test('maps normalized boxes to pixel and percentage rectangles', () => {
    const box = { x: 0.1, y: 0.2, w: 0.5, h: 0.3 };
    const pixelRect = boxToPixelRect(box, 1000, 500);

    expect(pixelRect.left).toBeCloseTo(100);
    expect(pixelRect.top).toBeCloseTo(100);
    expect(pixelRect.width).toBeCloseTo(500);
    expect(pixelRect.height).toBeCloseTo(150);
    expect(boxToPercentRect(box)).toEqual({
      left: '10%',
      top: '20%',
      width: '50%',
      height: '30%',
    });
  });

  test('fits the font size inside min/max bounds and shrinks dense text', () => {
    const short = fitFontSize('Hello', 200, 60);
    expect(short).toBeGreaterThanOrEqual(10);
    expect(short).toBeLessThanOrEqual(32);

    const dense = fitFontSize('word '.repeat(100), 200, 60);
    expect(dense).toBeLessThan(short);
    expect(dense).toBeGreaterThanOrEqual(10);

    // 中文译文在原文行高内必须缩到单行，否则两行会被覆盖块裁掉半行。
    const cjk = fitFontSize('本季度收入增长了18%。', 270, 30, {
      minFontSize: 8,
      maxFontSize: 40,
      lineHeightRatio: 1.15,
    });
    const cjkShort = fitFontSize('季度报告', 270, 30, {
      minFontSize: 8,
      maxFontSize: 40,
      lineHeightRatio: 1.15,
    });
    expect(cjk).toBeLessThan(cjkShort);
    expect(cjk).toBeLessThanOrEqual(24);

    expect(fitFontSize('X', 0, 0)).toBe(10);
    expect(fitFontSize('X', 1000, 1000, { maxFontSize: 24 })).toBe(24);
  });

  test('picks a black or white text color with at least 4.5:1 contrast', () => {
    const backgrounds = ['#ffffff', '#000000', '#777777', '#123456', '#abc', '#ff00ff80'];

    for (const background of backgrounds) {
      const foreground = pickContrastColor(background);
      const ratio = contrastRatioForHex(foreground, background);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    }

    expect(pickContrastColor('#ffffff')).toBe('#000000');
    expect(pickContrastColor('#000000')).toBe('#ffffff');
    expect(contrastRatioForHex('#123456', 'invalid')).toBeNull();
  });
});

describe('background sampling', () => {
  test('takes the median color of the ring around a block, not the mean', () => {
    const red: [number, number, number, number] = [255, 0, 0, 255];
    const blue: [number, number, number, number] = [0, 0, 255, 255];
    const blueCorners = new Set(['0,0', '4,0', '0,4', '4,4']);
    const pixels = makePixels(5, 5, (x, y) => (blueCorners.has(`${x},${y}`) ? blue : red));

    // 中心 3x3 是文字块，外圈 16 像素为 12 红 + 4 蓝；中位色仍是红，均值会偏紫。
    const color = sampleBackgroundColor(pixels, 5, 5, { x: 0.2, y: 0.2, w: 0.6, h: 0.6 }, 1);

    expect(color).toBe('#ff0000');
  });

  test('falls back to the whole image when the box covers everything', () => {
    const pixels = makePixels(4, 4, () => [10, 20, 30, 255]);

    expect(sampleBackgroundColor(pixels, 4, 4, { x: 0, y: 0, w: 1, h: 1 }, 1)).toBe('#0a141e');
  });

  test('ignores fully transparent ring pixels', () => {
    const pixels = makePixels(3, 3, (x, y) =>
      x === 0 || y === 0 ? [0, 0, 0, 0] : [0, 128, 0, 255]
    );

    expect(sampleBackgroundColor(pixels, 3, 3, { x: 1 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 }, 1)).toBe(
      '#008000'
    );
  });
});

describe('image recognition cache', () => {
  test('builds a stable (imageHash, promptVersion) key', () => {
    expect(buildImageCacheKey('abc123', 'v1')).toEqual(['abc123', 'v1']);
  });

  test('expires recognition entries after 7 days', () => {
    const now = Date.UTC(2026, 0, 1);

    expect(isImageCacheEntryExpired({ createdAt: now - 7 * DAY_MS + 1 }, now)).toBe(false);
    expect(isImageCacheEntryExpired({ createdAt: now - 7 * DAY_MS }, now)).toBe(false);
    expect(isImageCacheEntryExpired({ createdAt: now - 7 * DAY_MS - 1 }, now)).toBe(true);
  });
});

describe('target language skip', () => {
  test('skips recognized blocks already in the target language', async () => {
    expect(await shouldSkipImageBlock('今天天气真好，我们出去散步吧。', 'zh-CN')).toBe(true);
    expect(await shouldSkipImageBlock('今天天气真好，我们出去散步吧。', 'en')).toBe(false);
    expect(await shouldSkipImageBlock('The weather is really nice today.', 'zh-CN')).toBe(false);
  });
});
