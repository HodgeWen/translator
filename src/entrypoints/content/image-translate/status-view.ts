import { t } from '@/lib/i18n';
import { IMAGE_UI_EDGE_MARGIN } from './image-target';

const ERROR_STATUS_DISMISS_MS = 8000;

interface StatusHandle {
  root: HTMLElement;
  text: HTMLElement;
  retry: (() => void) | null;
  timer: number | null;
}

const statusMap = new Map<HTMLImageElement, StatusHandle>();

function positionStatus(image: HTMLImageElement, root: HTMLElement): void {
  const rect = image.getBoundingClientRect();
  root.style.top = Math.max(rect.top + IMAGE_UI_EDGE_MARGIN, IMAGE_UI_EDGE_MARGIN) + 'px';
  root.style.left = Math.max(rect.left + IMAGE_UI_EDGE_MARGIN, IMAGE_UI_EDGE_MARGIN) + 'px';
}

function ensureStatus(image: HTMLImageElement): StatusHandle {
  const existing = statusMap.get(image);
  if (existing) return existing;

  const root = document.createElement('div');
  root.dataset.translatorImageStatus = '';
  root.setAttribute('role', 'status');
  root.style.position = 'fixed';

  const spinner = document.createElement('span');
  spinner.dataset.translatorImageStatusSpinner = '';
  const text = document.createElement('span');
  text.dataset.translatorImageStatusText = '';
  root.append(spinner, text);

  const handle: StatusHandle = { root, text, retry: null, timer: null };
  root.addEventListener('click', () => {
    const retry = handle.retry;
    if (!retry) return;
    handle.retry = null;
    removeStatus(image);
    retry();
  });

  statusMap.set(image, handle);
  document.documentElement.appendChild(root);
  return handle;
}

function removeStatus(image: HTMLImageElement): void {
  const handle = statusMap.get(image);
  if (!handle) return;
  if (handle.timer !== null) window.clearTimeout(handle.timer);
  handle.root.remove();
  statusMap.delete(image);
}

export function setImageLoadingStatus(image: HTMLImageElement): void {
  if (!image.isConnected) {
    removeStatus(image);
    return;
  }
  const handle = ensureStatus(image);
  if (handle.timer !== null) {
    window.clearTimeout(handle.timer);
    handle.timer = null;
  }
  handle.retry = null;
  handle.root.dataset.state = 'loading';
  handle.root.removeAttribute('title');
  handle.text.textContent = t('image_translate_loading');
  positionStatus(image, handle.root);
}

export function setImageErrorStatus(
  image: HTMLImageElement,
  message: string,
  retry: () => void
): void {
  if (!image.isConnected) {
    removeStatus(image);
    return;
  }
  const handle = ensureStatus(image);
  handle.root.dataset.state = 'error';
  handle.root.title = t('btn_retry');
  handle.text.textContent = message + ' · ' + t('btn_retry');
  handle.retry = retry;
  positionStatus(image, handle.root);

  if (handle.timer !== null) window.clearTimeout(handle.timer);
  handle.timer = window.setTimeout(() => {
    handle.timer = null;
    removeStatus(image);
  }, ERROR_STATUS_DISMISS_MS);
}

export function clearImageStatus(image: HTMLImageElement): void {
  removeStatus(image);
}

/** 滚动/缩放后固定定位的状态徽标会脱离图片，直接收起 */
export function hideAllImageStatuses(): void {
  for (const image of Array.from(statusMap.keys())) {
    removeStatus(image);
  }
}
