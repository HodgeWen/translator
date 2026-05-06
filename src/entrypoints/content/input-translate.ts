import type { TranslationResponse } from "@/types";
import { sendBgMessage } from "@/lib/messaging";
import { shouldSkipTranslation } from "@/lib/lang-detect";
import { state } from "./state";
import {
  eventMatchesSingleKeyShortcut,
  normalizeShortcutKey,
  recordSequentialShortcutPress,
} from "./shortcut-utils";
import { resolveInputTargetLanguage, setInputTranslationLoading } from "./input-translate-utils";

// ─── Input Box Translation ──────────────────────────────────────────────

const INPUT_SHORTCUT_SEQUENCE_MS = 200;

interface InputState {
  shortcutCount: number;
  lastShortcutPressedAt: number;
  debounceTimer: number | null;
  originalValue: string | null;
  translatedValue: string | null;
}

const inputStateMap = new WeakMap<HTMLInputElement | HTMLTextAreaElement, InputState>();
let inputSettingsLoaded = false;
let inputShortcutKey = "Space";
let inputDefaultSourceLanguage = "";
let defaultSourceLanguage = "en";
let inputLoadingPulseKeyframes: [string, string, string] = ["#4b5563", "#2563eb", "#0f172a"];
let inputLoadingPulseDurationMs = 1200;
let inputLoadingPulseEasing: "linear" | "ease-out" | "spring" = "ease-out";

function getInputState(el: HTMLInputElement | HTMLTextAreaElement): InputState {
  let st = inputStateMap.get(el);
  if (!st) {
    st = {
      shortcutCount: 0,
      lastShortcutPressedAt: 0,
      debounceTimer: null,
      originalValue: null,
      translatedValue: null,
    };
    inputStateMap.set(el, st);
  }
  return st;
}

async function loadInputSettings(): Promise<void> {
  const { getSettings } = await import("@/lib/storage");
  const s = await getSettings();
  state.nativeLanguage = s.nativeLanguage;
  state.targetLang = s.nativeLanguage;
  defaultSourceLanguage = s.defaultSourceLanguage;
  inputDefaultSourceLanguage = s.inputDefaultSourceLanguage;
  inputShortcutKey = s.inputShortcutKey;
  inputLoadingPulseKeyframes = s.inputLoadingPulseKeyframes;
  inputLoadingPulseDurationMs = s.inputLoadingPulseDurationMs;
  inputLoadingPulseEasing = s.inputLoadingPulseEasing;
  inputSettingsLoaded = true;
}

async function ensureInputSettings(): Promise<void> {
  if (inputSettingsLoaded) return;
  await loadInputSettings();
}

async function translateInput(el: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
  if (!el.isConnected) return;
  if (el.dataset.translatorInputLoading === "true") return;
  const st = getInputState(el);
  const text = el.value.trim();
  if (!text || text.length < 2) return;

  try {
    await ensureInputSettings();
    setInputTranslationLoading(el, true, {
      keyframes: inputLoadingPulseKeyframes,
      durationMs: inputLoadingPulseDurationMs,
      easing: inputLoadingPulseEasing,
    });

    let detectedLang: string | null = null;
    try {
      const r = await sendBgMessage<{ lang: string | null }>({
        type: "DETECT_LANG",
        payload: { text },
      });
      detectedLang = r.lang;
    } catch {
      detectedLang = null;
    }

    const targetLang = resolveInputTargetLanguage({
      detectedLang,
      nativeLanguage: state.nativeLanguage,
      defaultSourceLanguage,
      inputDefaultSourceLanguage,
    });
    if (detectedLang && shouldSkipTranslation(detectedLang, targetLang)) return;

    const result = await sendBgMessage<TranslationResponse>({
      type: "TRANSLATE",
      payload: {
        text,
        sourceLang: detectedLang || undefined,
        targetLang,
        // 输入框纯文本，无内嵌 HTML 片段，跳过 placeholder 规则节省 token。
        hasPlaceholders: false,
      },
    });

    st.originalValue = text;
    st.translatedValue = result.text;
    el.value = result.text;
  } catch (err) {
    console.warn("[Translator] translateInput failed:", err);
  } finally {
    setInputTranslationLoading(el, false);
  }
}

function isShowingTranslated(el: HTMLInputElement | HTMLTextAreaElement, st: InputState): boolean {
  if (!st.translatedValue) return false;
  if (el.value === st.translatedValue) return true;
  return (
    normalizeShortcutKey(inputShortcutKey) === " " && el.value.trim() === st.translatedValue.trim()
  );
}

function restoreInput(el: HTMLInputElement | HTMLTextAreaElement, st: InputState): void {
  if (st.originalValue === null) return;
  setInputTranslationLoading(el, false);
  el.value = st.originalValue;
  st.originalValue = null;
  st.translatedValue = null;
}

export function setupInputListeners(): void {
  void ensureInputSettings();

  if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((_changes, area) => {
      if (area !== "sync") return;
      inputSettingsLoaded = false;
      void ensureInputSettings();
    });
  }

  document.addEventListener("keydown", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
      return;
    }

    const st = getInputState(target);

    if (eventMatchesSingleKeyShortcut(e, inputShortcutKey)) {
      const sequence = recordSequentialShortcutPress(
        { count: st.shortcutCount, lastPressedAt: st.lastShortcutPressedAt },
        performance.now(),
        INPUT_SHORTCUT_SEQUENCE_MS,
      );
      st.shortcutCount = sequence.count;
      st.lastShortcutPressedAt = sequence.lastPressedAt;

      if (st.shortcutCount >= 3) {
        st.shortcutCount = 0;
        st.lastShortcutPressedAt = 0;
        if (st.debounceTimer) window.clearTimeout(st.debounceTimer);

        if (isShowingTranslated(target, st)) {
          e.preventDefault();
          restoreInput(target, st);
          return;
        }

        st.debounceTimer = window.setTimeout(() => {
          st.debounceTimer = null;
          translateInput(target);
        }, 300);
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      st.shortcutCount = 0;
      st.lastShortcutPressedAt = 0;
    }
  });

  document.addEventListener("input", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
      return;
    }
    const st = getInputState(target);
    if (!st.translatedValue) return;
    if (isShowingTranslated(target, st)) return;
    st.originalValue = null;
    st.translatedValue = null;
  });
}
