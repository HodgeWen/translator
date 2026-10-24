import { afterEach, describe, expect, test } from 'bun:test';
import { HttpError } from '../src/lib/api';
import {
  IMAGE_VISION_TIMEOUT_MS,
  buildVisionBody,
  callVisionModel,
  runVisionQueue,
} from '../src/lib/api/vision';
import { DEFAULT_SETTINGS } from '../src/lib/storage';
import type { ProviderModel } from '../src/lib/api/queue-builder';
import {
  IMAGE_VISION_PROMPT_VERSION,
  IMAGE_TRANSLATE_SYSTEM_PROMPT,
  buildImageTranslateUserPrompt,
} from '../src/lib/image-translate/vision-prompt';
import { parseVisionText, parseVisionResponse } from '../src/lib/image-translate/vision-parse';
import { ImageTranslationError } from '../src/lib/image-translate/types';

const IMAGE_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';
const TARGET_LANG = 'zh-CN';

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

const originalFetch = globalThis.fetch;

type FetchHandler = (model: string, init?: RequestInit) => Response | Promise<Response>;

/** 按请求体里的 model 分发响应，供 callVisionModel 的失败映射测试使用 */
function stubFetch(handler: FetchHandler): void {
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { model?: string };
    return handler(body.model ?? '', init);
  }) as typeof fetch;
}

/** 永不返回的响应，直到 callVisionModel 的超时中止 signal */
function pendingUntilAborted(init?: RequestInit): Promise<Response> {
  return new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    );
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('vision prompt', () => {
  test('states a versioned translation contract targeting the requested language', () => {
    const prompt = IMAGE_TRANSLATE_SYSTEM_PROMPT + '\n' + buildImageTranslateUserPrompt(TARGET_LANG);

    expect(IMAGE_VISION_PROMPT_VERSION).toMatch(/^v\d+$/);
    expect(prompt).toContain('translate');
    expect(prompt).toContain(TARGET_LANG);
    expect(prompt).toContain('ONLY the translated text');
    expect(prompt).toContain('reading order');
    expect(prompt).toContain('no readable text');
  });
});

describe('vision response parsing', () => {
  test('returns the plain translated text trimmed', () => {
    expect(parseVisionText('  你好，世界\n第二行  ')).toBe('你好，世界\n第二行');
  });

  test('tolerates a Markdown code fence and surrounding whitespace', () => {
    expect(parseVisionText('\n```\n你好\n```\n')).toBe('你好');
    expect(parseVisionText('```json\n"引用文本"\n```')).toBe('"引用文本"');
  });

  test('accepts content split into text fragments', () => {
    const content = [
      { type: 'text', text: '第一段，' },
      { type: 'text', text: '第二段。' },
    ];

    expect(parseVisionText(content)).toBe('第一段，第二段。');
  });

  test('maps an empty response to NO_TEXT_IN_IMAGE', () => {
    expect(() => parseVisionText('   ')).toThrow(ImageTranslationError);
    try {
      parseVisionText('');
    } catch (error) {
      expect((error as ImageTranslationError).code).toBe('NO_TEXT_IN_IMAGE');
    }
  });

  test('parses a chat/completions response', () => {
    const response = { choices: [{ message: { content: '整图译文' } }] };
    expect(parseVisionResponse(response)).toBe('整图译文');
  });

  test('rejects responses without message content', () => {
    expect(() => parseVisionResponse({})).toThrow('no choices');
    expect(() => parseVisionResponse({ choices: [{}] })).toThrow('no message content');
  });
});

