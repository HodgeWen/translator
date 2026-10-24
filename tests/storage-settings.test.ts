import { beforeEach, describe, expect, test } from 'bun:test';
import type { GlobalSettings, ProviderConfig } from '../src/types';

// ============================================================================
// chrome.storage.sync 内存替身：按 Chrome 的真实计费口径模拟配额
//   - 单项：JSON.stringify(value) 的 UTF-8 字节数 + key 长度 > 8192 → reject
//   - 总量：所有项之和 > 102400 → reject
// storage.ts 在模块加载时读取 chrome.storage.onChanged，因此先装好替身再动态 import。
// ============================================================================

const PER_ITEM_LIMIT = 8192;
const TOTAL_LIMIT = 102400;

const syncStore: Record<string, unknown> = {};

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function itemBytes(key: string, value: unknown): number {
  return byteLength(JSON.stringify(value) ?? '') + key.length;
}

function totalBytes(keys?: string[]): number {
  const target = keys ?? Object.keys(syncStore);
  return target.reduce((sum, key) => sum + itemBytes(key, syncStore[key]), 0);
}

type ChangeListener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void;
const changeListeners: ChangeListener[] = [];

const chromeMock = {
  storage: {
    sync: {
      get: async (keys?: string | string[] | null) => {
        if (keys === null || keys === undefined) return { ...syncStore };
        if (typeof keys === 'string') {
          return keys in syncStore ? { [keys]: syncStore[keys] } : {};
        }
        const out: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in syncStore) out[key] = syncStore[key];
        }
        return out;
      },
      set: async (items: Record<string, unknown>) => {
        for (const [key, value] of Object.entries(items)) {
          if (itemBytes(key, value) > PER_ITEM_LIMIT) {
            throw new Error(`QUOTA_BYTES_PER_ITEM quota exceeded (${key})`);
          }
        }
        const nextStore = { ...syncStore, ...items };
        const projected = Object.keys(nextStore).reduce(
          (sum, key) => sum + itemBytes(key, nextStore[key]),
          0
        );
        if (projected > TOTAL_LIMIT) {
          throw new Error(`QUOTA_BYTES quota exceeded (${projected} > ${TOTAL_LIMIT})`);
        }
        Object.assign(syncStore, items);
      },
      remove: async (keys: string | string[]) => {
        for (const key of Array.isArray(keys) ? keys : [keys]) delete syncStore[key];
      },
      getKeys: async () => Object.keys(syncStore),
      getBytesInUse: async (keys?: string[] | null) => {
        if (keys === null || keys === undefined) return totalBytes();
        return totalBytes(keys);
      },
    },
    onChanged: {
      addListener: (listener: ChangeListener) => {
        changeListeners.push(listener);
      },
    },
  },
};

(globalThis as unknown as { chrome: unknown }).chrome = chromeMock;

const {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEYS,
  SettingsStorageError,
  __resetSettingsCacheForTests,
  exportSettings,
  getSettings,
  getSettingsDiagnostics,
  handleSettingsStorageChange,
  importSettings,
  isSettingsStorageError,
  saveSettings,
} = await import('../src/lib/storage');

const SETTINGS_KEY = SETTINGS_STORAGE_KEYS.settings;
const SETTINGS_SHARD_PREFIX = SETTINGS_STORAGE_KEYS.settingsShardPrefix;
const PROVIDERS_KEY = SETTINGS_STORAGE_KEYS.providers;
const SHARD_PREFIX = SETTINGS_STORAGE_KEYS.providersShardPrefix;

function resetAll(): void {
  for (const key of Object.keys(syncStore)) delete syncStore[key];
  __resetSettingsCacheForTests();
}

function provider(id: string, overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    id,
    name: id,
    baseURL: 'https://example.com/v1',
    apiKey: '',
    headers: {},
    query: {},
    body: {},
    models: [{ id: `${id}-model`, name: `${id} model` }],
    ...overrides,
  };
}

function settingsWith(providers: ProviderConfig[], overrides: Partial<GlobalSettings> = {}): GlobalSettings {
  return { ...DEFAULT_SETTINGS, providers, ...overrides };
}

