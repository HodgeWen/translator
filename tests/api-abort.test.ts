import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import * as cache from '../src/lib/cache';
import * as storage from '../src/lib/storage';
import {
  isTranslationAbortError,
  linkAbortSignals,
  translate,
  TranslationAbortError,
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

function provider(models: ProviderConfig['models']): ProviderConfig {
  return {
    id: 'p1',
    name: 'p1',
    baseURL: 'https://example.com/v1',
    apiKey: '',
    headers: {},
    query: {},
    body: {},
    models,
  };
}

function service(fallbackEnabled: boolean): TranslationService {
  return {
    id: 's1',
    name: 's1',
    type: 'single',
    providerId: 'p1',
    modelId: 'm1',
    fallbackEnabled,
    defaultDisplayStyle: 'personal_default',
    defaultTranslationTone: 'personal_default',
    promptMode: 'append',
    enablePolysemy: false,
  };
}

function settingsWith(models: ProviderConfig['models'], fallbackEnabled = true): GlobalSettings {
  return {
    ...DEFAULT_SETTINGS,
    providers: [provider(models)],
    services: [service(fallbackEnabled)],
    selectedServiceId: 's1',
  };
}

function jsonResponse(text: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }));
}

/** 永不返回，直到请求的 signal 被 abort；用于验证外部取消能打断挂起的 fetch */
function pendingUntilAborted(init?: RequestInit): Promise<Response> {
  return new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    if (!signal) return;
    if (signal.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    signal.addEventListener('abort', () =>
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    );
  });
}

function stubFetch(handler: (model: string, init?: RequestInit) => Response | Promise<Response>): {
  calls: string[];
  signals: Array<AbortSignal | undefined>;
} {
  const calls: string[] = [];
  const signals: Array<AbortSignal | undefined> = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { model?: string };
    calls.push(body.model ?? '');
    signals.push(init?.signal ?? undefined);
    return handler(body.model ?? '', init);
  }) as typeof fetch;
  return { calls, signals };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('linkAbortSignals', () => {
  test('aborts the internal controller when the external signal aborts', () => {
    const controller = new AbortController();
    const external = new AbortController();
    const unlink = linkAbortSignals(controller, external.signal);

    expect(controller.signal.aborted).toBe(false);
    external.abort();
    expect(controller.signal.aborted).toBe(true);
    unlink();
  });

  test('propagates an already-aborted external signal immediately', () => {
    const controller = new AbortController();
    const external = new AbortController();
    external.abort();

    linkAbortSignals(controller, external.signal);
    expect(controller.signal.aborted).toBe(true);
  });

  test('is a no-op without an external signal', () => {
    const controller = new AbortController();
    const unlink = linkAbortSignals(controller, undefined);

    expect(controller.signal.aborted).toBe(false);
    unlink();
  });
});