describe('vision request body', () => {
  test('builds a multimodal chat body with the translate prompt and image data URL', () => {
    const target = providerModel('p1', 'vision-1');
    target.provider.body = { custom_field: 'kept', max_tokens: 1 };
    target.provider.temperature = 0.2;
    target.provider.maxTokens = 1024;
    target.provider.stream = true;

    const body = buildVisionBody(target, IMAGE_DATA_URL, TARGET_LANG);
    const messages = body.messages as Array<{ role: string; content: unknown }>;

    expect(body.model).toBe('vision-1');
    expect(body.custom_field).toBe('kept');
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(1024);
    expect(body.stream).toBe(true);
    expect(messages[0]).toEqual({ role: 'system', content: IMAGE_TRANSLATE_SYSTEM_PROMPT });
    expect(messages[1]).toEqual({
      role: 'user',
      content: [
        { type: 'text', text: buildImageTranslateUserPrompt(TARGET_LANG) },
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
      if (pm.model.id === 'm1') throw new Error('Empty vision response');
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

  test('skips remaining models of a provider on 401/403', async () => {
    for (const status of [401, 403]) {
      const calls: string[] = [];
      const result = await runVisionQueue(
        queueOf(['p1', 'm1'], ['p1', 'm2'], ['p2', 'm3']),
        async (pm) => {
          calls.push(pm.provider.id + '/' + pm.model.id);
          if (pm.provider.id === 'p1') throw new HttpError(status, `HTTP ${status}: auth failed`);
          return 'ok';
        }
      );

      expect(result).toBe('ok');
      expect(calls).toEqual(['p1/m1', 'p2/m3']);
    }
  });

  test('429 does NOT skip the rest of the provider: other models may have separate quota', async () => {
    // 429 是瞬时限流，不是 provider 失效。同一 provider 的不同视觉模型常有独立配额，
    // 直接丢掉整个 provider 的备选模型会让「首选模型限流」变成整条链路失败。
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
    expect(calls).toEqual(['p1/m1', 'p1/m2', 'p2/m3']);
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

describe('vision request timeout', () => {
  test('uses an independent timeout window between 45s and 120s', () => {
    expect(IMAGE_VISION_TIMEOUT_MS).toBeGreaterThanOrEqual(45_000);
    expect(IMAGE_VISION_TIMEOUT_MS).toBeLessThanOrEqual(120_000);
    expect(IMAGE_VISION_TIMEOUT_MS).not.toBe(DEFAULT_SETTINGS.requestTimeout);
  });

  test('maps an aborted request to VISION_TIMEOUT with an injectable short timeout', async () => {
    stubFetch((_model, init) => pendingUntilAborted(init));

    const error = await catchError(
      callVisionModel(providerModel('p1', 'm1'), IMAGE_DATA_URL, TARGET_LANG, 5)
    );

    expect(error).toBeInstanceOf(ImageTranslationError);
    expect((error as ImageTranslationError).code).toBe('VISION_TIMEOUT');
    expect((error as Error).message).toContain('5ms');
  });

  test('maps a Request aborted failure to VISION_TIMEOUT', async () => {
    stubFetch(() => {
      throw new Error('Request aborted');
    });

    const error = await catchError(
      callVisionModel(providerModel('p1', 'm1'), IMAGE_DATA_URL, TARGET_LANG, 1_000)
    );

    expect((error as ImageTranslationError).code).toBe('VISION_TIMEOUT');
  });
});

describe('vision HTTP failure classification', () => {
  test('parses a successful non-streaming response', async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '整图译文' } }],
            usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
          })
        )
    );

    const { text, usage } = await callVisionModel(
      providerModel('p1', 'm1'),
      IMAGE_DATA_URL,
      TARGET_LANG,
      1_000
    );

    expect(text).toBe('整图译文');
    expect(usage).toEqual({ promptTokens: 3, completionTokens: 4, totalTokens: 7 });
  });

  test('maps 400/422 not-a-VLM and does-not-support-image bodies to VISION_MODEL_UNSUPPORTED', async () => {
    const cases: Array<[number, string]> = [
      [400, '{"error":"Model is not a VLM"}'],
      [422, '{"error":"This model does not support image input"}'],
      [400, '{"error":"unsupported vision input"}'],
    ];

    for (const [status, body] of cases) {
      stubFetch(() => new Response(body, { status }));

      const error = await catchError(
        callVisionModel(providerModel('p1', 'm1'), IMAGE_DATA_URL, TARGET_LANG, 1_000)
      );

      expect(error).toBeInstanceOf(HttpError);
      expect((error as { code?: string }).code).toBe('VISION_MODEL_UNSUPPORTED');
      expect((error as Error).message).toContain('HTTP ' + status);
    }
  });

  test('maps other 400/401/403/429/500 responses to VISION_HTTP_ERROR', async () => {
    for (const status of [400, 401, 403, 429, 500]) {
      stubFetch(() => new Response('{"error":"request failed"}', { status }));

      const error = await catchError(
        callVisionModel(providerModel('p1', 'm1'), IMAGE_DATA_URL, TARGET_LANG, 1_000)
      );

      expect(error).toBeInstanceOf(HttpError);
      expect((error as { code?: string }).code).toBe('VISION_HTTP_ERROR');
      expect((error as Error).message).toContain('HTTP ' + status + ':');
      expect((error as Error).message).toContain('request failed');
    }
  });

  test('truncates long HTTP error bodies but keeps status and detail', async () => {
    const longBody = 'x'.repeat(500);
    stubFetch(() => new Response(longBody, { status: 500 }));

    const error = await catchError(
      callVisionModel(providerModel('p1', 'm1'), IMAGE_DATA_URL, TARGET_LANG, 1_000)
    );

    expect((error as Error).message).toContain('HTTP 500:');
    expect((error as Error).message.length).toBeLessThan(longBody.length);
    expect((error as Error).message).toContain('…');
  });

  test('still skips the remaining models of a provider on 401', async () => {
    const calls: string[] = [];
    stubFetch((model) =>
      model === 'm1'
        ? new Response('{"error":"invalid api key"}', { status: 401 })
        : new Response(JSON.stringify({ choices: [{ message: { content: '译文' } }] }))
    );

    const result = await runVisionQueue(
      queueOf(['p1', 'm1'], ['p1', 'm2'], ['p2', 'm3']),
      async (pm) => {
        calls.push(pm.provider.id + '/' + pm.model.id);
        return callVisionModel(pm, IMAGE_DATA_URL, TARGET_LANG, 1_000);
      }
    );

    expect(calls).toEqual(['p1/m1', 'p2/m3']);
    expect(result.text).toBe('译文');
  });
});

describe('vision aggregate failure code', () => {
  test('prefers VISION_MODEL_UNSUPPORTED over VISION_HTTP_ERROR', async () => {
    stubFetch((model) =>
      model === 'm1'
        ? new Response('{"error":"boom"}', { status: 500 })
        : new Response('{"error":"not a VLM"}', { status: 400 })
    );

    const error = await catchError(
      runVisionQueue(queueOf(['p1', 'm1'], ['p1', 'm2']), (pm) =>
        callVisionModel(pm, IMAGE_DATA_URL, TARGET_LANG, 1_000)
      )
    );

    expect(error).toBeInstanceOf(ImageTranslationError);
    expect((error as ImageTranslationError).code).toBe('VISION_MODEL_UNSUPPORTED');
  });

  test('prefers VISION_TIMEOUT over every other failure code', async () => {
    stubFetch((model, init) => {
      if (model === 'm1') return new Response('{"error":"boom"}', { status: 500 });
      if (model === 'm2') return new Response('{"error":"not a VLM"}', { status: 400 });
      return pendingUntilAborted(init);
    });

    const error = await catchError(
      runVisionQueue(queueOf(['p1', 'm1'], ['p1', 'm2'], ['p1', 'm3']), (pm) =>
        callVisionModel(pm, IMAGE_DATA_URL, TARGET_LANG, pm.model.id === 'm3' ? 5 : 1_000)
      )
    );

    expect(error).toBeInstanceOf(ImageTranslationError);
    expect((error as ImageTranslationError).code).toBe('VISION_TIMEOUT');
  });
});
