import { afterEach, describe, expect, test } from 'bun:test';
import { testProvider } from '../src/lib/api';
import type { ProviderConfig } from '../src/types';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function provider(stream: boolean): ProviderConfig {
  return {
    id: 'p1',
    name: 'p1',
    baseURL: 'https://example.com/v1',
    apiKey: '',
    headers: {},
    query: {},
    body: {},
    models: [{ id: 'm1', name: 'Model 1', supportsVision: false }],
    stream,
  };
}

/** 构造一条 OpenAI 兼容的 SSE 响应；末尾不关闭流，模拟服务端只发 [DONE] 不关连接 */
function sseResponse(events: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event));
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function captureFetch(response: () => Response): { calls: RequestInit[] } {
  const calls: RequestInit[] = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(init ?? {});
    return response();
  }) as typeof fetch;
  return { calls };
}

describe('testProvider 流式分支', () => {
  test('reads an SSE response instead of calling response.json()', async () => {
    const { calls } = captureFetch(() =>
      sseResponse([
        'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"，世界"}}]}\n\n',
        'data: [DONE]\n\n',
      ])
    );

    const result = await testProvider(provider(true), 'Hello, world', 'zh-CN');

    expect(result.text).toBe('你好，世界');
    expect(result.modelName).toBe('Model 1');
    // 流式响应没有 usage 字段：保持 undefined，不伪造 0
    expect(result.usage).toBeUndefined();
    // 请求体确实带上了 stream: true（applyProviderSampling 的既有行为）
    expect(JSON.parse(String(calls[0]?.body)).stream).toBe(true);
  });

  test('keeps the non-streaming JSON path and its usage handling', async () => {
    captureFetch(
      () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '你好' } }],
            usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
          })
        )
    );

    const result = await testProvider(provider(false), 'Hello', 'zh-CN');

    expect(result.text).toBe('你好');
    expect(result.usage).toEqual({ promptTokens: 2, completionTokens: 3, totalTokens: 5 });
  });

  test('still surfaces HTTP failures for streaming providers', async () => {
    captureFetch(() => new Response('{"error":"invalid api key"}', { status: 401 }));

    await expect(testProvider(provider(true), 'Hello', 'zh-CN')).rejects.toThrow('HTTP 401');
  });
});
