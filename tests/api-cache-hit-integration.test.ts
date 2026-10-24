import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import * as cache from '../src/lib/cache';
import * as storage from '../src/lib/storage';
import { translate } from '../src/lib/api';
import { DEFAULT_SETTINGS } from '../src/lib/storage';
import type { GlobalSettings, ProviderConfig, TranslationService } from '../src/types';

// 端到端锁定「升级后缓存仍能命中」：单元测试只能证明分区函数本身正确，
// 但真正的 bug 往往出在调用处（忘记把请求文本传进去，指纹检测就永远看不到
// 文本、一律判为矛盾，盐值又会退回无条件分区）。这里从 translate() 入口
// 走完整链路，断言写缓存与读缓存用的是同一个 key。

const originalFetch = globalThis.fetch;

/** 复刻 v0.5.1 的分区算法，代表升级前已写入磁盘的缓存条目 key */
async function legacyPartition(globalPrompt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(globalPrompt));
  return Array.from(new Uint8Array(buf, 0, 4))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function provider(): ProviderConfig {
  return {
    id: 'p1',
    name: 'Provider 1',
    baseURL: 'https://example.com/v1',
    apiKey: '',
    headers: {},
    query: {},
    body: {},
    models: [{ id: 'm1', name: 'M1' }],
  };
}

function service(): TranslationService {
  return {
    id: 's1',
    name: 'Service 1',
    type: 'single',
    providerId: 'p1',
    modelId: 'm1',
    fallbackEnabled: false,
    defaultDisplayStyle: 'personal_default',
    defaultTranslationTone: 'personal_default',
    promptMode: 'append',
    enablePolysemy: false,
  };
}

function settings(): GlobalSettings {
  return {
    ...DEFAULT_SETTINGS,
    providers: [provider()],
    services: [service()],
    selectedServiceId: 's1',
  };
}

