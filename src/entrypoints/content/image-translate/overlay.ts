import { t } from '@/lib/i18n';
import type { ImageTranslationResult } from '@/types';
import { clearImageStatus } from './status-view';
import { clearImageTranslateState, getImageTranslateState, setImageTranslateView } from './state';
import {
  buildOverlayBlockLayouts,
  hasOverlaySizeChanged,
  imageSourceSignature,
  isOverlayBlockRenderable,
  isOverlayViewTranslation,
  nextOverlayView,
  resolveOverlayInsets,
  resolveOverlayRect,
  type ImageOverlayView,
  type OverlayBlockLayout,
  type OverlayInsets
} from './overlay-model';

const ROUTE_POLL_INTERVAL_MS = 500;

interface ImageOverlayHandle {
  image: HTMLImageElement;
  result: ImageTranslationResult;
  // src/srcset 快照：任一属性变化都清理覆盖层，避免覆盖到另一张图片上。
  source: string;
  view: ImageOverlayView;
  root: HTMLElement;
  layer: HTMLElement;
  toggleButton: HTMLButtonElement;
  insets: OverlayInsets;
  width: number;
  height: number;
  resizeObserver?: ResizeObserver;
  sourceObserver?: MutationObserver;
  onLoad: () => void;
}

const overlays = new Map<HTMLImageElement, ImageOverlayHandle>();

// 只在有活跃覆盖层时安装滚动/缩放/变更监听，最后一个覆盖层移除后全部卸载。
let trackingInstalled = false;
let syncFrame: number | null = null;
let mutationObserver: MutationObserver | null = null;
let routeTimer: number | null = null;
let lastHref = '';

function readInsets(image: HTMLImageElement): OverlayInsets {
  return resolveOverlayInsets(getComputedStyle(image));
}

function createToolbarButton(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.title = label;
  return button;
}

function applyView(handle: ImageOverlayHandle, view: ImageOverlayView): void {
  handle.view = view;
  const showingTranslation = isOverlayViewTranslation(view);
  handle.layer.hidden = !showingTranslation;
  // 切换按钮显示「下一步动作」：译文态显示「原文」，原文态显示「译文」。
  const label = showingTranslation
    ? t('image_toolbar_original')
    : t('image_toolbar_translation');
  handle.toggleButton.textContent = label;
  handle.toggleButton.title = label;
  setImageTranslateView(handle.image, view);
}

function createBlockElement(layout: OverlayBlockLayout): HTMLElement {
  const element = document.createElement('div');
  element.dataset.translatorImageOverlayBlock = '';
  element.dir = 'auto';
  element.textContent = layout.text;
  element.style.left = layout.left;
  element.style.top = layout.top;
  element.style.width = layout.width;
  element.style.height = layout.height;
  element.style.backgroundColor = layout.backgroundColor;
  element.style.color = layout.color;
  element.style.fontSize = layout.fontSize + 'px';
  element.style.lineHeight = String(layout.lineHeight);
  return element;
}

function renderBlocks(handle: ImageOverlayHandle): void {
  const layouts = buildOverlayBlockLayouts(handle.result.blocks, handle.width, handle.height);
  handle.layer.replaceChildren(...layouts.map(createBlockElement));
}

export function removeImageOverlay(image: HTMLImageElement): void {
  const handle = overlays.get(image);
  if (!handle) return;

  handle.resizeObserver?.disconnect();
  handle.sourceObserver?.disconnect();
  image.removeEventListener('load', handle.onLoad);
  handle.root.remove();
  overlays.delete(image);

  if (overlays.size === 0) stopTracking();
}

/** 关闭按钮：移除覆盖节点并清掉该图状态，迟到结果因 requestId 不再匹配而被触发模块丢弃 */
function closeOverlay(handle: ImageOverlayHandle): void {
  const { image } = handle;
  removeImageOverlay(image);
  clearImageTranslateState(image);
  clearImageStatus(image);
}

function positionOverlay(handle: ImageOverlayHandle): void {
  const { image } = handle;
  if (!image.isConnected) {
    removeImageOverlay(image);
    return;
  }

  const area = resolveOverlayRect(image.getBoundingClientRect(), handle.insets);
  if (area.width < 1 || area.height < 1) {
    handle.root.hidden = true;
    return;
  }

  handle.root.hidden = false;
  handle.root.style.left = area.left + 'px';
  handle.root.style.top = area.top + 'px';
  handle.root.style.width = area.width + 'px';
  handle.root.style.height = area.height + 'px';

  if (hasOverlaySizeChanged(handle, area)) {
    handle.width = area.width;
    handle.height = area.height;
    renderBlocks(handle);
  }
}

