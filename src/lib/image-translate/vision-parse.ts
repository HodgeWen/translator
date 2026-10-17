import type { ImageBox, ImageTextBlock } from './types';

// 匹配 ```json ... ``` 或 ``` ... ``` 围栏，模型常把 JSON 数组包在 Markdown 代码块里。
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

function readFiniteNumber(name: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Vision block box.' + name + ' is not a finite number');
  }
  return value;
}

function parseBox(value: unknown): ImageBox {
  if (!isRecord(value)) {
    throw new Error('Vision block box is missing');
  }

  const x = readFiniteNumber('x', value.x);
  const y = readFiniteNumber('y', value.y);
  const w = readFiniteNumber('w', value.w);
  const h = readFiniteNumber('h', value.h);

  if (x < 0 || y < 0) {
    throw new Error('Vision block box starts outside the image');
  }
  if (w <= 0 || h <= 0) {
    throw new Error('Vision block box has a non-positive size');
  }
  if (x + w > 1 || y + h > 1) {
    throw new Error('Vision block box exceeds the image bounds');
  }

  return { x, y, w, h };
}

function parseBlock(value: unknown): ImageTextBlock | null {
  if (!isRecord(value)) {
    throw new Error('Vision block is not an object');
  }
  if (typeof value.text !== 'string') {
    throw new Error('Vision block text is missing');
  }

  const text = value.text.trim();
  if (!text) return null;

  return { text, box: parseBox(value.box) };
}

/** 解析 message.content（字符串或文本片段数组）中的 JSON 数组 */
export function parseVisionContent(content: unknown): ImageTextBlock[] {
  const text = extractContentText(content);
  if (!text.trim()) {
    throw new Error('Empty vision response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(text));
  } catch {
    throw new Error('Vision response is not valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Vision response is not a JSON array');
  }

  const blocks: ImageTextBlock[] = [];
  for (const item of parsed) {
    const block = parseBlock(item);
    if (block) blocks.push(block);
  }
  return blocks;
}

/** 从 OpenAI-compatible chat/completions 响应中解析识别块 */
export function parseVisionResponse(response: unknown): ImageTextBlock[] {
  if (!isRecord(response) || !Array.isArray(response.choices)) {
    throw new Error('Vision response has no choices');
  }

  const choice = response.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) {
    throw new Error('Vision response has no message content');
  }

  return parseVisionContent(choice.message.content);
}
