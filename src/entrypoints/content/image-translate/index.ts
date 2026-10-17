import { setupImageHover, hideImageHoverButton } from './hover';
import { hideAllImageStatuses } from './status-view';
import {
  ensureImageTranslateSettings,
  hasLoadedImageTranslateSettings,
  invalidateImageTranslateSettings,
  isImageHoverButtonEnabled
} from './settings';

export { triggerImageTranslationBySrcUrl } from './trigger';

function hideImageTranslateUi(): void {
  hideImageHoverButton();
  hideAllImageStatuses();
}

export function setupImageTranslate(): void {
  setupImageHover();

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area !== 'sync' || !hasLoadedImageTranslateSettings()) return;
    invalidateImageTranslateSettings();
    void ensureImageTranslateSettings()
      .then(() => {
        if (!isImageHoverButtonEnabled()) hideImageHoverButton();
      })
      .catch(() => {
        // 读取设置失败时保留当前行为，下次悬停/触发会重试。
      });
  });

  // 固定定位的入口/状态在滚动、缩放后会脱离图片，先收起，下次悬停再定位。
  window.addEventListener('scroll', hideImageTranslateUi, { capture: true, passive: true });
  window.addEventListener('resize', hideImageTranslateUi, { passive: true });
}
