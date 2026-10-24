import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import * as cache from '../src/lib/cache';
import * as storage from '../src/lib/storage';
import { translate } from '../src/lib/api';
import { DEFAULT_SETTINGS } from '../src/lib/storage';
import type { GlobalSettings, ProviderConfig, TranslationService } from '../src/types';

const originalFetch = globalThis.fetch;

interface Spies {
  restore: () => void;
}

/** 用 spyOn 注入设置与缓存，避免测试依赖 chrome.storage / IndexedDB */
function installSpies(settings: GlobalSettings, cacheOverrides: {
  get?: () => Promise<{ text: string; hash: string } | null>;
  set?: () => Promise<void>;
} = {}): Spies {
  const spies = [
    spyOn(storage, 'getSettings').mockResolvedValue(settings as never),
    spyOn(cache, 'getCachedTranslation').mockImplementation(
      cacheOverrides.get ?? (async () => null)
    ),
    spyOn(cache, 'setCachedTranslation').mockImplementation(
      cacheOverrides.set ?? (async () => {})
    ),
  ];
  return { restore: () => spies.forEach((s) => s.mockRestore()) };
}

function provider(models: ProviderConfig['models']): ProviderConfig {
  return {
    id: 'p1',
    name: 'Provider 1',
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
    name: 'Service 1',
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

function settingsWith(models: ProviderConfig['models'], fallbackEnabled = false): GlobalSettings {
  return {
    ...DEFAULT_SETTINGS,
    providers: [provider(models)],
    services: [service(fallbackEnabled)],
    selectedServiceId: 's1',
  };
}

/** 按请求体里的 model 分发响应，并记录调用顺序 */
function stubFetch(handler: (model: string) => Response): { calls: string[] } {
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

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('缓存写入失败不触发降级（重复计费防护）', () => {
  test('returns the successful translation and calls the model exactly once', async () => {
    const spies = installSpies(settingsWith([{ id: 'm1', name: 'M1' }, { id: 'm2', name: 'M2' }], true), {
      set: async () => {
        throw new Error('IndexedDB quota exceeded');
      },
    });
    const { calls } = stubFetch(() => jsonResponse('你好'));

    try {
      const result = await translate({ text: 'Hello', targetLang: 'zh-CN' });

      expect(result.text).toBe('你好');
      expect(result.providerId).toBe('p1');
      expect(result.modelId).toBe('m1');
      // 关键断言：写缓存失败不得把已成功（且已计费）的请求重放到下一个模型
      expect(calls).toEqual(['m1']);
    } finally {
      spies.restore();
    }
  });

  test('does not turn a cache write failure into an all-models-failed error', async () => {
    const spies = installSpies(settingsWith([{ id: 'm1', name: 'M1' }]), {
      set: async () => {
        throw new Error('quota exceeded');
      },
    });
    stubFetch(() => jsonResponse('你好'));

    try {
      await expect(translate({ text: 'Hello', targetLang: 'zh-CN' })).resolves.toMatchObject({
        text: '你好',
        modelId: 'm1',
      });
    } finally {
      spies.restore();
    }
  });
});
