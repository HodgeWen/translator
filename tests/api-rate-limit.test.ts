import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import * as cache from '../src/lib/cache';
import * as storage from '../src/lib/storage';
import {
  computeRateLimitDelayMs,
  isProviderFatal,
  HttpError,
  parseRetryAfterMs,
  translate,
} from '../src/lib/api';
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

function provider(id: string, models: ProviderConfig['models']): ProviderConfig {
  return {
    id,
    name: id,
    baseURL: 'https://example.com/v1',
    apiKey: '',
    headers: {},
    query: {},
    body: {},
    models,
  };
}

function singleService(providerId: string, modelId: string, fallbackEnabled: boolean): TranslationService {
  return {
    id: 's1',
    name: 'Service 1',
    type: 'single',
    providerId,
    modelId,
    fallbackEnabled,
    defaultDisplayStyle: 'personal_default',
    defaultTranslationTone: 'personal_default',
    promptMode: 'append',
    enablePolysemy: false,
  };
}

function settingsWith(providers: ProviderConfig[], fallbackEnabled = true): GlobalSettings {
  return {
    ...DEFAULT_SETTINGS,
    providers,
    services: [singleService(providers[0].id, providers[0].models[0].id, fallbackEnabled)],
    selectedServiceId: 's1',
  };
}

interface FetchStub {
  calls: string[];
}

function stubFetch(handler: (model: string) => Response | Promise<Response>): FetchStub {
  const calls: string[] = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { model?: string };
    const model = body.model ?? '';
    calls.push(model);
    return handler(model);
  }) as typeof fetch;
  return { calls };
}

function jsonResponse(text: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }));
}

function rateLimited(retryAfter?: string): Response {
  const headers: Record<string, string> = {};
  if (retryAfter !== undefined) headers['Retry-After'] = retryAfter;
  return new Response('{"error":"rate limited"}', { status: 429, headers });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Retry-After 解析与退避计算', () => {
  test('parses seconds and HTTP-date formats', () => {
    expect(parseRetryAfterMs('2')).toBe(2_000);
    expect(parseRetryAfterMs('0.5')).toBe(500);
    expect(parseRetryAfterMs(null)).toBeUndefined();
    expect(parseRetryAfterMs('')).toBeUndefined();
    expect(parseRetryAfterMs('not-a-date')).toBeUndefined();

    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const at = new Date(now + 3_000).toUTCString();
    expect(parseRetryAfterMs(at, now)).toBe(3_000);
    // 过去的日期按 0 处理，不退避
    expect(parseRetryAfterMs(new Date(now - 5_000).toUTCString(), now)).toBe(0);
  });

  test('caps a single wait at 5s and prefers Retry-After', () => {
    expect(computeRateLimitDelayMs(0)).toBe(500);
    expect(computeRateLimitDelayMs(1)).toBe(1_000);
    expect(computeRateLimitDelayMs(10)).toBe(5_000);
    expect(computeRateLimitDelayMs(0, 1_500)).toBe(1_500);
    expect(computeRateLimitDelayMs(0, 60_000)).toBe(5_000);
  });

  test('treats only 401/403 as provider-fatal, not 429', () => {
    expect(isProviderFatal(new HttpError(401, 'unauthorized'))).toBe(true);
    expect(isProviderFatal(new HttpError(403, 'forbidden'))).toBe(true);
    // 429 是瞬时限流：应重试 / 换模型，而不是判整个 provider 死刑
    expect(isProviderFatal(new HttpError(429, 'rate limited'))).toBe(false);
    expect(isProviderFatal(new HttpError(500, 'server error'))).toBe(false);
    expect(isProviderFatal(new Error('boom'))).toBe(false);
  });
});

