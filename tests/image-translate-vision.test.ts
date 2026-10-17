import { describe, expect, test } from 'bun:test';
import { HttpError } from '../src/lib/api';
import { buildVisionBody, runVisionQueue } from '../src/lib/api/vision';
import type { ProviderModel } from '../src/lib/api/queue-builder';
import {
  IMAGE_VISION_PROMPT_VERSION,
  IMAGE_VISION_SYSTEM_PROMPT,
  IMAGE_VISION_USER_PROMPT,
} from '../src/lib/image-translate/vision-prompt';
import { parseVisionContent, parseVisionResponse } from '../src/lib/image-translate/vision-parse';
import { ImageTranslationError } from '../src/lib/image-translate/types';

const IMAGE_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

function providerModel(providerId: string, modelId: string): ProviderModel {
  return {
    provider: {
      id: providerId,
      name: providerId,
      baseURL: 'https://example.com/v1',
      apiKey: '',
      headers: {},
      query: {},
      body: {},
      models: [{ id: modelId, name: modelId, supportsVision: true }],
    },
    model: { id: modelId, name: modelId, supportsVision: true },
  };
}

function queueOf(...keys: Array<[string, string]>): ProviderModel[] {
  return keys.map(([providerId, modelId]) => providerModel(providerId, modelId));
}

function catchError(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error: unknown) => error
  );
}

describe('vision prompt', () => {
  test('states an OCR-only, versioned contract', () => {
    const prompt = IMAGE_VISION_SYSTEM_PROMPT + '\n' + IMAGE_VISION_USER_PROMPT;

    expect(IMAGE_VISION_PROMPT_VERSION).toMatch(/^v\d+$/);
    expect(prompt).toContain('OCR');
    expect(prompt).toContain('JSON array');
    expect(prompt).toContain('[]');
    expect(prompt.toLowerCase()).toContain('original language');
    expect(prompt.toLowerCase()).toContain('reading order');
    expect(prompt.toLowerCase()).toContain('do not translate');
  });
});

describe('vision response parsing', () => {
  test('parses a valid JSON array into normalized blocks', () => {
    const blocks = parseVisionContent(
      JSON.stringify([
        { text: '  Hello world  ', box: { x: 0.1, y: 0.2, w: 0.5, h: 0.1 } },
        { text: 'Second line', box: { x: 0, y: 0.4, w: 1, h: 0.2 } },
      ])
    );

    expect(blocks).toEqual([
      { text: 'Hello world', box: { x: 0.1, y: 0.2, w: 0.5, h: 0.1 } },
      { text: 'Second line', box: { x: 0, y: 0.4, w: 1, h: 0.2 } },
    ]);
  });

  test('tolerates a Markdown json fence and surrounding whitespace', () => {
    const content = '\n```json\n[{"text":"Fenced","box":{"x":0,"y":0,"w":0.25,"h":0.25}}]\n```\n';

    const blocks = parseVisionResponse({ choices: [{ message: { content } }] });

    expect(blocks).toEqual([{ text: 'Fenced', box: { x: 0, y: 0, w: 0.25, h: 0.25 } }]);
    expect(parseVisionContent('```\n[]\n```')).toEqual([]);
  });

  test('accepts content split into text fragments', () => {
    const content = [
      { type: 'text', text: '[{"text":"A","box":{"x":0,"y":0,"w":0.2,"h":0.1}},' },
      { type: 'text', text: '{"text":"B","box":{"x":0.2,"y":0.1,"w":0.2,"h":0.1}}]' },
    ];

    expect(parseVisionContent(content).map((block) => block.text)).toEqual(['A', 'B']);
  });

  test('returns an empty array for an image without text', () => {
    expect(parseVisionContent('[]')).toEqual([]);
  });

  test('drops empty and whitespace-only blocks', () => {
    const blocks = parseVisionContent(
      JSON.stringify([
        { text: '   ', box: { x: 0, y: 0, w: 0.1, h: 0.1 } },
        { text: '', box: { x: 0, y: 0.1, w: 0.1, h: 0.1 } },
        { text: ' Kept ', box: { x: 0, y: 0.2, w: 0.1, h: 0.1 } },
      ])
    );

    expect(blocks).toEqual([{ text: 'Kept', box: { x: 0, y: 0.2, w: 0.1, h: 0.1 } }]);
  });

  test('rejects out-of-bounds and non-positive boxes', () => {
    const boxes = [
      { x: -0.1, y: 0, w: 0.2, h: 0.1 },
      { x: 0, y: -0.1, w: 0.2, h: 0.1 },
      { x: 0, y: 0, w: 0, h: 0.1 },
      { x: 0, y: 0, w: 0.2, h: 0 },
      { x: 0.8, y: 0, w: 0.3, h: 0.1 },
      { x: 0, y: 0.8, w: 0.1, h: 0.3 },
    ];

    for (const box of boxes) {
      expect(() => parseVisionContent(JSON.stringify([{ text: 'x', box }]))).toThrow();
    }
  });

  test('rejects missing fields and non-finite numbers', () => {
    expect(() =>
      parseVisionContent(JSON.stringify([{ box: { x: 0, y: 0, w: 0.1, h: 0.1 } }]))
    ).toThrow();
    expect(() => parseVisionContent(JSON.stringify([{ text: 'x' }]))).toThrow();
    expect(() =>
      parseVisionContent('[{"text":"x","box":{"x":1e999,"y":0,"w":0.1,"h":0.1}}]')
    ).toThrow();
    expect(() => parseVisionContent(JSON.stringify(['not a block']))).toThrow();
  });

  test('rejects content that is not a JSON array', () => {
    expect(() => parseVisionContent('not json')).toThrow('not valid JSON');
    expect(() => parseVisionContent(JSON.stringify({ text: 'x' }))).toThrow('not a JSON array');
    expect(() => parseVisionContent('   ')).toThrow('Empty vision response');
  });
});

