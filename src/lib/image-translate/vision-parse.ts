import { ImageTranslationError } from './types';

// 匹配 ```json ... ``` 或 ``` ... ``` 围栏，个别模型会把纯文本译文包进代码块里。
const JSON_FENCE_PATTERN = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractContentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(part => (isRecord(part) && typeof part.text === 'string' ? part.text : ''))
      .join('');
  }
  return '';
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const match = JSON_FENCE_PATTERN.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

/**
 * 解析视觉模型的直译响应：期望纯文本译文。
 * 空响应按「图中没有可翻译文字」处理，与识图失败区分开。
 */
export function parseVisionText(content: unknown): string {
  const text = stripJsonFence(extractContentText(content));
  if (!text) {
    throw new ImageTranslationError('NO_TEXT_IN_IMAGE', 'Image contains no readable text');
  }
  return text;
}

/** 从 OpenAI-compatible chat/completions 响应中解析译文文本 */
export function parseVisionResponse(response: unknown): string {
  if (!isRecord(response) || !Array.isArray(response.choices)) {
    throw new ImageTranslationError('VISION_RECOGNITION_FAILED', 'Vision response has no choices');
  }

  const choice = response.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) {
    throw new ImageTranslationError('VISION_RECOGNITION_FAILED', 'Vision response has no message content');
  }

  return parseVisionText(choice.message.content);
}
