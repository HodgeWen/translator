import type { InputLoadingPulseEasing, LangCode } from '@/types';
import { shouldSkipTranslation } from '@/lib/lang-detect';

export const INPUT_TRANSLATION_LOADING_ATTR = 'translatorInputLoading';
const INPUT_LOADING_COLOR_0_VAR = '--translator-input-loading-color-0';
const INPUT_LOADING_COLOR_50_VAR = '--translator-input-loading-color-50';
const INPUT_LOADING_COLOR_100_VAR = '--translator-input-loading-color-100';
const INPUT_LOADING_DURATION_VAR = '--translator-input-loading-duration';
const INPUT_LOADING_EASING_VAR = '--translator-input-loading-easing';
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

interface InputLoadingAnimationOptions {
  keyframes: [string, string, string];
  durationMs: number;
  easing: InputLoadingPulseEasing;
}

interface ResolveInputTargetLanguageArgs {
  detectedLang: LangCode | null;
  nativeLanguage: LangCode;
  defaultSourceLanguage: LangCode;
  inputDefaultSourceLanguage?: LangCode;
}

export function resolveInputTargetLanguage({
  detectedLang,
  nativeLanguage,
  defaultSourceLanguage,
  inputDefaultSourceLanguage,
}: ResolveInputTargetLanguageArgs): LangCode {
  if (detectedLang && shouldSkipTranslation(detectedLang, nativeLanguage)) {
    return inputDefaultSourceLanguage || defaultSourceLanguage;
  }
  return nativeLanguage;
}

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value.trim());
}

export function getInputLoadingEasingValue(easing: InputLoadingPulseEasing): string {
  if (easing === 'linear') return 'linear';
  if (easing === 'spring') return 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  return 'cubic-bezier(0.16, 1, 0.3, 1)';
}

export function setInputTranslationLoading(
  el: HTMLInputElement | HTMLTextAreaElement,
  loading: boolean,
  animation?: InputLoadingAnimationOptions
): void {
  if (loading) {
    el.dataset[INPUT_TRANSLATION_LOADING_ATTR] = 'true';
    if (animation) {
      el.style.setProperty(INPUT_LOADING_COLOR_0_VAR, animation.keyframes[0]);
      el.style.setProperty(INPUT_LOADING_COLOR_50_VAR, animation.keyframes[1]);
      el.style.setProperty(INPUT_LOADING_COLOR_100_VAR, animation.keyframes[2]);
      el.style.setProperty(INPUT_LOADING_DURATION_VAR, `${animation.durationMs}ms`);
      el.style.setProperty(INPUT_LOADING_EASING_VAR, getInputLoadingEasingValue(animation.easing));
    }
    return;
  }
  delete el.dataset[INPUT_TRANSLATION_LOADING_ATTR];
  el.style.removeProperty(INPUT_LOADING_COLOR_0_VAR);
  el.style.removeProperty(INPUT_LOADING_COLOR_50_VAR);
  el.style.removeProperty(INPUT_LOADING_COLOR_100_VAR);
  el.style.removeProperty(INPUT_LOADING_DURATION_VAR);
  el.style.removeProperty(INPUT_LOADING_EASING_VAR);
}
