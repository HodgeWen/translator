import type { TranslationTone } from '@/types';

export const DEFAULT_GLOBAL_PROMPT = `You are a professional, authentic machine translation engine.

Rules:
1. Translate the following text to {{targetLang}}.
2. Output ONLY the translated text. No markdown code blocks, no explanations, no notes. Do not prepend phrases like "Here is", "Translation:", or any conversational preamble.
3. Maintain the original meaning of the text.`;

export const TONE_INSTRUCTIONS: Record<TranslationTone, string> = {
  normal: '',
  technical: `Translate in a technical style. Use precise terminology, concise sentences, and maintain a professional tone. Prioritize accuracy and clarity over readability.`,
  tech_forward: `Translate with a cutting-edge tech style. Use modern tech vocabulary, stay forward-looking in tone, and keep the energy high and engaging.`,
  humorous: `Translate with a humorous and lighthearted tone. Use witty expressions and playful language while keeping the meaning accurate.`,
  literary: `Translate in a literary style. Use elegant, vivid language with rich vocabulary. Preserve rhetorical devices and emotional nuances.`,
  formal: `Translate in a formal style. Use dignified, precise language. Avoid colloquialisms. Suitable for professional correspondence.`,
  colloquial: `Translate in a colloquial style. Use everyday conversational language. Sound natural and casual, like a native speaker's daily speech.`,
};

export function formatToneInstruction(toneInstruction: string): string {
  return `\nStyle:\n${toneInstruction}`;
}

const CJK_RE = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/;

export function isLikelyWordOrPhrase(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 40) return false;

  // CJK 等无空格语言：用更严格的长度阈值排除短句
  if (CJK_RE.test(trimmed)) {
    if (trimmed.length > 3) return false;
    if (/\s/.test(trimmed)) return false;
    if (/[。！？.!?,，；;：:]/.test(trimmed)) return false;
    return true;
  }

  // 拉丁/西里尔等分词语言：无空格才可能是单词
  const withoutPunctuation = trimmed.replace(/[.,;:!?。，；：！？\-\/\\]/g, '');
  return withoutPunctuation.length > 0 && !withoutPunctuation.includes(' ');
}

export function buildPolysemyPrompt(targetLang: string): string {
  const isEnglishTarget = targetLang.toLowerCase().startsWith('en');
  const phoneticPart = isEnglishTarget
    ? ' For English translations, also include the English word\'s IPA phonetic transcription between slashes after the hint.'
    : '';
  const example = isEnglishTarget
    ? '\nExample:\n• (noun) /bæŋk/ bank\n• (verb) /bæŋk/ deposit'
    : '\nExample:\n• (名词) 银行\n• (动词) 存款';
  return `Additional instruction: The user input may be a polysemous word or short phrase. If it has multiple distinct common meanings, provide the primary translations for each sense in ${targetLang}. Output each sense on its own line, prefixed with a bullet point (•). Include a brief part-of-speech or context hint in parentheses.${phoneticPart}${example}\n\nIf there is only one dominant meaning, output the translation directly without bullets.`;
}