/** src/srcset 变化后立即清理，避免覆盖层继续盖在另一张图片上 */
function checkSourceChanged(handle: ImageOverlayHandle): void {
  const { image } = handle;
  const signature = imageSourceSignature(image.getAttribute('src'), image.getAttribute('srcset'));
  if (signature === handle.source) return;
  removeImageOverlay(image);
}

function createOverlay(image: HTMLImageElement, result: ImageTranslationResult): ImageOverlayHandle {
  const root = document.createElement('div');
  root.dataset.translatorImageOverlay = '';

  const layer = document.createElement('div');
  layer.dataset.translatorImageOverlayLayer = '';

  const toolbar = document.createElement('div');
  toolbar.dataset.translatorImageOverlayToolbar = '';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', t('image_hover_button_title'));

  const toggleButton = createToolbarButton(t('image_toolbar_original'));
  const closeButton = createToolbarButton(t('image_toolbar_close'));
  toolbar.append(toggleButton, closeButton);
  root.append(layer, toolbar);

  const handle: ImageOverlayHandle = {
    image,
    result,
    source: imageSourceSignature(image.getAttribute('src'), image.getAttribute('srcset')),
    view: getImageTranslateState(image)?.view ?? 'translation',
    root,
    layer,
    toggleButton,
    insets: readInsets(image),
    width: 0,
    height: 0,
    onLoad: () => checkSourceChanged(handle)
  };

  toggleButton.addEventListener('click', (event) => {
    event.stopPropagation();
    applyView(handle, nextOverlayView(handle.view));
  });
  closeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    closeOverlay(handle);
  });
  toolbar.addEventListener('click', (event) => event.stopPropagation());
  toolbar.addEventListener('pointerdown', (event) => event.stopPropagation());

  image.addEventListener('load', handle.onLoad);
  const sourceObserver = new MutationObserver(() => {
    if (overlays.get(image) !== handle) return;
    checkSourceChanged(handle);
  });
  sourceObserver.observe(image, { attributes: true, attributeFilter: ['src', 'srcset'] });
  handle.sourceObserver = sourceObserver;

  const resizeObserver = new ResizeObserver(() => {
    if (overlays.get(image) !== handle) return;
    handle.insets = readInsets(image);
    scheduleSync();
  });
  resizeObserver.observe(image);
  handle.resizeObserver = resizeObserver;

  document.documentElement.appendChild(root);
  return handle;
}

export function showImageOverlay(
  image: HTMLImageElement,
  result: ImageTranslationResult
): void {
  removeImageOverlay(image);
  if (!image.isConnected) return;
  if (!result.blocks.some(isOverlayBlockRenderable)) return;

  const handle = createOverlay(image, result);
  overlays.set(image, handle);
  installTracking();
  applyView(handle, handle.view);
  positionOverlay(handle);
}

export function removeAllImageOverlays(): void {
  for (const image of Array.from(overlays.keys())) {
    removeImageOverlay(image);
  }
}

function syncAll(): void {
  for (const image of Array.from(overlays.keys())) {
    const handle = overlays.get(image);
    if (handle) positionOverlay(handle);
  }
}

function scheduleSync(): void {
  if (syncFrame !== null || overlays.size === 0) return;
  syncFrame = window.requestAnimationFrame(() => {
    syncFrame = null;
    syncAll();
  });
}

function handleRouteChange(): void {
  lastHref = location.href;
  removeAllImageOverlays();
}

function installTracking(): void {
  if (trackingInstalled) return;
  trackingInstalled = true;
  lastHref = location.href;

  window.addEventListener('scroll', scheduleSync, { capture: true, passive: true });
  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('popstate', handleRouteChange);
  window.addEventListener('hashchange', handleRouteChange);

  // pushState/replaceState 在 isolated world 不可见，与 observer.ts 一样用轻量 URL 轮询兜底；
  // 仅在存在覆盖层时运行，最后一个覆盖层移除后清除。
  routeTimer = window.setInterval(() => {
    if (location.href === lastHref) return;
    lastHref = location.href;
    removeAllImageOverlays();
  }, ROUTE_POLL_INTERVAL_MS);

  // 节点被移出 DOM 时清理覆盖层；src/srcset 由每张图片自己的 observer 负责。
  mutationObserver = new MutationObserver(scheduleSync);
  mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
}

function stopTracking(): void {
  if (!trackingInstalled) return;
  trackingInstalled = false;

  window.removeEventListener('scroll', scheduleSync, { capture: true });
  window.removeEventListener('resize', scheduleSync);
  window.removeEventListener('popstate', handleRouteChange);
  window.removeEventListener('hashchange', handleRouteChange);

  if (routeTimer !== null) {
    window.clearInterval(routeTimer);
    routeTimer = null;
  }
  mutationObserver?.disconnect();
  mutationObserver = null;

  if (syncFrame !== null) {
    window.cancelAnimationFrame(syncFrame);
    syncFrame = null;
  }
}
