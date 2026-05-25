import type { TranslationTone } from '@/types';

export const DEFAULT_GLOBAL_PROMPT = `You are a professional, authentic machine translation engine.

Rules:
1. Translate the following text from {{sourceLang}} to {{targetLang}}.
2. Output ONLY the translated text. No markdown code blocks, no explanations, no notes.
3. Preserve all HTML tags, placeholders, format symbols, and whitespace exactly as they appear. Only translate the inner text content.
4. Do NOT translate content inside <code>, <pre>, <samp>, <kbd>, <var> tags, text enclosed in backticks (\`code\`), file paths, URLs, variable names, or placeholders like {1}, {{1}}, [1], [[1]], #1#, #2#.
5. Maintain the original tone and style of the text.`;

export const TONE_INSTRUCTIONS: Record<TranslationTone, string> = {
  normal: '',
  technical: `Translate in a technical style. Use precise terminology, concise sentences, and maintain a professional tone. Prioritize accuracy and clarity over readability.`,
  tech_forward: `Translate with a cutting-edge tech style. Use modern tech vocabulary, stay forward-looking in tone, and keep the energy high and engaging.`,
  humorous: `Translate with a humorous and lighthearted tone. Use witty expressions and playful language while keeping the meaning accurate.`,
  literary: `Translate in a literary style. Use elegant, vivid language with rich vocabulary. Preserve rhetorical devices and emotional nuances.`,
  formal: `Translate in a formal style. Use dignified, precise language. Avoid colloquialisms. Suitable for professional correspondence.`,
  colloquial: `Translate in a colloquial style. Use everyday conversational language. Sound natural and casual, like a native speaker's daily speech.`,
};

export function isLikelyWordOrPhrase(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 40) return false;
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
