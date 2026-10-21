import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildVisionQueue } from '../src/lib/api/queue-builder';
import { globalSettingsSchema } from '../src/lib/schema';
import {
  DEFAULT_SETTINGS,
  exportSettings,
  getSettings,
  importSettings,
  saveSettings,
} from '../src/lib/storage';
import type { GlobalSettings, PoolService, ProviderConfig, SingleService, TranslationService } from '../src/types';

// storage.ts 在扩展环境运行，测试里用内存版 chrome.storage.sync 替代
const syncStore: Record<string, unknown> = {};
(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: {
    sync: {
      get: async (key: string) => ({ [key]: syncStore[key] }),
      set: async (items: Record<string, unknown>) => {
        Object.assign(syncStore, items);
      },
    },
    onChanged: { addListener: () => {} },
  },
};

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

function settingsWith(providers: ProviderConfig[], services: TranslationService[]): GlobalSettings {
  return { ...DEFAULT_SETTINGS, providers, services, selectedServiceId: services[0]?.id ?? '' };
}

function singleService(id: string, providerId: string, modelId: string, fallbackEnabled: boolean): SingleService {
  return {
    id,
    name: id,
    type: 'single',
    providerId,
    modelId,
    fallbackEnabled,
    defaultDisplayStyle: 'personal_default',
    defaultTranslationTone: 'personal_default',
  };
}

function poolService(
  id: string,
  poolProviders: PoolService['poolProviders']
): PoolService {
  return {
    id,
    name: id,
    type: 'pool',
    poolProviders,
    defaultDisplayStyle: 'personal_default',
    defaultTranslationTone: 'personal_default',
  };
}

function modelIds(queue: ReturnType<typeof buildVisionQueue>): string[] {
  return queue.map(({ model }) => model.id);
}

describe('vision queue', () => {
  test('keeps single-service order and skips models without the vision flag', () => {
    const p1 = provider('p1', [
      { id: 'vision-main', name: 'Main', supportsVision: true },
      { id: 'text-only', name: 'Text only' },
      { id: 'vision-fallback', name: 'Fallback', supportsVision: true },
    ]);
    const service = singleService('single-order', 'p1', 'vision-main', true);

    const queue = buildVisionQueue(settingsWith([p1], [service]), service);

    expect(modelIds(queue)).toEqual(['vision-main', 'vision-fallback']);
    expect(queue.every(({ model }) => model.supportsVision === true)).toBe(true);
  });

  test('falls back to same-provider vision models when the main model cannot see images', () => {
    const p1 = provider('p1', [
      { id: 'text-main', name: 'Main' },
      { id: 'vision-fallback', name: 'Fallback', supportsVision: true },
    ]);
    const service = singleService('single-fallback', 'p1', 'text-main', true);

    expect(modelIds(buildVisionQueue(settingsWith([p1], [service]), service))).toEqual(['vision-fallback']);
  });

  test('returns no model when fallback is disabled and the main model cannot see images', () => {
    const p1 = provider('p1', [
      { id: 'text-main', name: 'Main' },
      { id: 'vision-fallback', name: 'Fallback', supportsVision: true },
    ]);
    const service = singleService('single-no-fallback', 'p1', 'text-main', false);

    expect(buildVisionQueue(settingsWith([p1], [service]), service)).toEqual([]);
  });

  test('keeps pool member order with the picked member first', () => {
    const pA = provider('pA', [
      { id: 'mA1', name: 'A1', supportsVision: true },
      { id: 'mA2', name: 'A2', supportsVision: true },
      { id: 'mA3', name: 'A3' },
    ]);
    const pB = provider('pB', [
      { id: 'mB1', name: 'B1' },
      { id: 'mB2', name: 'B2', supportsVision: true },
    ]);
    const pC = provider('pC', [{ id: 'mC1', name: 'C1', supportsVision: true }]);
    const service = poolService('pool-order', [
      { providerId: 'pA', modelId: 'mA2', weight: 1 },
      { providerId: 'pB', weight: 1 },
      { providerId: 'pC', modelId: 'mC1', weight: 1 },
    ]);

    const queue = buildVisionQueue(settingsWith([pA, pB, pC], [service]), service);

    expect(modelIds(queue)).toEqual(['mA2', 'mA1', 'mB2', 'mC1']);
    expect(queue.map(({ provider: p, model }) => `${p.id}:${model.id}`)).toEqual([
      'pA:mA2',
      'pA:mA1',
      'pB:mB2',
      'pC:mC1',
    ]);
  });

  test('returns an empty queue when no model has the vision flag', () => {
    const p1 = provider('p1', [{ id: 'm1', name: 'M1' }]);
    const p2 = provider('p2', [{ id: 'm2', name: 'M2', supportsVision: false }]);
    const single = singleService('single-none', 'p1', 'm1', true);
    const pool = poolService('pool-none', [
      { providerId: 'p1', weight: 1 },
      { providerId: 'p2', weight: 1 },
    ]);

    expect(buildVisionQueue(settingsWith([p1, p2], [single]), single)).toEqual([]);
    expect(buildVisionQueue(settingsWith([p1, p2], [pool]), pool)).toEqual([]);
  });

  test('deduplicates repeated provider/model pairs', () => {
    const p1 = provider('p1', [
      { id: 'm1', name: 'M1', supportsVision: true },
      { id: 'm1', name: 'M1 duplicate', supportsVision: true },
      { id: 'm2', name: 'M2', supportsVision: true },
    ]);
    const service = singleService('single-dedupe', 'p1', 'm1', true);

    expect(modelIds(buildVisionQueue(settingsWith([p1], [service]), service))).toEqual(['m1', 'm2']);
  });
});