describe('translate 外部取消', () => {
  test('throws a recognisable abort error when the signal is already aborted', async () => {
    const spies = installSpies(settingsWith([{ id: 'm1', name: 'M1' }]));
    const { calls } = stubFetch(() => jsonResponse('不应被调用'));
    const controller = new AbortController();
    controller.abort();

    try {
      const error = await translate({ text: 'Hello', targetLang: 'zh-CN' }, { signal: controller.signal })
        .then(() => null, (e: unknown) => e);

      expect(error).toBeInstanceOf(TranslationAbortError);
      expect(isTranslationAbortError(error)).toBe(true);
      // 取消发生在发请求之前，不应产生任何计费请求
      expect(calls).toEqual([]);
    } finally {
      spies.restore();
    }
  });

  test('aborts the in-flight fetch and does not fall back to the next model', async () => {
    const spies = installSpies(
      settingsWith([{ id: 'm1', name: 'M1' }, { id: 'm2', name: 'M2' }], true)
    );
    const { calls, signals } = stubFetch((_model, init) => pendingUntilAborted(init));
    const controller = new AbortController();

    try {
      const pending = translate({ text: 'Hello', targetLang: 'zh-CN' }, { signal: controller.signal })
        .then(() => null, (e: unknown) => e);

      // 等 fetch 真正发出后再取消
      await new Promise((resolve) => setTimeout(resolve, 10));
      controller.abort();

      const error = await pending;

      expect(error).toBeInstanceOf(TranslationAbortError);
      // 取消不是模型的问题：不得降级到 m2，也不得重试 m1
      expect(calls).toEqual(['m1']);
      // 外部 signal 已合并进内部 signal（fetch 收到的 signal 会随外部取消 abort）
      expect(signals[0]?.aborted).toBe(true);
    } finally {
      spies.restore();
    }
  });

  test('keeps the existing behaviour when no signal is passed', async () => {
    const spies = installSpies(settingsWith([{ id: 'm1', name: 'M1' }], false));
    stubFetch(() => jsonResponse('你好'));

    try {
      // background.ts 不传 signal 时行为不变
      await expect(translate({ text: 'Hello', targetLang: 'zh-CN' })).resolves.toMatchObject({
        text: '你好',
      });
    } finally {
      spies.restore();
    }
  });

  test('does not join the in-flight map when a signal is passed, so a cancel cannot poison other callers', async () => {
    const spies = installSpies(settingsWith([{ id: 'm1', name: 'M1' }], false));
    let attempt = 0;
    stubFetch((_model, init) => {
      attempt++;
      return attempt === 1 ? pendingUntilAborted(init) : jsonResponse('重试成功');
    });
    const controller = new AbortController();

    try {
      const cancelled = translate({ text: 'Hello', targetLang: 'zh-CN' }, { signal: controller.signal })
        .then(() => null, (e: unknown) => e);
      await new Promise((resolve) => setTimeout(resolve, 10));
      controller.abort();
      expect(await cancelled).toBeInstanceOf(TranslationAbortError);

      // 取消后同一请求可以重新发起；无 signal 的调用方仍然走正常的请求流程
      await expect(translate({ text: 'Hello', targetLang: 'zh-CN' })).resolves.toMatchObject({
        text: '重试成功',
      });
    } finally {
      spies.restore();
    }
  });

  test('a cancelled signal caller must not evict another caller\'s in-flight entry', async () => {
    // 回归：finally 里曾无条件 delete(cacheKey)，但只有无 signal 的调用会 set。
    // 于是「A 无 signal 挂起 → B 同 key 带 signal 被取消」会删掉 A 的条目，
    // 随后 C 同 key 无 signal 时查不到在途请求、重新发 fetch → 重复计费。
    const spies = installSpies(settingsWith([{ id: 'm1', name: 'M1' }], false));
    let attempt = 0;
    const resolvers: Array<(value: Response) => void> = [];
    stubFetch((_model, init) => {
      attempt++;
      // 第 1 次：A 的在途请求，保持挂起直到测试显式放行
      if (attempt === 1) {
        return new Promise<Response>((resolve) => {
          resolvers.push(resolve);
          init.signal?.addEventListener('abort', () => {
            resolve(new Response('aborted', { status: 499 }));
          });
        });
      }
      return jsonResponse('后续结果');
    });
    const controller = new AbortController();

    try {
      // A：无 signal，登记在途条目
      const aPromise = translate({ text: 'Hello', targetLang: 'zh-CN' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      // B：同 key 带 signal，立即取消（它不应触碰 A 的条目）
      const bPromise = translate({ text: 'Hello', targetLang: 'zh-CN' }, { signal: controller.signal })
        .then(() => null, (e: unknown) => e);
      controller.abort();
      expect(await bPromise).toBeInstanceOf(TranslationAbortError);

      // C：同 key 无 signal，应复用 A 的在途请求，而不是再发一次 fetch
      const cPromise = translate({ text: 'Hello', targetLang: 'zh-CN' });

      expect(attempt).toBe(1);

      resolvers[0](jsonResponse('你好'));
      const [a, c] = await Promise.all([aPromise, cPromise]);

      expect(a.text).toBe('你好');
      expect(c.text).toBe('你好');
      // 关键断言：全程只发出一次真实请求
      expect(attempt).toBe(1);
    } finally {
      spies.restore();
    }
  });

  test('keeps in-flight deduplication for callers without a signal', async () => {
    const spies = installSpies(settingsWith([{ id: 'm1', name: 'M1' }], false));
    const { calls } = stubFetch(() => jsonResponse('你好'));

    try {
      const [first, second] = await Promise.all([
        translate({ text: 'Hello', targetLang: 'zh-CN' }),
        translate({ text: 'Hello', targetLang: 'zh-CN' }),
      ]);

      expect(first.text).toBe('你好');
      expect(second.text).toBe('你好');
      // 同一在途请求被复用：只发一次请求
      expect(calls).toEqual(['m1']);
    } finally {
      spies.restore();
    }
  });
});
