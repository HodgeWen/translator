import type { GlobalSettings } from '@/types';
import { globalSettingsSchema, type ValidatedSettings } from './schema';

type ValidatedProvider = ValidatedSettings['providers'][number];
import { DEFAULT_GLOBAL_PROMPT } from './prompts';
import { encryptJSON, decryptJSON, isEncryptedPayload, ENCRYPTED_FORMAT } from './crypto';

const SETTINGS_KEY = 'translator_settings_v1';

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
  modelQueue: [
    { providerId: 'default-openai', modelId: 'gpt-4o', enabled: true },
    { providerId: 'default-openai', modelId: 'gpt-4o-mini', enabled: true },
  ],
  nativeLanguage: 'zh-CN',
  defaultSourceLanguage: 'en',
  uiLanguage: 'zh-CN',
  defaultStyle: 'original',
  globalPrompt: DEFAULT_GLOBAL_PROMPT,
  detectLangProviders: [
    { id: 'franc', name: 'franc-min', type: 'franc' },
  ],
  shortcutKey: 'Alt+W',
  aggregateEnabled: true,
  maxParagraphsPerRequest: 5,
  maxTextLengthPerRequest: 2000,
  maxConcurrentRequests: 3,
  requestTimeout: 30000,
};

// 旧版 provider 的 body.* 采样字段一次性平滑迁移到独立字段（幂等）。
// 同时清理 headers 中冗余的默认 Content-Type（请求层会自动注入）。
function normalizeProvider(provider: ValidatedProvider): ValidatedProvider {
  const body = { ...provider.body };
  const headers = { ...provider.headers };

  for (const headerKey of Object.keys(headers)) {
    if (headerKey.toLowerCase() === 'content-type' && headers[headerKey].toLowerCase() === 'application/json') {
      delete headers[headerKey];
    }
  }

  let temperature = provider.temperature;
  let topP = provider.topP;
  let maxTokens = provider.maxTokens;
  let stream = provider.stream;

  if (temperature === undefined && typeof body.temperature === 'number') {
    temperature = body.temperature;
  }
  if (typeof body.temperature === 'number') {
    delete body.temperature;
  }

  if (topP === undefined && typeof body.top_p === 'number') {
    topP = body.top_p;
  }
  if (typeof body.top_p === 'number') {
    delete body.top_p;
  }

  if (maxTokens === undefined && typeof body.max_tokens === 'number') {
    maxTokens = body.max_tokens;
  }
  if (typeof body.max_tokens === 'number') {
    delete body.max_tokens;
  }

  if (stream === undefined && typeof body.stream === 'boolean') {
    stream = body.stream;
  }
  if (typeof body.stream === 'boolean') {
    delete body.stream;
  }

  return {
    ...provider,
    headers,
    body,
    temperature,
    topP,
    maxTokens,
    stream: stream ?? false,
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
  console.warn('Invalid settings, using defaults:', parsed.error.format());
  return normalizeSettings(globalSettingsSchema.parse(DEFAULT_SETTINGS));
}

export async function getSettings(): Promise<ValidatedSettings> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  const data = result[SETTINGS_KEY];
  if (data) {
    return validateSettings(data);
  }
  return validateSettings(DEFAULT_SETTINGS);
}

export async function saveSettings(settings: GlobalSettings): Promise<void> {
  const validated = validateSettings(settings);
  await chrome.storage.sync.set({ [SETTINGS_KEY]: validated });
}

export async function exportSettings(passphrase?: string): Promise<string> {
  const settings = await getSettings();
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
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
