import type { TranslationResponse } from '@/types';
import { shouldSkipTranslation } from '@/lib/lang-detect';
import { sendBgMessage } from '@/lib/messaging';
import { state } from './state';

// ─── Input Box Translation ──────────────────────────────────────────────

interface InputState {
  spaceCount: number;
  debounceTimer: number | null;
}

const inputStateMap = new WeakMap<HTMLInputElement | HTMLTextAreaElement, InputState>();
let inputSettingsLoaded = false;

function getInputState(el: HTMLInputElement | HTMLTextAreaElement): InputState {
  let st = inputStateMap.get(el);
  if (!st) {
    st = { spaceCount: 0, debounceTimer: null };
    inputStateMap.set(el, st);
  }
  return st;
}

async function ensureInputSettings(): Promise<void> {
  if (inputSettingsLoaded || state.isActive) return;
  const { getSettings } = await import('@/lib/storage');
  const s = await getSettings();
  state.nativeLanguage = s.nativeLanguage;
  state.targetLang = s.nativeLanguage;
  inputSettingsLoaded = true;
}

async function translateInput(el: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
  if (!el.isConnected) return;
  const text = el.value.trim();
  if (!text || text.length < 2) return;

  try {
    await ensureInputSettings();

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

    const st = getInputState(target);

    if (e.key === ' ') {
      st.spaceCount++;
      if (st.spaceCount >= 3) {
        st.spaceCount = 0;
        if (st.debounceTimer) window.clearTimeout(st.debounceTimer);
        st.debounceTimer = window.setTimeout(() => {
          st.debounceTimer = null;
          translateInput(target);
        }, 300);
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      st.spaceCount = 0;
    }
  });
}
