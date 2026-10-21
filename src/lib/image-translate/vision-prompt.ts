// 图片直译提示词：视觉模型一次调用读出并翻译图中所有文字。
// 提示词语义变更时必须同步升版本号，否则按 (imageHash, promptVersion, targetLang) 的缓存不会失效。

export const IMAGE_VISION_PROMPT_VERSION = 'v4';

export const IMAGE_TRANSLATE_SYSTEM_PROMPT = `You are an image text translator. Read every piece of visible text in the provided image and translate it. Do not describe the image, do not explain, and do not invent content that is not visibly written in it.`;

export function buildImageTranslateUserPrompt(targetLang: string): string {
  return `Translate all visible text in this image into ${targetLang}.

Rules:
- Output ONLY the translated text, no preamble, no notes, no Markdown formatting.
- Keep the natural reading order (top to bottom, left to right) and use line breaks to separate distinct text regions.
- Text that is already in ${targetLang} is kept as is.
- Preserve numbers, URLs, code and proper nouns sensibly; do not transliterate what is normally kept in its original form.
- Decorative text (watermarks, logos) may be skipped when it carries no meaning.
- If the image contains no readable text, output nothing.`;
}