describe('image capability settings', () => {
  const legacyProvider = {
    id: 'legacy',
    name: 'Legacy',
    baseURL: 'https://example.com/v1',
    apiKey: '',
    headers: {},
    query: {},
    body: {},
    models: [{ id: 'm1', name: 'M1' }],
  };

  test('defaults supportsVision to false for legacy provider models', () => {
    const parsed = globalSettingsSchema.parse({ ...DEFAULT_SETTINGS, providers: [legacyProvider] });

    expect(parsed.providers[0].models[0].supportsVision).toBe(false);
  });

  test('keeps supportsVision when enabled and exports it in the settings JSON', () => {
    const withVision = {
      ...legacyProvider,
      models: [{ id: 'm1', name: 'M1', supportsVision: true }],
    };
    const parsed = globalSettingsSchema.parse({ ...DEFAULT_SETTINGS, providers: [withVision] });

    expect(parsed.providers[0].models[0].supportsVision).toBe(true);
    expect(JSON.stringify(parsed)).toContain('"supportsVision":true');
  });

  test('drops the removed imageHoverButtonEnabled key from legacy settings', () => {
    const legacySettings: Record<string, unknown> = {
      ...DEFAULT_SETTINGS,
      imageHoverButtonEnabled: true,
    };

    const parsed = globalSettingsSchema.parse(legacySettings);

    expect('imageHoverButtonEnabled' in parsed).toBe(false);
  });
});

describe('settings persistence', () => {
  test('imports legacy settings and keeps supportsVision after save/export/import', async () => {
    const legacySettings: Record<string, unknown> = {
      ...DEFAULT_SETTINGS,
      providers: [provider('legacy', [{ id: 'm1', name: 'M1' }])],
      imageHoverButtonEnabled: true,
    };

    await importSettings(JSON.stringify({ version: 1, settings: legacySettings }));

    const migrated = await getSettings();
    expect(migrated.providers[0].models[0].supportsVision).toBe(false);
    expect('imageHoverButtonEnabled' in migrated).toBe(false);

    const enabled: GlobalSettings = {
      ...migrated,
      providers: migrated.providers.map((p) => ({
        ...p,
        models: p.models.map((model) => ({ ...model, supportsVision: true })),
      })),
    };
    await saveSettings(enabled);

    const exported = await exportSettings();
    expect(exported).toContain('"supportsVision": true');
    expect(exported).not.toContain('imageHoverButtonEnabled');

    await importSettings(exported);

    const reloaded = await getSettings();
    expect(reloaded.providers[0].models[0].supportsVision).toBe(true);
  });
});

describe('image translation locales', () => {
  const localesRoot = join(import.meta.dir, '..', 'public', '_locales');

  function readMessages(lang: string): Record<string, { message: string }> {
    return JSON.parse(readFileSync(join(localesRoot, lang, 'messages.json'), 'utf8')) as Record<
      string,
      { message: string }
    >;
  }

  test('keeps zh_CN and en key sets identical', () => {
    expect(Object.keys(readMessages('zh_CN')).sort()).toEqual(Object.keys(readMessages('en')).sort());
  });

  test('covers the image translation copy used by the popup flow', () => {
    const requiredKeys = [
      'label_supports_vision',
      'hint_supports_vision',
      'error_image_translate_no_vision_model',
      'error_image_translate_recognize_failed',
      'error_image_translate_vision_timeout',
      'error_image_translate_model_unsupported',
      'error_image_translate_http_error',
      'error_image_invalid_format',
      'error_image_too_large',
      'error_image_load_failed',
      'error_image_no_text',
      'popup_image_translate',
      'popup_image_remove',
    ];

    const removedKeys = [
      'menu_translate_image',
      'image_hover_button_text',
      'image_hover_button_title',
      'label_image_hover_button',
      'hint_image_hover_button',
      'image_toolbar_original',
      'image_toolbar_translation',
      'image_toolbar_close',
      'popup_image_select_file',
      'popup_image_drop_hint',
      'popup_image_file_types',
      'popup_image_replace',
    ];

    for (const lang of ['zh_CN', 'en']) {
      const keys = new Set(Object.keys(readMessages(lang)));
      expect(requiredKeys.filter((key) => !keys.has(key))).toEqual([]);
      expect(removedKeys.filter((key) => keys.has(key))).toEqual([]);
    }
  });
});