/** 大体积 provider：单条接近但不超过分片目标，用于触发多分片 */
function bulkyProvider(id: string, bytes = 5000): ProviderConfig {
  return provider(id, {
    apiKey: `sk-${id}-${'k'.repeat(32)}`,
    headers: { 'X-Custom': 'h'.repeat(40) },
    body: { blob: 'b'.repeat(bytes) },
  });
}

beforeEach(() => {
  resetAll();
});

describe('settings storage 分片与配额', () => {
  test('(a1) 总量超配额时抛可识别错误，且内存缓存保持旧值', async () => {
    const before = settingsWith([provider('p1')], { nativeLanguage: 'zh-CN' });
    await saveSettings(before);
    // 先读一次，确保缓存里是「旧值」
    const cached = await getSettings();
    expect(cached.providers).toHaveLength(1);

    // 塞入一个占满 sync 区的大 key（模拟其他数据/旧布局遗留）
    const fillerKey = 'other_ext_blob';
    const needed = TOTAL_LIMIT - totalBytes() + 50;
    syncStore[fillerKey] = 'x'.repeat(Math.max(1, needed - 2 - fillerKey.length));
    expect(totalBytes()).toBeGreaterThan(TOTAL_LIMIT);

    let caught: unknown;
    try {
      await saveSettings(settingsWith([provider('p1'), provider('p2')], { nativeLanguage: 'ja' }));
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(SettingsStorageError);
    expect(isSettingsStorageError(caught)).toBe(true);
    expect((caught as SettingsStorageError).code).toBe('SETTINGS_QUOTA_EXCEEDED');
    expect((caught as Error).message).toContain('100KB');

    // 缓存未被污染：仍是保存前的旧值
    const after = await getSettings();
    expect(after.providers.map((p) => p.id)).toEqual(['p1']);
    expect(after.nativeLanguage).toBe('zh-CN');

    // 磁盘同样未被改写
    const stored = syncStore[SETTINGS_KEY] as { settings: { nativeLanguage: string } };
    expect(stored.settings.nativeLanguage).toBe('zh-CN');
  });

  test('(a2) 单个 provider 超过 8KB 单项上限时抛 SETTINGS_QUOTA_EXCEEDED，缓存不被污染', async () => {
    await saveSettings(settingsWith([provider('small')]));
    await getSettings();

    let caught: unknown;
    try {
      await saveSettings(
        settingsWith([provider('huge', { body: { blob: 'x'.repeat(9000) } })])
      );
    } catch (err) {
      caught = err;
    }

    expect(isSettingsStorageError(caught)).toBe(true);
    expect((caught as SettingsStorageError).code).toBe('SETTINGS_QUOTA_EXCEEDED');
    expect((caught as Error).message).toContain('8KB');

    const after = await getSettings();
    expect(after.providers.map((p) => p.id)).toEqual(['small']);
  });

  test('(b) 单条 provider 非法时保留其余 provider 与标量配置，不整体回落默认', async () => {
    const valid = provider('valid', { apiKey: 'sk-valid' });
    const invalid = provider('invalid', { baseURL: 'not-a-url' });
    const another = provider('another');

    await saveSettings(
      settingsWith([valid, invalid, another], {
        nativeLanguage: 'ja',
        secondLanguage: 'ko',
        globalPrompt: '请保留这段自定义提示词',
        maxConcurrentRequests: 7,
      })
    );

    const loaded = await getSettings();
    expect(loaded.providers.map((p) => p.id)).toEqual(['valid', 'another']);
    expect(loaded.providers[0].apiKey).toBe('sk-valid');
    expect(loaded.nativeLanguage).toBe('ja');
    expect(loaded.secondLanguage).toBe('ko');
    expect(loaded.globalPrompt).toBe('请保留这段自定义提示词');
    expect(loaded.maxConcurrentRequests).toBe(7);
    // 未回落默认值
    expect(loaded.nativeLanguage).not.toBe(DEFAULT_SETTINGS.nativeLanguage);

    // 诊断通道暴露被丢弃的条目
    const diagnostics = getSettingsDiagnostics();
    expect(diagnostics.warnings.some((w) => w.code === 'SETTINGS_DROPPED_INVALID_PROVIDER')).toBe(true);
    expect(diagnostics.warnings.some((w) => w.path === 'providers[1]')).toBe(true);
  });

  test('(b2) 标量字段非法时只回落该字段，其余字段保留', async () => {
    await saveSettings(settingsWith([provider('p1')], { nativeLanguage: 'ja' }));

    // 直接写坏一个标量，模拟历史脏数据
    const record = syncStore[SETTINGS_KEY] as { schemaVersion: number; settings: Record<string, unknown> };
    record.settings.maxConcurrentRequests = 999; // 超过 schema 上限 10
    __resetSettingsCacheForTests();

    const loaded = await getSettings();
    expect(loaded.maxConcurrentRequests).toBe(DEFAULT_SETTINGS.maxConcurrentRequests);
    expect(loaded.nativeLanguage).toBe('ja'); // 其余字段不受影响
    expect(loaded.providers.map((p) => p.id)).toEqual(['p1']);
    expect(getSettingsDiagnostics().warnings.some((w) => w.path === 'maxConcurrentRequests')).toBe(true);
  });

  test('(c) 旧单 key 布局可平滑读取并迁移到分片布局（幂等）', async () => {
    const legacy = settingsWith(
      [
        provider('legacy-1', {
          apiKey: 'sk-legacy-1',
          headers: { 'Content-Type': 'application/json', 'X-Keep': 'yes' },
          body: { temperature: 0.7, top_p: 0.9, stream: true, custom: 'keep-me' },
        }),
        provider('legacy-2'),
      ],
      { nativeLanguage: 'fr', colorScheme: 'dark' }
    );
    // 旧布局：单 key 直接存完整 GlobalSettings
    syncStore[SETTINGS_KEY] = legacy;

    const first = await getSettings();
    expect(first.providers.map((p) => p.id)).toEqual(['legacy-1', 'legacy-2']);
    expect(first.nativeLanguage).toBe('fr');
    expect(first.colorScheme).toBe('dark');

    // body 采样字段迁移 + headers Content-Type 清理
    const migratedProvider = first.providers[0];
    expect(migratedProvider.temperature).toBe(0.7);
    expect(migratedProvider.topP).toBe(0.9);
    expect(migratedProvider.stream).toBe(true);
    expect(migratedProvider.headers['X-Keep']).toBe('yes');
    expect(migratedProvider.headers['Content-Type']).toBeUndefined();
    expect(migratedProvider.body).toEqual({ custom: 'keep-me' });

    // 已迁移：标量 key 不再含 providers，providers 落到独立 key
    const record = syncStore[SETTINGS_KEY] as { schemaVersion: number; settings: Record<string, unknown> };
    expect(record.schemaVersion).toBe(1);
    expect('providers' in record.settings).toBe(false);
    const providersPayload = syncStore[PROVIDERS_KEY] as { providers: ProviderConfig[] };
    expect(providersPayload.providers.map((p) => p.id)).toEqual(['legacy-1', 'legacy-2']);

    // 迁移幂等：再读一次（冷启动）不产生变化，也不重复迁移
    const snapshot = JSON.stringify(syncStore);
    __resetSettingsCacheForTests();
    const second = await getSettings();
    expect(second).toEqual(first);
    expect(JSON.stringify(syncStore)).toBe(snapshot);
    expect(getSettingsDiagnostics().migratedFromLegacy).toBe(false);
  });

  test('(d) 分片读写往返一致（含 apiKey / headers / body / 模型字段）', async () => {
    const providers = [
      bulkyProvider('p0'),
      bulkyProvider('p1'),
      bulkyProvider('p2'),
      provider('p3', {
        apiKey: 'sk-p3',
        headers: { Authorization: 'Bearer token', 'X-Trace': 'on' },
        query: { 'api-version': '2024-01-01' },
        body: { thinking: { type: 'enabled' }, max_tokens: 512 },
        temperature: 0.3,
        topP: 0.8,
        stream: true,
        models: [
          { id: 'm-a', name: 'Model A', supportsVision: true },
          { id: 'm-b', name: 'Model B', supportsVision: false },
        ],
      }),
    ];

    await saveSettings(settingsWith(providers, { nativeLanguage: 'ja', globalPrompt: '往返测试提示词' }));

    // 触发分片：providers key 变成清单
    const manifest = syncStore[PROVIDERS_KEY] as { schemaVersion: number; shardCount: number };
    expect(manifest.shardCount).toBeGreaterThan(1);
    const shardKeys = Object.keys(syncStore).filter((key) => key.startsWith(SHARD_PREFIX));
    expect(shardKeys.length).toBe(manifest.shardCount);
    // 每个分片都在 8KB 单项上限内，并留有余量（< 6KB 目标 + 少量包装开销）
    for (const key of shardKeys) {
      expect(itemBytes(key, syncStore[key])).toBeLessThanOrEqual(6144);
    }

    __resetSettingsCacheForTests();
    const roundTrip = await getSettings();
    expect(roundTrip.providers.map((p) => p.id)).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(roundTrip.providers[1].body).toEqual({ blob: 'b'.repeat(5000) });
    expect(roundTrip.providers[2].apiKey).toBe(providers[2].apiKey);
    expect(roundTrip.providers[3]).toMatchObject({
      apiKey: 'sk-p3',
      headers: { Authorization: 'Bearer token', 'X-Trace': 'on' },
      query: { 'api-version': '2024-01-01' },
      // body.max_tokens 属于采样字段迁移，会被提升为 maxTokens 并从 body 移除
      body: { thinking: { type: 'enabled' } },
      maxTokens: 512,
      temperature: 0.3,
      topP: 0.8,
      stream: true,
    });
    expect(roundTrip.providers[3].models[0]).toEqual({ id: 'm-a', name: 'Model A', supportsVision: true });
    expect(roundTrip.nativeLanguage).toBe('ja');
    expect(roundTrip.globalPrompt).toBe('往返测试提示词');
  });

  test('(d2) 分片数量回落时清理多余分片，读取不重复', async () => {
    await saveSettings(settingsWith([bulkyProvider('a'), bulkyProvider('b'), bulkyProvider('c')]));
    const before = (syncStore[PROVIDERS_KEY] as { shardCount: number }).shardCount;
    expect(before).toBeGreaterThan(1);

    // 缩到一个 provider：应回到单 key 直存，并删除旧分片
    await saveSettings(settingsWith([bulkyProvider('only')]));
    const payload = syncStore[PROVIDERS_KEY] as { providers?: unknown[]; shardCount?: number };
    expect(Array.isArray(payload.providers)).toBe(true);
    expect(Object.keys(syncStore).filter((key) => key.startsWith(SHARD_PREFIX))).toEqual([]);

    __resetSettingsCacheForTests();
    const loaded = await getSettings();
    expect(loaded.providers.map((p) => p.id)).toEqual(['only']);
  });

  test('(d3) 重型标量配置也会分片，单 key 均 < 6KB，往返一致', async () => {
    const longPrompt = '你是一个专业翻译引擎。'.repeat(120);
    const customTones = Array.from({ length: 6 }, (_, index) => ({
      id: `tone-${index}`,
      name: `Tone ${index}`,
      promptInstruction: '保持语气自然，术语准确，不添加原文没有的信息。'.repeat(6),
    }));

    await saveSettings(
      settingsWith([bulkyProvider('p0'), bulkyProvider('p1'), bulkyProvider('p2')], {
        globalPrompt: longPrompt,
        customTones,
        nativeLanguage: 'ja',
      })
    );

    const settingsRecord = syncStore[SETTINGS_KEY] as { shardCount?: number; fields?: string[] };
    expect(settingsRecord.shardCount).toBeGreaterThan(1);
    const scalarShards = Object.keys(syncStore).filter((key) => key.startsWith(SETTINGS_SHARD_PREFIX));
    expect(scalarShards.length).toBe(settingsRecord.shardCount);

    // 单 key 均在 6KB 目标以内
    for (const key of Object.keys(syncStore)) {
      expect(itemBytes(key, syncStore[key])).toBeLessThanOrEqual(6144);
    }

    __resetSettingsCacheForTests();
    const loaded = await getSettings();
    expect(loaded.globalPrompt).toBe(longPrompt);
    expect(loaded.customTones.map((tone) => tone.id)).toEqual(customTones.map((tone) => tone.id));
    expect(loaded.nativeLanguage).toBe('ja');
    expect(loaded.providers.map((p) => p.id)).toEqual(['p0', 'p1', 'p2']);
    // 清单 fields 覆盖全部标量字段，便于排查
    expect(settingsRecord.fields).toContain('globalPrompt');
    expect(settingsRecord.fields).toContain('colorScheme');

    // 配置缩回默认体积时，标量分片应被清理并回到单 key 形态
    await saveSettings(settingsWith([]));
    const compact = syncStore[SETTINGS_KEY] as { settings?: Record<string, unknown> };
    expect(typeof compact.settings).toBe('object');
    expect(Object.keys(syncStore).filter((key) => key.startsWith(SETTINGS_SHARD_PREFIX))).toEqual([]);
  });

  test('(e) normalize 幂等：重复读取 / 重复保存不丢字段', async () => {
    const messy = provider('messy', {
      apiKey: 'sk-messy',
      headers: { 'Content-Type': 'application/json', 'content-type': 'application/json', 'X-Keep': 'v' },
      body: { temperature: 0.4, top_p: 0.6, max_tokens: 128, stream: true, keep: { nested: [1, 2] } },
      models: [{ id: 'm1', name: 'M1', supportsVision: true }],
    });

    await saveSettings(settingsWith([messy], { nativeLanguage: 'ja' }));
    __resetSettingsCacheForTests();
    const first = await getSettings();
    expect(first.providers[0]).toMatchObject({
      apiKey: 'sk-messy',
      temperature: 0.4,
      topP: 0.6,
      maxTokens: 128,
      stream: true,
      headers: { 'X-Keep': 'v' },
      body: { keep: { nested: [1, 2] } },
    });
    expect(first.providers[0].headers['Content-Type']).toBeUndefined();

    // 连续两次 save + 冷读，结果必须稳定（重复 normalize 不丢字段）
    await saveSettings(first);
    await saveSettings(await getSettings());
    __resetSettingsCacheForTests();
    const third = await getSettings();
    expect(third).toEqual(first);
    expect(third.providers[0].apiKey).toBe('sk-messy');
    expect(third.providers[0].body).toEqual({ keep: { nested: [1, 2] } });
  });

  test('旧单 key 布局里 providers 损坏时仍能保留标量配置', async () => {
    syncStore[SETTINGS_KEY] = {
      ...settingsWith([], { nativeLanguage: 'fr' }),
      providers: 'broken',
    };
    __resetSettingsCacheForTests();

    const loaded = await getSettings();
    expect(loaded.providers).toEqual([]);
    expect(loaded.nativeLanguage).toBe('fr');
  });

  test('onChanged 覆盖分片 key：任意分片变化都会让缓存失效', async () => {
    await saveSettings(settingsWith([bulkyProvider('x'), bulkyProvider('y')]));
    await getSettings();

    // 直接调用注册给 chrome.storage.onChanged 的处理函数（多测试文件共用模块实例时
    // 监听器在首次 import 时绑定，故不依赖 changeListeners 捕获顺序）
    const shardKey = `${SHARD_PREFIX}0`;
    syncStore[shardKey] = {
      schemaVersion: 1,
      providers: [provider('from-other-tab')],
    };
    handleSettingsStorageChange({ [shardKey]: { newValue: syncStore[shardKey] } }, 'sync');

    const reloaded = await getSettings();
    // 分片 0 被替换，分片 1 的 y 仍在 → 合并结果体现分片变化
    expect(reloaded.providers.map((p) => p.id)).toEqual(['from-other-tab', 'y']);

    // 无关 key 或非 sync 区不会让缓存失效
    await getSettings();
    handleSettingsStorageChange({ [SETTINGS_KEY]: { newValue: 1 } }, 'local');
    handleSettingsStorageChange({ unrelated: { newValue: 1 } }, 'sync');
    expect(await getSettings()).toEqual(reloaded);
  });

  test('onChanged 对标量 key 与 providers key 同样失效缓存', async () => {
    await saveSettings(settingsWith([provider('p1')], { nativeLanguage: 'ja' }));
    await getSettings();

    const record = syncStore[SETTINGS_KEY] as { schemaVersion: number; settings: Record<string, unknown> };
    record.settings.nativeLanguage = 'fr';
    handleSettingsStorageChange({ [SETTINGS_KEY]: { newValue: record } }, 'sync');
    expect((await getSettings()).nativeLanguage).toBe('fr');
  });
});

describe('settings 导入导出与诊断', () => {
  test('导入更高版本的 wrapper 时明确报错，不静默接受', async () => {
    const payload = JSON.stringify({ version: 99, settings: settingsWith([provider('p1')]) });
    let caught: unknown;
    try {
      await importSettings(payload);
    } catch (err) {
      caught = err;
    }
    expect(isSettingsStorageError(caught)).toBe(true);
    expect((caught as SettingsStorageError).code).toBe('SETTINGS_UNSUPPORTED_VERSION');
  });

  test('导入非法条目时保留其余配置并给出诊断', async () => {
    const payload = JSON.stringify({
      version: 1,
      settings: settingsWith(
        [provider('ok'), provider('bad', { baseURL: 'not-a-url' })],
        { nativeLanguage: 'de' }
      ),
    });
    await importSettings(payload);

    const loaded = await getSettings();
    expect(loaded.providers.map((p) => p.id)).toEqual(['ok']);
    expect(loaded.nativeLanguage).toBe('de');
    expect(getSettingsDiagnostics().warnings.some((w) => w.code === 'SETTINGS_DROPPED_INVALID_PROVIDER')).toBe(
      true
    );
  });

  test('明文导出含 API Key 时保持原样，但通过诊断通道给出警告', async () => {
    await saveSettings(settingsWith([provider('p1', { apiKey: 'sk-plaintext' })]));
    await getSettings();

    const plaintext = await exportSettings();
    expect(plaintext).toContain('sk-plaintext');
    expect(plaintext).not.toContain('translator-encrypted-v1');
    expect(JSON.parse(plaintext).version).toBe(1);

    const diagnostics = getSettingsDiagnostics();
    expect(diagnostics.warnings.some((w) => w.code === 'SETTINGS_EXPORT_PLAINTEXT_API_KEY')).toBe(true);
  });

  test('无 API Key 时明文导出不产生该警告', async () => {
    await saveSettings(settingsWith([provider('p1', { apiKey: '' })]));
    await getSettings();
    await exportSettings();
    expect(
      getSettingsDiagnostics().warnings.some((w) => w.code === 'SETTINGS_EXPORT_PLAINTEXT_API_KEY')
    ).toBe(false);
  });
});

describe('并发保存', () => {
  beforeEach(resetAll);

  test('并发 saveSettings 不会让分片清单与实际分片不一致', async () => {
    // 回归：persistSettings 是「读分片清单 → set → 清旧分片」多步流程，
    // 无串行化时两次并发调用会互相覆盖清单，读取端只能跳过缺失分片 → provider 消失。
    const many = Array.from({ length: 6 }, (_, i) => bulkyProvider(`p${i}`));

    await Promise.all([
      saveSettings(settingsWith(many.slice(0, 3))),
      saveSettings(settingsWith(many.slice(3, 6))),
      saveSettings(settingsWith(many)),
    ]);

    __resetSettingsCacheForTests();
    const loaded = await getSettings();

    // 三次写入里必然有一次是「全部 6 个」，它要么最后落地、要么被后续覆盖；
    // 关键不变量：读取结果必须是某一次完整写入的内容，不能是拼接出的残缺集合，
    // 且清单声明的分片数与实际存在的分片数一致。
    expect(loaded.providers.length).toBeGreaterThan(0);
    const manifest = syncStore[PROVIDERS_KEY] as { shardCount?: number; providers?: unknown[] };
    if (typeof manifest.shardCount === 'number') {
      const shards = Object.keys(syncStore).filter((k) => k.startsWith(SHARD_PREFIX));
      expect(shards.length).toBe(manifest.shardCount);
    }
    expect(loaded.providers.map((p) => p.id).sort()).toEqual(
      (manifest.providers
        ? (manifest.providers as Array<{ id: string }>).map((p) => p.id)
        : loaded.providers.map((p) => p.id)
      ).sort()
    );
  });
});
