import { t } from '@/lib/i18n';
import { getImageTranslateState } from './state';
import { ensureImageTranslateSettings, isImageHoverButtonEnabled } from './settings';
import { triggerImageTranslation } from './trigger';
import { isImageLargeEnough, resolveHoverButtonPosition } from './image-target';

let hoverButton: HTMLButtonElement | null = null;
let hoveredImage: HTMLImageElement | null = null;
// 等待设置加载期间的候选图片：指针已移开时要能取消这次尚未完成的定位。
let pendingImage: HTMLImageElement | null = null;
let showToken = 0;

function ensureHoverButton(): HTMLButtonElement {
  if (hoverButton) return hoverButton;

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.translatorImageHover = '';
  button.textContent = t('image_hover_button_text');
  button.title = t('image_hover_button_title');
  button.setAttribute('aria-label', button.title);
  button.addEventListener('mouseleave', () => hideImageHoverButton());
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const image = hoveredImage;
    hideImageHoverButton();
    if (image) void triggerImageTranslation(image);
  });

  hoverButton = button;
  return button;
}

async function showHoverButton(image: HTMLImageElement): Promise<void> {
  const token = ++showToken;
  pendingImage = image;
  if (getImageTranslateState(image)?.status === 'loading') {
    pendingImage = null;
    return;
  }

  try {
    await ensureImageTranslateSettings();
  } catch {
    pendingImage = null;
    return;
  }
  if (token !== showToken || pendingImage !== image) return;
  pendingImage = null;
  if (!image.isConnected || !isImageHoverButtonEnabled()) return;
  // 已翻译图片显示覆盖层与工具条；再叠一个悬浮按钮会遮住工具条并拦截点击。
  if (getImageTranslateState(image)?.status === 'translated') return;

  const rect = image.getBoundingClientRect();
  if (!isImageLargeEnough(rect)) return;

  hoveredImage = image;
  const button = ensureHoverButton();
  const position = resolveHoverButtonPosition(rect, {
    width: window.innerWidth,
    height: window.innerHeight
  });
  button.style.top = position.top + 'px';
  button.style.left = position.left + 'px';
  if (!button.isConnected) document.documentElement.appendChild(button);
}

function onMouseOver(event: MouseEvent): void {
  const image = event.target instanceof HTMLImageElement ? event.target : null;
  if (!image) return;

  if (!isImageLargeEnough(image.getBoundingClientRect())) {
    if (hoveredImage === image) hideImageHoverButton();
    return;
  }
  void showHoverButton(image);
}

function onMouseOut(event: MouseEvent): void {
  const target = event.target;
  if (pendingImage && target === pendingImage) {
    pendingImage = null;
    showToken += 1;
  }
  if (!hoveredImage || target !== hoveredImage) return;

  // 指针移向悬浮按钮本身时保持显示，由按钮的 mouseleave 负责收起。
  const related = event.relatedTarget;
  if (related instanceof Node && hoverButton?.contains(related)) return;
  hideImageHoverButton();
}

export function hideImageHoverButton(): void {
  showToken += 1;
  pendingImage = null;
  hoveredImage = null;
  hoverButton?.remove();
}

export function setupImageHover(): void {
  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout', onMouseOut, true);
}
