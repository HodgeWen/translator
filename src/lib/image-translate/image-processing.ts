import { ImageTranslationError } from './types';

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 16384;
export const MAX_VISION_EDGE = 2048;

export type ImageBytes = Uint8Array<ArrayBuffer>;

export interface ImageSourceBytes {
  bytes: ImageBytes;
  mimeType: string;
}

export interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
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

/** 识图前等比缩放：最长边不超过 maxEdge，短边至少 1px */
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

/** 对原图字节计算 SHA-256，作为译文缓存键的一半 */
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

export function bytesToBase64(bytes: ImageBytes): string {
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

/**
 * 解码并等比缩放图片供视觉模型使用。
 * 原图字节的 SHA-256 由调用方在解码前算好，作为译文缓存键的一半。
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
    const context = canvas.getContext('2d');
    if (!context) {
      throw new ImageTranslationError('IMAGE_DECODE_FAILED', 'Canvas context is unavailable');
    }

    // 透明图片先铺白底，避免缩放后透明区域被编码成黑色。
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, scaled.width, scaled.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, scaled.width, scaled.height);

    const encoded = new Uint8Array(
      await (await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })).arrayBuffer()
    );

    return {
      dataUrl: 'data:image/jpeg;base64,' + bytesToBase64(encoded),
      width: bitmap.width,
      height: bitmap.height,
    };
  } catch (error) {
    if (error instanceof ImageTranslationError) throw error;
    throw new ImageTranslationError('IMAGE_DECODE_FAILED', 'Image could not be prepared');
  } finally {
    bitmap.close();
  }
}
