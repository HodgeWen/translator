import type { ImageBox, ImageSource } from './types';
import { ImageTranslationError } from './types';
import { boxToPixelRect, type PixelRect } from './layout';

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 16384;
export const MAX_VISION_EDGE = 2048;

const MIN_RING_THICKNESS = 2;
const MAX_RING_THICKNESS = 12;
const RING_THICKNESS_RATIO = 0.006;

export type ImageBytes = Uint8Array<ArrayBuffer>;

export interface ImageSourceBytes {
  bytes: ImageBytes;
  mimeType: string;
}

export interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
  scaledWidth: number;
  scaledHeight: number;
  pixels: Uint8ClampedArray;
}

interface ColorHistogram {
  red: Uint32Array;
  green: Uint32Array;
  blue: Uint32Array;
  count: number;
}

const DATA_URL_PATTERN = /^data:([^,]*?),(.*)$/s;

/** 字节上限：单张 ≥ 20MB 视为超限 */
export function assertImageByteLimit(byteLength: number): void {
  if (byteLength >= MAX_IMAGE_BYTES) {
    throw new ImageTranslationError(
      'IMAGE_TOO_LARGE',
      'Image exceeds the ' + MAX_IMAGE_BYTES / (1024 * 1024) + ' MB limit'
    );
  }
}

/** 解码后的边长上限：最长边 > 16384px 视为超限 */
export function assertImageEdgeLimit(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new ImageTranslationError('IMAGE_DECODE_FAILED', 'Image has invalid dimensions');
  }
  if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE) {
    throw new ImageTranslationError(
      'IMAGE_TOO_LARGE',
      'Image edge exceeds the ' + MAX_IMAGE_EDGE + ' px limit'
    );
  }
}

/** 识别前等比缩放：最长边不超过 maxEdge，短边至少 1px */
export function computeScaledSize(
  width: number,
  height: number,
  maxEdge = MAX_VISION_EDGE
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new ImageTranslationError('IMAGE_DECODE_FAILED', 'Image has invalid dimensions');
  }

  const longestEdge = Math.max(width, height);
  if (longestEdge <= maxEdge) {
    return { width, height };
  }

  const scale = maxEdge / longestEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** 对原图字节计算 SHA-256，作为识别缓存键的一半 */
export async function sha256Hex(bytes: ImageBytes): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function base64ToBytes(payload: string): ImageBytes {
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: ImageBytes): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

/** 解析 data: 图片为原始字节；malformed 时报 IMAGE_DECODE_FAILED */
export function decodeDataUrl(dataUrl: string): ImageSourceBytes {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) {
    throw new ImageTranslationError('IMAGE_DECODE_FAILED', 'Image data URL is malformed');
  }

  const meta = match[1];
  const payload = match[2];
  const mimeType = meta.split(';')[0].trim() || 'application/octet-stream';

  let bytes: ImageBytes;
  try {
    bytes = /;base64/i.test(meta)
      ? base64ToBytes(payload)
      : new TextEncoder().encode(decodeURIComponent(payload));
  } catch {
    throw new ImageTranslationError('IMAGE_DECODE_FAILED', 'Image data URL could not be decoded');
  }

  assertImageByteLimit(bytes.byteLength);
  return { bytes, mimeType };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchHttpImage(url: string, pageUrl?: string): Promise<ImageSourceBytes> {
  if (!isHttpUrl(url)) {
    throw new ImageTranslationError('IMAGE_FETCH_FAILED', 'Only http(s) image URLs can be fetched');
  }

  const init: RequestInit = { credentials: 'include' };
  if (pageUrl && isHttpUrl(pageUrl)) {
    init.referrer = pageUrl;
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ImageTranslationError('IMAGE_FETCH_FAILED', 'Image fetch failed: ' + detail);
  }

  if (!response.ok) {
    throw new ImageTranslationError(
      'IMAGE_FETCH_FAILED',
      'Image fetch failed with HTTP ' + response.status
    );
  }

  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null && Number.isFinite(Number(declaredLength))) {
    assertImageByteLimit(Number(declaredLength));
  }

  let bytes: ImageBytes;
  try {
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ImageTranslationError('IMAGE_FETCH_FAILED', 'Image body could not be read: ' + detail);
  }

  assertImageByteLimit(bytes.byteLength);
  return {
    bytes,
    mimeType: response.headers.get('content-type')?.split(';')[0].trim() || '',
  };
}

/** 取图入口：http(s) 按页面 referrer 拉取，data: 直接解码 */
export async function loadImageBytes(source: ImageSource): Promise<ImageSourceBytes> {
  if (source.kind === 'dataUrl') {
    return decodeDataUrl(source.dataUrl);
  }
  return fetchHttpImage(source.url, source.pageUrl);
}

/**
 * 解码并等比缩放图片供识图使用，同时返回缩小图的像素数据用于背景采样。
 * 原图字节的 SHA-256 由调用方在解码前算好，作为识别缓存键的一半。
 */