function jsonResponse(text: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }));
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('缓存命中链路：升级后仍复用 v0.5.1 写入的条目', () => {
  test('聚合请求按段落命中缓存：批次组成变化也能复用（不发请求）', async () => {
    // 聚合请求的缓存粒度是「单个段落」，不是整批文本。否则批次组成一变
    // （滚动节奏、视口起点不同）整批 key 就不同，缓存永远命中不了。
    const legacyKey = await legacyPartition(DEFAULT_SETTINGS.globalPrompt);
    const cachedParagraphs = new Map<string, string>([
      ['Hello there', '你好'],
      ['General Kenobi', '肯诺比将军'],
    ]);
    const getSpy = spyOn(cache, 'getCachedTranslation').mockImplementation(
      async (text: string, _lang: string, salt = '') => {
        if (salt !== legacyKey) return null;
        const hit = cachedParagraphs.get(text);
        return hit === undefined ? null : { text: hit, hash: text };
      }
    );
    const setSpy = spyOn(cache, 'setCachedTranslation').mockImplementation(async () => {});
    const settingsSpy = spyOn(storage, 'getSettings').mockResolvedValue(settings() as never);
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls++;
      return jsonResponse('不应被调用');
    }) as typeof fetch;

    try {
      // 与写入时的批次组成不同（顺序不同、多了一段），但两段都已缓存
      const result = await translate({
        text: '<<<1>>>\nGeneral Kenobi\n<<<2>>>\nHello there',
        targetLang: 'zh-CN',
        isAggregate: true,
        hasPlaceholders: false,
      });

      expect(result.providerId).toBe('cache');
      expect(fetchCalls).toBe(0);
      expect(setSpy).not.toHaveBeenCalled();
      // 返回的仍是合法批次格式，调用方能按 <<<N>>> 正常切分
      expect(result.text).toContain('<<<1>>>');
      expect(result.text).toContain('肯诺比将军');
      expect(result.text).toContain('<<<2>>>');
      expect(result.text).toContain('你好');
    } finally {
      getSpy.mockRestore();
      setSpy.mockRestore();
      settingsSpy.mockRestore();
    }
  });

  test('占位符请求的缓存 key 与旧版本一致（读命中，不发请求）', async () => {
    const legacyKey = await legacyPartition(DEFAULT_SETTINGS.globalPrompt);
    const getSpy = spyOn(cache, 'getCachedTranslation').mockImplementation(
      async (_text: string, _lang: string, salt = '') => (
        salt === legacyKey ? { text: '旧版缓存译文', hash: legacyKey } : null
      )
    );
    const setSpy = spyOn(cache, 'setCachedTranslation').mockImplementation(async () => {});
    const settingsSpy = spyOn(storage, 'getSettings').mockResolvedValue(settings() as never);
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls++;
      return jsonResponse('不应被调用');
    }) as typeof fetch;

    try {
      const result = await translate({
        text: '<s0>Hello</s0> #1# world',
        targetLang: 'zh-CN',
        hasPlaceholders: true,
      });

      expect(result.text).toBe('旧版缓存译文');
      expect(fetchCalls).toBe(0);
      expect(setSpy).not.toHaveBeenCalled();
    } finally {
      getSpy.mockRestore();
      setSpy.mockRestore();
      settingsSpy.mockRestore();
    }
  });

  test('写缓存与读缓存使用同一个 key（同一请求二次调用不发第二次请求）', async () => {
    // 内存版缓存：模拟 IndexedDB 的 key → 译文映射
    const store = new Map<string, string>();
    const getSpy = spyOn(cache, 'getCachedTranslation').mockImplementation(
      async (text: string, lang: string, salt = '') => {
        const hit = store.get(`${text}:${lang}:${salt}`);
        return hit === undefined ? null : { text: hit, hash: `${text}:${lang}:${salt}` };
      }
    );
    const setSpy = spyOn(cache, 'setCachedTranslation').mockImplementation(
      async (text: string, lang: string, translated: string, _hash?: string, salt = '') => {
        store.set(`${text}:${lang}:${salt}`, translated);
      }
    );
    const settingsSpy = spyOn(storage, 'getSettings').mockResolvedValue(settings() as never);
    let fetchCalls = 0;
    // 模拟遵守 <<<N>>> 协议的模型：逐段回译，保持批次格式
    globalThis.fetch = (async () => {
      fetchCalls++;
      return jsonResponse('<<<1>>>\n你好世界');
    }) as typeof fetch;

    const request = {
      text: '<<<1>>>\nHello world',
      targetLang: 'zh-CN' as const,
      isAggregate: true,
      hasPlaceholders: false,
    };

    try {
      const first = await translate(request);
      expect(first.text).toBe('<<<1>>>\n你好世界');
      expect(fetchCalls).toBe(1);

      const second = await translate(request);
      expect(second.text).toBe('<<<1>>>\n你好世界');
      expect(second.providerId).toBe('cache');
      // 关键断言：第二次必须命中第一次写入的条目，不得再计费一次
      expect(fetchCalls).toBe(1);
      // 聚合写入是逐段入库：一段文本 → 一条缓存
      expect(store.size).toBe(1);
    } finally {
      getSpy.mockRestore();
      setSpy.mockRestore();
      settingsSpy.mockRestore();
    }
  });

  test('同一段落单独翻译与进入聚合批次可共享缓存（批次组成不影响 key）', async () => {
    // 缺陷形态：hasPlaceholders 是批次级开关。含占位符的批次与纯文本批次的
    // 盐值不同，导致同一段纯文本随批次组成变化而反复 miss。
    const seenSalts: string[] = [];
    const getSpy = spyOn(cache, 'getCachedTranslation').mockImplementation(
      async (_text: string, _lang: string, salt = '') => {
        seenSalts.push(salt);
        return null;
      }
    );
    const setSpy = spyOn(cache, 'setCachedTranslation').mockImplementation(async () => {});
    const settingsSpy = spyOn(storage, 'getSettings').mockResolvedValue(settings() as never);
    globalThis.fetch = (async () => jsonResponse('译文')) as typeof fetch;

    try {
      await translate({
        text: '<<<1>>>\n<s0>Hello</s0>\n<<<2>>>\nplain sentence',
        targetLang: 'zh-CN',
        isAggregate: true,
        hasPlaceholders: true,
      });
      await translate({
        text: '<<<1>>>\nplain sentence\n<<<2>>>\nanother plain',
        targetLang: 'zh-CN',
        isAggregate: true,
        hasPlaceholders: false,
      });

      expect(seenSalts).toHaveLength(2);
      expect(seenSalts[0]).toBe(seenSalts[1]);
    } finally {
      getSpy.mockRestore();
      setSpy.mockRestore();
      settingsSpy.mockRestore();
    }
  });
});
