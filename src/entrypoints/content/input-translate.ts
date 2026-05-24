import type { TranslationResponse } from "@/types";
import { sendBgMessage } from "@/lib/messaging";
import { shouldSkipTranslation } from "@/lib/lang-detect";
import { state } from "./state";
import {
  eventMatchesSingleKeyShortcut,
  recordSequentialShortcutPress,
} from "./shortcut-utils";
import { resolveInputTargetLanguage, setInputTranslationLoading } from "./input-translate-utils";

// ─── Native setter helper ───────────────────────────────────────────────
// Direct `el.value = x` bypasses React / Vue controlled‑component state,
// causing the framework to revert the value on the next re‑render.
// Using the native HTMLInputElement/HTMLTextAreaElement prototype setter +
// dispatching synthetic events forces frameworks to acknowledge the change.

const nativeInputSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
)!.set!;
const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype,
  "value",
)!.set!;

function setNativeInputValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  const setter = el instanceof HTMLTextAreaElement ? nativeTextareaSetter : nativeInputSetter;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// ─── Editable element helpers ──────────────────────────────────────────
// 支持传统 input/textarea 以及 contenteditable（Reddit、Notion、Slack 等）

type EditableElement = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

interface EditableResult {
  element: EditableElement;
  isContentEditable: boolean;
}

function getEditableAncestor(el: EventTarget | null): EditableResult | null {
  if (!(el instanceof HTMLElement)) return null;

  let current: HTMLElement | null = el;
  while (current) {
    if (current instanceof HTMLInputElement || current instanceof HTMLTextAreaElement) {
      return { element: current, isContentEditable: false };
    }
    if (current.isContentEditable) {
      return { element: current, isContentEditable: true };
    }
    current = current.parentElement;
  }
  return null;
}

function getEditableText(el: EditableElement, isContentEditable: boolean): string {
  if (!isContentEditable) {
    return (el as HTMLInputElement | HTMLTextAreaElement).value;
  }
  // innerText 保留换行，textContent 会把 <br>/<p> 挤成一行
  return el.innerText || '';
}

function setEditableText(el: EditableElement, isContentEditable: boolean, value: string): void {
  if (!isContentEditable) {
    setNativeInputValue(el as HTMLInputElement | HTMLTextAreaElement, value);
    return;
  }
  // 清空后设置纯文本，分派事件通知框架
  el.textContent = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// ─── Input Box Translation ──────────────────────────────────────────────

const INPUT_SHORTCUT_SEQUENCE_MS = 200;

interface InputState {
  shortcutCount: number;
  lastShortcutPressedAt: number;
  debounceTimer: number | null;
  originalValue: string | null;
  translatedValue: string | null;
}

const inputStateMap = new WeakMap<EditableElement, InputState>();
let inputSettingsLoaded = false;
let inputShortcutKey = "Control";
let inputDefaultSourceLanguage = "";
let defaultSourceLanguage = "en";
let inputLoadingPulseKeyframes: [string, string, string] = ["#4b5563", "#2563eb", "#0f172a"];
let inputLoadingPulseDurationMs = 1200;
let inputLoadingPulseEasing: "linear" | "ease-out" | "spring" = "ease-out";

function getInputState(el: EditableElement): InputState {
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

async function translateInput(el: EditableElement, isContentEditable: boolean): Promise<void> {
  if (!el.isConnected) return;
  if (el.dataset.translatorInputLoading === "true") return;
  const st = getInputState(el);
  const text = getEditableText(el, isContentEditable).trim();
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
        hasPlaceholders: false,
      },
    });

    st.originalValue = text;
    st.translatedValue = result.text;
    setEditableText(el, isContentEditable, result.text);
  } catch (err) {
    console.warn("[Translator] translateInput failed:", err);
  } finally {
    setInputTranslationLoading(el, false);
  }
}

function isShowingTranslated(el: EditableElement, isContentEditable: boolean, st: InputState): boolean {
  if (!st.translatedValue) return false;
  return getEditableText(el, isContentEditable) === st.translatedValue;
}

function restoreInput(el: EditableElement, isContentEditable: boolean, st: InputState): void {
  if (st.originalValue === null) return;
  setInputTranslationLoading(el, false);
  setEditableText(el, isContentEditable, st.originalValue);
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

  // 使用捕获阶段，确保在网站自身的事件处理器（可能 stopPropagation）之前拦截到按键
  document.addEventListener("keydown", (e) => {
    // IME 输入法组合中跳过，避免干扰中文/日文等输入
    if (e.isComposing) return;

    const editable = getEditableAncestor(e.target);
    if (!editable) return;

    const { element: el, isContentEditable } = editable;
    const st = getInputState(el);

    if (eventMatchesSingleKeyShortcut(e, inputShortcutKey)) {
      e.preventDefault();

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

        if (isShowingTranslated(el, isContentEditable, st)) {
          restoreInput(el, isContentEditable, st);
          return;
        }

        st.debounceTimer = window.setTimeout(() => {
          st.debounceTimer = null;
          translateInput(el, isContentEditable);
        }, 300);
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      st.shortcutCount = 0;
      st.lastShortcutPressedAt = 0;
    }
  }, { capture: true, passive: false });

  document.addEventListener("input", (e) => {
    const editable = getEditableAncestor(e.target);
    if (!editable) return;

    const { element: el, isContentEditable } = editable;
    const st = getInputState(el);
    if (!st.translatedValue) return;
    if (isShowingTranslated(el, isContentEditable, st)) return;
    st.originalValue = null;
    st.translatedValue = null;
  });
}
