// 网页图片覆盖层的纯计算：视图切换、图片边界换算与块布局，便于在 bun 中单测。
import type { ImageTranslationBlock } from '@/types';
import {
  boxToPercentRect,
  fitFontSize,
  pickContrastColor,
  type PercentRect
} from '@/lib/image-translate/layout';

export type ImageOverlayView = 'translation' | 'original';

export const OVERLAY_MIN_FONT_SIZE = 8;
export const OVERLAY_MAX_FONT_SIZE = 40;
export const OVERLAY_LINE_HEIGHT = 1.15;
// 覆盖层尺寸变化超过该阈值才重算字号，避免滚动时反复改 DOM。
export const OVERLAY_SIZE_EPSILON = 0.5;

export interface OverlayInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface OverlayRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** getComputedStyle 中参与图片绘制区域换算的字段，测试可传等价普通对象 */
export interface OverlayInsetStyle {
  borderTopWidth: string;
  borderRightWidth: string;
  borderBottomWidth: string;
  borderLeftWidth: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
}

/** 一个覆盖块的最终布局：百分比矩形随图片缩放，字号/对比色按当前渲染尺寸计算 */
export interface OverlayBlockLayout extends PercentRect {
  text: string;
  backgroundColor: string;
  color: '#000000' | '#ffffff';
  fontSize: number;
  lineHeight: number;
}

export function nextOverlayView(view: ImageOverlayView): ImageOverlayView {
  return view === 'translation' ? 'original' : 'translation';
}

export function isOverlayViewTranslation(view: ImageOverlayView): boolean {
  return view === 'translation';
}

/** 已是目标语言的块与空译文不显示覆盖 */
export function isOverlayBlockRenderable(block: ImageTranslationBlock): boolean {
  return !block.skipped && Boolean(block.translatedText?.trim());
}

function parsePixel(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

/** 图片元素的 border box 去掉 border 与 padding 后才是图片实际绘制区域 */
export function resolveOverlayInsets(style: OverlayInsetStyle): OverlayInsets {
  return {
    top: parsePixel(style.borderTopWidth) + parsePixel(style.paddingTop),
    right: parsePixel(style.borderRightWidth) + parsePixel(style.paddingRight),
    bottom: parsePixel(style.borderBottomWidth) + parsePixel(style.paddingBottom),
    left: parsePixel(style.borderLeftWidth) + parsePixel(style.paddingLeft)
  };
}

/** getBoundingClientRect() 的 border box → 覆盖层可用的图片绘制区域 */
export function resolveOverlayRect(
  rect: { left: number; top: number; width: number; height: number },
  insets: OverlayInsets
): OverlayRect {
  return {
    left: rect.left + insets.left,
    top: rect.top + insets.top,
    width: Math.max(0, rect.width - insets.left - insets.right),
    height: Math.max(0, rect.height - insets.top - insets.bottom)
  };
}

/** 归一化块 → 覆盖块布局；跳过无需显示的块，并复用 layout helper 选字号与对比色 */
export function buildOverlayBlockLayouts(
  blocks: ImageTranslationBlock[],
  width: number,
  height: number
): OverlayBlockLayout[] {
  return blocks.filter(isOverlayBlockRenderable).map((block) => {
    const text = block.translatedText?.trim() ?? '';
    const percent = boxToPercentRect(block.box);
    return {
      text,
      ...percent,
      backgroundColor: block.bgColor,
      color: pickContrastColor(block.bgColor),
      fontSize: fitFontSize(text, block.box.w * width, block.box.h * height, {
        minFontSize: OVERLAY_MIN_FONT_SIZE,
        maxFontSize: OVERLAY_MAX_FONT_SIZE,
        lineHeightRatio: OVERLAY_LINE_HEIGHT
      }),
      lineHeight: OVERLAY_LINE_HEIGHT
    };
  });
}

/** 图片绘制尺寸变化是否超过阈值（滚动只改变位置时不重算字号） */
export function hasOverlaySizeChanged(
  previous: { width: number; height: number },
  next: { width: number; height: number }
): boolean {
  return (
    Math.abs(previous.width - next.width) > OVERLAY_SIZE_EPSILON ||
    Math.abs(previous.height - next.height) > OVERLAY_SIZE_EPSILON
  );
}

/** src/srcset 属性快照：任一属性变化都视为图片内容可能已更换 */
export function imageSourceSignature(src: string | null, srcset: string | null): string {
  return JSON.stringify([src, srcset]);
}