describe('429 退避重试', () => {
  test('retries the same model after a 429 and succeeds', async () => {
    const spies = installSpies(settingsWith([provider('p1', [{ id: 'm1', name: 'M1' }])]));
    const { calls } = stubFetch(() => (calls.length < 2 ? rateLimited('0') : jsonResponse('你好')));

    try {
      const result = await translate({ text: 'Hello', targetLang: 'zh-CN' });

      expect(result.text).toBe('你好');
      // 同一模型被重试一次后才成功
      expect(calls).toEqual(['m1', 'm1']);
    } finally {
      spies.restore();
    }
  });

  test('falls back to the next model when retries are exhausted', async () => {
    const spies = installSpies(
      settingsWith([provider('p1', [{ id: 'm1', name: 'M1' }, { id: 'm2', name: 'M2' }])])
    );
    const { calls } = stubFetch((model) => (model === 'm1' ? rateLimited('0') : jsonResponse('第二个')));

    try {
      const result = await translate({ text: 'Hello', targetLang: 'zh-CN' });

      expect(result.text).toBe('第二个');
      // 1 次首试 + 最多 2 次退避重试，然后才降级到 m2
      expect(calls).toEqual(['m1', 'm1', 'm1', 'm2']);
    } finally {
      spies.restore();
    }
  });

  test('gives up retrying immediately when Retry-After exceeds the remaining budget', async () => {
    // requestTimeout 最小 5000ms；给一个远超预算的 Retry-After
    const spies = installSpies(
      settingsWith([provider('p1', [{ id: 'm1', name: 'M1' }, { id: 'm2', name: 'M2' }])])
    );
    const { calls } = stubFetch((model) =>
      model === 'm1' ? rateLimited('120') : jsonResponse('降级成功')
    );

    try {
      const startedAt = Date.now();
      const result = await translate({ text: 'Hello', targetLang: 'zh-CN' });
      const elapsed = Date.now() - startedAt;

      expect(result.text).toBe('降级成功');
      // Retry-After 会超出剩余预算 → 不做无谓等待，直接换下一个模型
      expect(calls).toEqual(['m1', 'm2']);
      expect(elapsed).toBeLessThan(1_000);
    } finally {
      spies.restore();
    }
  });

  test('total wait stays within settings.requestTimeout', async () => {
    // 用较小的 requestTimeout（绕过 schema 下限）让预算约束能被快速验证
    const settings = { ...settingsWith([provider('p1', [{ id: 'm1', name: 'M1' }])]), requestTimeout: 1_200 };
    const spies = installSpies(settings);
    // Retry-After 0.5s：两次退避后预算耗尽，不再继续重试
    const { calls } = stubFetch(() => rateLimited('0.5'));

    try {
      const startedAt = Date.now();
      await expect(translate({ text: 'Hello', targetLang: 'zh-CN' })).rejects.toThrow(
        'All translation models failed'
      );
      const elapsed = Date.now() - startedAt;

      // 退避不会把总耗时放大到超过 requestTimeout（留一点调度余量）
      expect(elapsed).toBeLessThan(1_200 + 500);
      // 1 次首试 + 最多 2 次重试，硬上限
      expect(calls.length).toBeLessThanOrEqual(3);
    } finally {
      spies.restore();
    }
  });

  test('does not retry non-429 failures', async () => {
    const spies = installSpies(
      settingsWith([provider('p1', [{ id: 'm1', name: 'M1' }, { id: 'm2', name: 'M2' }])])
    );
    const { calls } = stubFetch((model) =>
      model === 'm1' ? new Response('{"error":"boom"}', { status: 500 }) : jsonResponse('ok')
    );

    try {
      const result = await translate({ text: 'Hello', targetLang: 'zh-CN' });

      expect(result.text).toBe('ok');
      // 500 不重试：m1 只尝试一次就降级
      expect(calls).toEqual(['m1', 'm2']);
    } finally {
      spies.restore();
    }
  });

  test('skips the remaining models of a provider on 401 without retrying', async () => {
    const spies = installSpies(
      settingsWith([provider('p1', [{ id: 'm1', name: 'M1' }, { id: 'm2', name: 'M2' }])])
    );
    const { calls } = stubFetch(() => new Response('{"error":"invalid api key"}', { status: 401 }));

    try {
      await expect(translate({ text: 'Hello', targetLang: 'zh-CN' })).rejects.toThrow(
        /skipped \(provider-level fatal error\)/
      );
      // 鉴权失败不重试，且跳过同 provider 的 m2
      expect(calls).toEqual(['m1']);
    } finally {
      spies.restore();
    }
  });
});
