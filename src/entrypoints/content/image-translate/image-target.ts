// 图片翻译网页入口的纯函数：尺寸过滤、图片源分类、URL 匹配与按钮定位，便于单测。

export const IMAGE_HOVER_MIN_SIZE = 200;
export const IMAGE_HOVER_BUTTON_SIZE = 32;
export const IMAGE_UI_EDGE_MARGIN = 8;

export type ImageSrcKind = 'url' | 'dataUrl' | 'blob' | 'unsupported';

/** 按图片源类型分流：http(s) 交给 background 拉取，data/blob 在页面侧转成 data URL */
export function classifyImageSrc(src: string | null | undefined): ImageSrcKind {
  if (!src) return 'unsupported';
  if (src.startsWith('data:')) return 'dataUrl';
  if (src.startsWith('blob:')) return 'blob';
  if (/^https?:\/\//i.test(src)) return 'url';
  return 'unsupported';
}

/** 悬浮「译」按钮只对渲染尺寸 ≥ 200×200 CSS px 的图片显示 */
export function isImageLargeEnough(size: { width: number; height: number }): boolean {
  return (
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width >= IMAGE_HOVER_MIN_SIZE &&
    size.height >= IMAGE_HOVER_MIN_SIZE
  );
}

/** 悬浮按钮贴在图片右上角，并夹在视口内 */
export function resolveHoverButtonPosition(
  anchor: { top: number; right: number },
  viewport: { width: number; height: number }
): { top: number; left: number } {
  const size = IMAGE_HOVER_BUTTON_SIZE;
  const margin = IMAGE_UI_EDGE_MARGIN;
  return {
    top: Math.min(
      Math.max(anchor.top + margin, margin),
      Math.max(margin, viewport.height - size - margin)
    ),
    left: Math.min(
      Math.max(anchor.right - size - margin, margin),
      Math.max(margin, viewport.width - size - margin)
    )
  };
}

/** 右键菜单回传的 srcUrl 与页面图片的 currentSrc/src 是否指向同一资源 */
export function matchesImageSrc(src: string, srcUrl: string, baseUrl: string): boolean {
  if (!src || !srcUrl) return false;
  try {
    return new URL(src, baseUrl).href === new URL(srcUrl, baseUrl).href;
  } catch {
    return false;
  }
}
