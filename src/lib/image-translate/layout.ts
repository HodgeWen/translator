import type { ImageBox } from './types';

export interface PixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PercentRect {
  left: string;
  top: string;
  width: string;
  height: string;
}

export interface FontFitOptions {
  minFontSize?: number;
  maxFontSize?: number;
  lineHeightRatio?: number;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const DEFAULT_MIN_FONT_SIZE = 10;
const DEFAULT_MAX_FONT_SIZE = 32;
const DEFAULT_LINE_HEIGHT_RATIO = 1.25;
const BLACK: RgbColor = { r: 0, g: 0, b: 0 };
const WHITE: RgbColor = { r: 255, g: 255, b: 255 };

/** 归一化框（相对原图 0–1）→ 渲染区域内的像素矩形 */
export function boxToPixelRect(box: ImageBox, width: number, height: number): PixelRect {
  return {
    left: box.x * width,
    top: box.y * height,
    width: box.w * width,
    height: box.h * height,
  };
}

function toPercent(value: number): string {
  return `${Number((value * 100).toFixed(4))}%`;
}

/** 归一化框 → 可直接用于 CSS 的百分比矩形 */
export function boxToPercentRect(box: ImageBox): PercentRect {
  return {
    left: toPercent(box.x),
    top: toPercent(box.y),
    width: toPercent(box.w),
    height: toPercent(box.h),
  };
}

// 覆盖块有 2px 左右内边距；估算宽度时为实际可用宽度留出余量，避免浏览器字体
// 比估算更宽时换成两行、再被 overflow:hidden 裁掉半行。
const BLOCK_HORIZONTAL_PADDING = 4;
const WIDTH_SAFETY_RATIO = 0.97;

// 全角/宽字符按略大于一个字号的宽度估算，其余按 0.62 个字号估算，偏向保守。
function isWideChar(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6)
  );
}

function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    width += (isWideChar(char) ? 1.02 : 0.62) * fontSize;
  }
  return width;
}

/**
 * 按块尺寸与文本长度选择字号：先以框高限制单行字号，再在文本换行放不下时逐级收缩，
 * 结果始终落在 minFontSize–maxFontSize 内。
 */
export function fitFontSize(
  text: string,
  boxWidth: number,
  boxHeight: number,
  options: FontFitOptions = {}
): number {
  const minFontSize = options.minFontSize ?? DEFAULT_MIN_FONT_SIZE;
  const maxFontSize = options.maxFontSize ?? DEFAULT_MAX_FONT_SIZE;
  const lineHeightRatio = options.lineHeightRatio ?? DEFAULT_LINE_HEIGHT_RATIO;

  if (!Number.isFinite(boxWidth) || !Number.isFinite(boxHeight) || boxWidth <= 0 || boxHeight <= 0) {
    return minFontSize;
  }

  const content = text.trim();
  if (!content) return minFontSize;

  let fontSize = Math.floor(
    Math.min(maxFontSize, Math.max(minFontSize, boxHeight / lineHeightRatio))
  );

  const availableWidth = Math.max(
    1,
    (boxWidth - BLOCK_HORIZONTAL_PADDING) * WIDTH_SAFETY_RATIO
  );

  while (fontSize > minFontSize) {
    const lines = Math.max(1, Math.ceil(estimateTextWidth(content, fontSize) / availableWidth));
    if (lines * fontSize * lineHeightRatio <= boxHeight) break;
    fontSize -= 1;
  }

  return fontSize;
}

/** 解析 #rgb / #rgba / #rrggbb / #rrggbbaa（忽略 alpha） */
export function parseHexColor(hex: string): RgbColor | null {
  const match = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim());
  if (!match) return null;

  const value = match[1];
  const expanded =
    value.length === 3 || value.length === 4
      ? Array.from(value)
          .map((char) => char + char)
          .join('')
      : value;

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

function channelToLinear(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

/** WCAG 相对亮度 */
export function relativeLuminance(color: RgbColor): number {
  return (
    0.2126 * channelToLinear(color.r) +
    0.7152 * channelToLinear(color.g) +
    0.0722 * channelToLinear(color.b)
  );
}

/** WCAG 对比度，取值范围 1–21 */
export function contrastRatio(a: RgbColor, b: RgbColor): number {
  const luminanceA = relativeLuminance(a);
  const luminanceB = relativeLuminance(b);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** 在给定背景色上选择黑/白文字色；两者取对比度更高者，保证 ≥ 4.5:1 */
export function pickContrastColor(backgroundHex: string): '#000000' | '#ffffff' {
  const background = parseHexColor(backgroundHex) ?? WHITE;
  return contrastRatio(background, BLACK) >= contrastRatio(background, WHITE)
    ? '#000000'
    : '#ffffff';
}

/** 十六进制前景/背景的对比度，任一颜色非法时返回 null */
export function contrastRatioForHex(foregroundHex: string, backgroundHex: string): number | null {
  const foreground = parseHexColor(foregroundHex);
  const background = parseHexColor(backgroundHex);
  if (!foreground || !background) return null;
  return contrastRatio(foreground, background);
}
