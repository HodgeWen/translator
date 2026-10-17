// 识图提示词：只做 OCR，保留原文语言，按阅读顺序输出归一化坐标。
// 提示词语义变更时必须同步升版本号，否则按 (imageHash, promptVersion) 的识别缓存不会失效。

export const IMAGE_VISION_PROMPT_VERSION = 'v1';

export const IMAGE_VISION_SYSTEM_PROMPT = `You are an OCR engine. Extract only the text that is visibly present in the image. Do not translate, summarize, explain, or invent content. Keep every block in its original language and in natural reading order.`;

export const IMAGE_VISION_USER_PROMPT = `Extract every visible text block from this image. Return ONLY a JSON array (no prose, no Markdown code fence) in exactly this shape:
[{"text": "...", "box": {"x": 0, "y": 0, "w": 0, "h": 0}}]

Rules:
- "text" is the recognized original text, unchanged and untranslated. Do not merge unrelated lines into one block.
- "box" is the bounding rectangle of the block relative to the original image, normalized to 0–1: x/y are the top-left corner, w/h are the width/height. All four values are numbers, with x >= 0, y >= 0, w > 0, h > 0, x + w <= 1 and y + h <= 1.
- Output blocks in natural reading order (top to bottom, left to right).
- Return [] when the image contains no readable text.`;