describe('vision request body', () => {
  test('builds a multimodal chat body with prompt text and the image data URL', () => {
    const target = providerModel('p1', 'vision-1');
    target.provider.body = { custom_field: 'kept', max_tokens: 1 };
    target.provider.temperature = 0.2;
    target.provider.maxTokens = 1024;
    target.provider.stream = true;

    const body = buildVisionBody(target, IMAGE_DATA_URL);
    const messages = body.messages as Array<{ role: string; content: unknown }>;

    expect(body.model).toBe('vision-1');
    expect(body.custom_field).toBe('kept');
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(1024);
    expect(body.stream).toBe(true);
    expect(messages[0]).toEqual({ role: 'system', content: IMAGE_VISION_SYSTEM_PROMPT });
    expect(messages[1]).toEqual({
      role: 'user',
      content: [
        { type: 'text', text: IMAGE_VISION_USER_PROMPT },
        { type: 'image_url', image_url: { url: IMAGE_DATA_URL } },
      ],
    });
  });
});

describe('vision queue fallback', () => {
  test('returns the first successful attempt', async () => {
    const calls: string[] = [];
    const result = await runVisionQueue(queueOf(['p1', 'm1'], ['p1', 'm2']), async (pm) => {
      calls.push(pm.model.id);
      return pm.model.id;
    });

    expect(result).toBe('m1');
    expect(calls).toEqual(['m1']);
  });

  test('falls back when parsing fails on the current model', async () => {
    const calls: string[] = [];
    const result = await runVisionQueue(queueOf(['p1', 'm1'], ['p1', 'm2']), async (pm) => {
      calls.push(pm.model.id);
      if (pm.model.id === 'm1') throw new Error('Vision response is not valid JSON');
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(calls).toEqual(['m1', 'm2']);
  });

  test('tries the next model of the same provider on non-fatal HTTP errors', async () => {
    const calls: string[] = [];
    const result = await runVisionQueue(queueOf(['p1', 'm1'], ['p1', 'm2']), async (pm) => {
      calls.push(pm.model.id);
      if (pm.model.id === 'm1') throw new HttpError(500, 'HTTP 500: server error');
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(calls).toEqual(['m1', 'm2']);
  });

  test('skips remaining models of a provider on 401/403/429', async () => {
    const calls: string[] = [];
    const result = await runVisionQueue(
      queueOf(['p1', 'm1'], ['p1', 'm2'], ['p2', 'm3']),
      async (pm) => {
        calls.push(pm.provider.id + '/' + pm.model.id);
        if (pm.provider.id === 'p1') throw new HttpError(429, 'HTTP 429: rate limited');
        return 'ok';
      }
    );

    expect(result).toBe('ok');
    expect(calls).toEqual(['p1/m1', 'p2/m3']);
  });

  test('throws a recognisable error when every model fails', async () => {
    const calls: string[] = [];
    const error = await catchError(
      runVisionQueue(queueOf(['p1', 'm1'], ['p1', 'm2']), async (pm) => {
        calls.push(pm.model.id);
        throw new Error('boom');
      })
    );

    expect(calls).toEqual(['m1', 'm2']);
    expect(error).toBeInstanceOf(ImageTranslationError);
    expect((error as ImageTranslationError).code).toBe('VISION_RECOGNITION_FAILED');
    expect((error as Error).message).toContain('p1/m1');
    expect((error as Error).message).toContain('p1/m2');
  });
});
