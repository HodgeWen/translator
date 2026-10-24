import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import * as cache from '../src/lib/cache';
import * as storage from '../src/lib/storage';
import {
  HTTP_ERROR_BODY_LIMIT,
  HttpError,
  translate,
  truncateHttpErrorBody,
} from '../src/lib/api';
import { consumeOpenAIStream } from '../src/lib/api/sse-consumer';
import { DEFAULT_SETTINGS } from '../src/lib/storage';
import type { GlobalSettings, ProviderConfig, TranslationService } from '../src/types';

const originalFetch = globalThis.fetch;

interface Spies {
  restore: () => void;
}

function installSpies(settings: GlobalSettings): Spies {
  const spies = [
    spyOn(storage, 'getSettings').mockResolvedValue(settings as never),
    spyOn(cache, 'getCachedTranslation').mockResolvedValue(null),
    spyOn(cache, 'setCachedTranslation').mockResolvedValue(undefined),
  ];
  return { restore: () => spies.forEach((s) => s.mockRestore()) };
}

function settingsWithOneModel(): GlobalSettings {
  const provider: ProviderConfig = {
    id: 'p1',
    name: 'p1',
    baseURL: 'https://example.com/v1',
    apiKey: 'sk-secret-key-value',
    headers: {},
    query: {},
    body: {},
    models: [{ id: 'm1', name: 'M1' }],
  };
  const service: TranslationService = {
    id: 's1',
    name: 's1',
    type: 'single',
    providerId: 'p1',
    modelId: 'm1',
    fallbackEnabled: false,
    defaultDisplayStyle: 'personal_default',
    defaultTranslationTone: 'personal_default',
    promptMode: 'append',
    enablePolysemy: false,
  };
  return {
    ...DEFAULT_SETTINGS,
    providers: [provider],
    services: [service],
    selectedServiceId: 's1',
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('HTTP 错误体截断', () => {
  test('keeps short bodies intact and trims whitespace', () => {
    expect(truncateHttpErrorBody('  {"error":"bad"}  ')).toBe('{"error":"bad"}');
  });

  test('truncates long bodies to 200 chars plus an ellipsis', () => {
    const long = 'x'.repeat(500);
    const truncated = truncateHttpErrorBody(long);

    expect(truncated.length).toBe(HTTP_ERROR_BODY_LIMIT + 1);
    expect(truncated.endsWith('…')).toBe(true);
    expect(truncated.startsWith('x'.repeat(HTTP_ERROR_BODY_LIMIT))).toBe(true);
  });

  test('leaves a body of exactly the limit untouched', () => {
    const exact = 'y'.repeat(HTTP_ERROR_BODY_LIMIT);
    expect(truncateHttpErrorBody(exact)).toBe(exact);
  });

  test('does not leak a long body echoing credentials into the UI error message', async () => {
    const spies = installSpies(settingsWithOneModel());
    const echoed = 'Authorization: Bearer sk-secret-key-value ' + 'z'.repeat(2_000);
    globalThis.fetch = (async () => new Response(echoed, { status: 500 })) as typeof fetch;

    try {
      const error = await translate({ text: 'Hello', targetLang: 'zh-CN' })
        .then(() => null, (e: unknown) => e);

      const message = (error as Error).message;
      expect(message).toContain('HTTP 500:');
      expect(message).toContain('…');
      // 截断后错误信息里不再出现完整的 2000 字符响应体
      expect(message).not.toContain('z'.repeat(HTTP_ERROR_BODY_LIMIT + 10));
      expect(message.length).toBeLessThan(echoed.length);
    } finally {
      spies.restore();
    }
  });

  test('still carries status and Retry-After on HttpError', () => {
    const error = new HttpError(429, 'HTTP 429: slow down', 1_500);

    expect(error.status).toBe(429);
    expect(error.retryAfterMs).toBe(1_500);
  });
});

/** 构造一条发完 [DONE] 但不关闭底层流的 SSE 响应，并暴露 cancel 是否被调用 */
function sseResponseThatStaysOpen(): { response: Response; wasCancelled: () => boolean } {
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"你好"}}]}\n\n'));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      // 故意不 controller.close()：模拟服务端发完 [DONE] 后保持连接
    },
    cancel() {
      cancelled = true;
    },
  });

  return { response: new Response(stream, { status: 200 }), wasCancelled: () => cancelled };
}

describe('SSE 收到 [DONE] 后释放连接', () => {
  test('cancels the reader after [DONE] so the connection does not hang', async () => {
    const { response, wasCancelled } = sseResponseThatStaysOpen();

    const result = await consumeOpenAIStream(response, new AbortController().signal);

    expect(result.text).toBe('你好');
    // 让 cancel 的微任务/流回调有机会执行
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(wasCancelled()).toBe(true);
  });

  test('returns the accumulated text when the stream closes without [DONE]', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"完成"}}]}\n\n'));
        controller.close();
      },
    });

    const result = await consumeOpenAIStream(new Response(stream), new AbortController().signal);

    expect(result.text).toBe('完成');
  });

  test('rejects an empty stream', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    });

    await expect(
      consumeOpenAIStream(new Response(stream), new AbortController().signal)
    ).rejects.toThrow('Empty translation response');
  });
});
