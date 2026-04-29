import type { TranslationResponse } from '@/types';
import { shouldSkipTranslation } from '@/lib/lang-detect';
import { sendBgMessage } from '@/lib/messaging';
import { state } from './state';

// ─── Input Box Translation ──────────────────────────────────────────────

let spaceCount = 0;
let inputDebounceTimer: number | null = null;

async function translateInput(el: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
  if (!el.isConnected) return;
  const text = el.value.trim();
  if (!text || text.length < 2) return;

  try {
    const detectResult = await sendBgMessage<{ lang: string | null }>({
      type: 'DETECT_LANG',
      payload: { text },
    });
    const detectedLang = detectResult.lang;

    if (detectedLang && shouldSkipTranslation(detectedLang, state.nativeLanguage)) {
      return;
    }

    const result = await sendBgMessage<TranslationResponse>({
      type: 'TRANSLATE',
      payload: {
        text,
        sourceLang: detectedLang || undefined,
        targetLang: state.targetLang,
      },
    });

    el.value = result.text;
  } catch (err) {
    console.warn('[Translator] translateInput failed:', err);
  }
}

export function setupInputListeners(): void {
  document.addEventListener('keydown', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (e.key === ' ') {
      spaceCount++;
      if (spaceCount >= 3) {
        spaceCount = 0;
        if (inputDebounceTimer) window.clearTimeout(inputDebounceTimer);
        inputDebounceTimer = window.setTimeout(() => {
          translateInput(target);
        }, 300);
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      spaceCount = 0;
    }
  });
}
