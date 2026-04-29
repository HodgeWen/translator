import { defineContentScript } from 'wxt/utils/define-content-script';
import { sendBgMessage } from '@/lib/messaging';
import { state } from './state';
import { toggleAllDisplay } from './style-apply';
import { startTranslation, setupMutationObserver, setupSPADetection } from './observer';
import { setupInputListeners } from './input-translate';
import { setupCtrlHover } from './ctrl-hover';
import './styles.css';

// ─── Utilities ──────────────────────────────────────────────────────────

function isValidPage(): boolean {
  const url = location.href;
  return !url.startsWith('chrome://') && !url.startsWith('chrome-extension://') && !url.startsWith('devtools://');
}

// ─── Toggle Handler ─────────────────────────────────────────────────────

// Alt+W 状态机：
//   inactive                          → press → active + translation（启动翻译，显示译文）
//   active + translation              → press → active + original（全页 toggle 到原文，不停止 observer）
//   active + original                 → press → active + translation（全页 toggle 回译文）
// 目的：避免每次按 Alt+W 都重新请求 API；翻译结果保留在 elementMap，纯切换 DOM 显示。
async function toggleTranslation(): Promise<void> {
  if (state.isActive) {
    if (state.displayMode === 'translation') {
      state.displayMode = 'original';
      toggleAllDisplay(true);
    } else {
      state.displayMode = 'translation';
      toggleAllDisplay(false);
    }
    return;
  }

  try {
    await sendBgMessage({ type: 'PING' }).catch(() => null);

    const { getSettings } = await import('@/lib/storage');
    const s = await getSettings();

    state.style = s.defaultStyle;
    state.nativeLanguage = s.nativeLanguage;
    state.targetLang = s.nativeLanguage;
    state.aggregate = {
      aggregateEnabled: s.aggregateEnabled,
      maxParagraphsPerRequest: s.maxParagraphsPerRequest,
      maxTextLengthPerRequest: s.maxTextLengthPerRequest,
      maxConcurrentRequests: s.maxConcurrentRequests,
      requestTimeout: s.requestTimeout,
    };
    state.isActive = true;
    state.displayMode = 'translation';

    startTranslation();
  } catch (err) {
    console.warn('[Translator] toggleTranslation failed:', err);
  }
}

// ─── Main Entrypoint ────────────────────────────────────────────────────

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    if (!isValidPage()) return;

    // Guard against double-injection (extension reload/update)
    if ((window as unknown as Record<string, unknown>).__translatorContentScriptLoaded) {
      return;
    }
    (window as unknown as Record<string, unknown>).__translatorContentScriptLoaded = true;

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOGGLE_TRANSLATION') {
        toggleTranslation();
      }
    });

    setupInputListeners();
    setupCtrlHover();
    setupSPADetection();
    setupMutationObserver();
  },
});
