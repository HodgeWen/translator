import type { GlobalSettings } from '@/types';
import { globalSettingsSchema, type ValidatedSettings } from './schema';


type ValidatedProvider = ValidatedSettings['providers'][number];
import { DEFAULT_GLOBAL_PROMPT } from './prompts';
import { encryptJSON, decryptJSON, isEncryptedPayload, ENCRYPTED_FORMAT } from './crypto';

const SETTINGS_KEY = 'translator_settings_v1';

let settingsCache: ValidatedSettings | null = null;

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[SETTINGS_KEY]) {
      settingsCache = null;
    }
  });
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  providers: [
    {
      id: 'default-openai',
      name: 'OpenAI Compatible',
      baseURL: 'https://api.openai.com/v1/chat/completions',
      apiKey: '',
      headers: {},
      query: {},
      body: {},
      temperature: 0.3,
      stream: false,
      models: [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      ],
    },
  ],
  selectedProviderId: 'default-openai',
  selectedModelId: 'gpt-4o',
  loadBalance: { enabled: false, providers: [] },
  nativeLanguage: 'zh-CN',
  defaultSourceLanguage: 'en',
  uiLanguage: 'zh-CN',
  displayStyle: 'original',
  translationTone: 'normal',
  globalPrompt: DEFAULT_GLOBAL_PROMPT,
  detectLangProviders: [
    { id: 'franc', name: 'franc-min', type: 'franc' },
  ],
  shortcutKey: 'Alt+W',
  hoverShortcutKey: 'Control',
  inputShortcutKey: 'Control',
  inputDefaultSourceLanguage: '',
  inputLoadingPulseKeyframes: ['#4b5563', '#2563eb', '#0f172a'],
  inputLoadingPulseDurationMs: 1200,
  inputLoadingPulseEasing: 'ease-out',
  aggregateEnabled: true,
  maxParagraphsPerRequest: 5,
  maxTextLengthPerRequest: 2000,
  maxConcurrentRequests: 3,
  requestTimeout: 30000,
};

// 旧版 provider 的 body.* 采样字段一次性平滑迁移到独立字段（幂等）。
// 同时清理 headers 中冗余的默认 Content-Type（请求层会自动注入）。

const MIGRATIONS: { key: keyof ValidatedProvider; bodyKey: string; type: 'number' | 'boolean' }[] = [
  { key: 'temperature', bodyKey: 'temperature', type: 'number' },
  { key: 'topP', bodyKey: 'top_p', type: 'number' },
  { key: 'maxTokens', bodyKey: 'max_tokens', type: 'number' },
  { key: 'stream', bodyKey: 'stream', type: 'boolean' },
];

function normalizeProvider(provider: ValidatedProvider): ValidatedProvider {
  const body = { ...provider.body };
  const headers = { ...provider.headers };

  for (const headerKey of Object.keys(headers)) {
    const val = headers[headerKey];
    if (
      headerKey.toLowerCase() === 'content-type' &&
      typeof val === 'string' &&
      val.toLowerCase() === 'application/json'
    ) {
      delete headers[headerKey];
    }
  }

  const migrated: Partial<Pick<ValidatedProvider, 'temperature' | 'topP' | 'maxTokens' | 'stream'>> = {};
  for (const { key, bodyKey, type } of MIGRATIONS) {
    if (provider[key] === undefined && typeof (body as Record<string, unknown>)[bodyKey] === type) {
      (migrated as Record<string, unknown>)[key] = (body as Record<string, unknown>)[bodyKey];
    }
    if (typeof (body as Record<string, unknown>)[bodyKey] === type) {
      delete (body as Record<string, unknown>)[bodyKey];
    }
  }

  return {
    ...provider,
    headers,
    body,
    ...migrated,
    stream: (migrated.stream ?? provider.stream ?? false) as boolean,
  };
}

function normalizeSettings(settings: ValidatedSettings): ValidatedSettings {
  return {
    ...settings,
    providers: settings.providers.map(normalizeProvider),
  };
}

function validateSettings(data: unknown): ValidatedSettings {
  const parsed = globalSettingsSchema.safeParse(data);
  if (parsed.success) {
    return normalizeSettings(parsed.data);
  }
  return normalizeSettings(globalSettingsSchema.parse(DEFAULT_SETTINGS));
}

export async function getSettings(): Promise<ValidatedSettings> {
  if (settingsCache) return settingsCache;
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  const data = result[SETTINGS_KEY];
  const validated = data ? validateSettings(data) : validateSettings(DEFAULT_SETTINGS);
  settingsCache = validated;
  return validated;
}

export async function saveSettings(settings: GlobalSettings): Promise<void> {
  const validated = validateSettings(settings);
  settingsCache = validated;
  await chrome.storage.sync.set({ [SETTINGS_KEY]: validated });
}

export async function exportSettings(passphrase?: string): Promise<string> {
  const settings = await getSettings();
  const exportData = {
    version: 1,
    exportedAt: new Date().toLocaleString('sv-SE').replace(' ', 'T'),
    settings,
  };
  const plaintext = JSON.stringify(exportData, null, 2);
  if (passphrase && passphrase.length > 0) {
    return await encryptJSON(plaintext, passphrase);
  }
  return plaintext;
}

export async function importSettings(text: string, passphrase?: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON');
  }

  let payload: unknown = parsed;
  if (isEncryptedPayload(parsed)) {
    if (!passphrase) {
      throw new Error('PASSPHRASE_REQUIRED');
    }
    const decrypted = await decryptJSON(text, passphrase);
    try {
      payload = JSON.parse(decrypted);
    } catch {
      throw new Error('DECRYPT_FAILED');
    }
  }

  const wrapper = payload as { settings?: unknown };
  const validated = globalSettingsSchema.parse(wrapper?.settings);
  await saveSettings(validated);
}

export function isEncryptedExport(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as { format?: unknown };
    return parsed?.format === ENCRYPTED_FORMAT;
  } catch {
    return false;
  }
}