export async function prepareImageForVision(source: ImageSourceBytes): Promise<PreparedImage> {
  const { bytes } = source;
  assertImageByteLimit(bytes.byteLength);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(
      new Blob([bytes], { type: source.mimeType || 'application/octet-stream' })
    );
  } catch {
    throw new ImageTranslationError('IMAGE_DECODE_FAILED', 'Image could not be decoded');
  }

  try {
    assertImageEdgeLimit(bitmap.width, bitmap.height);

    const scaled = computeScaledSize(bitmap.width, bitmap.height);
    const canvas = new OffscreenCanvas(scaled.width, scaled.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new ImageTranslationError('IMAGE_DECODE_FAILED', 'Canvas context is unavailable');
    }

    // 透明图片先铺白底，避免缩放后透明区域被编码成黑色。
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, scaled.width, scaled.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, scaled.width, scaled.height);

    const pixels = context.getImageData(0, 0, scaled.width, scaled.height).data;
    const encoded = new Uint8Array(
      await (await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })).arrayBuffer()
    );

    return {
      dataUrl: 'data:image/jpeg;base64,' + bytesToBase64(encoded),
      width: bitmap.width,
      height: bitmap.height,
      scaledWidth: scaled.width,
      scaledHeight: scaled.height,
      pixels,
    };
  } catch (error) {
    if (error instanceof ImageTranslationError) throw error;
    throw new ImageTranslationError('IMAGE_DECODE_FAILED', 'Image could not be prepared');
  } finally {
    bitmap.close();
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createHistogram(): ColorHistogram {
  return {
    red: new Uint32Array(256),
    green: new Uint32Array(256),
    blue: new Uint32Array(256),
    count: 0,
  };
}

function addPixel(histogram: ColorHistogram, pixels: Uint8ClampedArray, index: number): void {
  // 全透明像素不是背景，跳过以免把透明边距采成黑色。
  if (pixels[index + 3] < 16) return;
  histogram.red[pixels[index]] += 1;
  histogram.green[pixels[index + 1]] += 1;
  histogram.blue[pixels[index + 2]] += 1;
  histogram.count += 1;
}

function addRect(
  histogram: ColorHistogram,
  pixels: Uint8ClampedArray,
  imageWidth: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
  exclude?: { left: number; top: number; right: number; bottom: number }
): void {
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      if (
        exclude &&
        x >= exclude.left &&
        x < exclude.right &&
        y >= exclude.top &&
        y < exclude.bottom
      ) {
        continue;
      }
      addPixel(histogram, pixels, (y * imageWidth + x) * 4);
    }
  }
}

function medianChannel(histogram: Uint32Array, total: number): number {
  const target = Math.ceil(total / 2);
  let cumulative = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    cumulative += histogram[value];
    if (cumulative >= target) return value;
  }
  return 0;
}

function histogramToHex(histogram: ColorHistogram): string {
  const channels = [
    medianChannel(histogram.red, histogram.count),
    medianChannel(histogram.green, histogram.count),
    medianChannel(histogram.blue, histogram.count),
  ];
  return '#' + channels.map((value) => value.toString(16).padStart(2, '0')).join('');
}

function defaultRingThickness(imageWidth: number, imageHeight: number): number {
  return clamp(
    Math.round(Math.min(imageWidth, imageHeight) * RING_THICKNESS_RATIO),
    MIN_RING_THICKNESS,
    MAX_RING_THICKNESS
  );
}

/**
 * 在缩小图上按归一化框采样周边背景色（框外一圈的中位色）。
 * 框覆盖整图或周边全透明时退回全图中位色，仍无可用像素时返回白色。
 */
export function sampleBackgroundColor(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  box: ImageBox,
  ringThickness?: number
): string {
  if (
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    pixels.length < imageWidth * imageHeight * 4
  ) {
    return '#ffffff';
  }

  const rect: PixelRect = boxToPixelRect(box, imageWidth, imageHeight);
  const left = clamp(Math.floor(rect.left), 0, imageWidth);
  const top = clamp(Math.floor(rect.top), 0, imageHeight);
  const right = clamp(Math.ceil(rect.left + rect.width), 0, imageWidth);
  const bottom = clamp(Math.ceil(rect.top + rect.height), 0, imageHeight);
  const thickness = ringThickness ?? defaultRingThickness(imageWidth, imageHeight);

  const ringHistogram = createHistogram();
  addRect(
    ringHistogram,
    pixels,
    imageWidth,
    clamp(left - thickness, 0, imageWidth),
    clamp(top - thickness, 0, imageHeight),
    clamp(right + thickness, 0, imageWidth),
    clamp(bottom + thickness, 0, imageHeight),
    { left, top, right, bottom }
  );

  if (ringHistogram.count > 0) {
    return histogramToHex(ringHistogram);
  }

  const fallbackHistogram = createHistogram();
  addRect(fallbackHistogram, pixels, imageWidth, 0, 0, imageWidth, imageHeight);
  return fallbackHistogram.count > 0 ? histogramToHex(fallbackHistogram) : '#ffffff';
}
