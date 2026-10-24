import type { GlobalSettings } from '@/types';
import {
  isPlainObject,
  parseSettingsLenient,
  type SettingsWarning,
  type ValidatedSettings,
} from './schema';
import { DEFAULT_GLOBAL_PROMPT } from './prompts';
import { encryptJSON, decryptJSON, isEncryptedPayload, ENCRYPTED_FORMAT } from './crypto';
import {
  CURRENT_SCHEMA_VERSION,
  EXPORT_VERSION,
  SETTINGS_KEY,
  SETTINGS_SHARD_PREFIX,
  PROVIDERS_KEY,
  PROVIDERS_SHARD_PREFIX,
  SettingsStorageError,
  persistSettings,
  readKey,
  readScalars,
  readProviders,
} from './storage-shards';
import {
  normalizeSettings,
  collectDanglingReferenceWarnings,
} from './storage-normalize';

// 持久化细节（分片布局 / 配额预检 / 落盘 / 分片读取）在 storage-shards.ts，
// provider 归一化与悬空引用诊断在 storage-normalize.ts。
// 本文件只保留对外的配置读写 API 与内存缓存/诊断通道：
//   - getSettings / saveSettings / exportSettings / importSettings / isEncryptedExport
//   - DEFAULT_SETTINGS / handleSettingsStorageChange / getSettingsDiagnostics
// 这些函数必须定义在这里（不能只做 re-export）：多个测试用 spyOn(storage, 'getSettings')
// 替换本模块命名空间上的属性，api.ts 也直接 import './storage'，拆分后必须仍是同一
// 模块实例，否则 spy 拦不到调用点。

// 常量与错误类型从布局模块转出，保持 storage.ts 作为唯一对外入口（调用方无需知道
// 分片模块的存在）。它们只是值/类引用，转出不影响上面的模块身份约束。
// CURRENT_SCHEMA_VERSION / EXPORT_VERSION 仅在本文件与 storage-shards.ts 内部使用，
// 不转出（避免扩大零消费者的导出面）。
export { SettingsStorageError, isSettingsStorageError } from './storage-shards';
export type { SettingsErrorCode } from './storage-shards';

/** 供测试与排查使用：storage 里属于本模块的 key 命名 */
export const SETTINGS_STORAGE_KEYS = {
  settings: SETTINGS_KEY,
  settingsShardPrefix: SETTINGS_SHARD_PREFIX,
  providers: PROVIDERS_KEY,
  providersShardPrefix: PROVIDERS_SHARD_PREFIX,
} as const;

// ---------------------------- 诊断通道 ----------------------------

export interface SettingsDiagnostics {
  /** 最近一次读取/保存/导出对应持久化结构版本 */
  schemaVersion: number;
  /** 最近一次操作中被丢弃或回落的配置项（空数组表示一切正常） */
  warnings: SettingsWarning[];
  /** 最近一次读取是否从旧单 key 布局迁移而来 */
  migratedFromLegacy: boolean;
}

let lastDiagnostics: SettingsDiagnostics = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  warnings: [],
  migratedFromLegacy: false,
};

/**
 * 最近一次设置的诊断信息（含被丢弃的非法条目、明文导出提醒等）。
 * getSettings() 返回类型保持不变，UI 需要提示时从这里取警告。
 */
export function getSettingsDiagnostics(): SettingsDiagnostics {
  return {
    schemaVersion: lastDiagnostics.schemaVersion,
    warnings: [...lastDiagnostics.warnings],
    migratedFromLegacy: lastDiagnostics.migratedFromLegacy,
  };
}

// ---------------------------- 内存缓存 ----------------------------

let settingsCache: ValidatedSettings | null = null;

/**
 * 仅供单元测试：清空模块级缓存与诊断信息，模拟「扩展冷启动后的首次读取」。
 * 生产代码不要调用——正常失效走 chrome.storage.onChanged。
 */
export function __resetSettingsCacheForTests(): void {
  settingsCache = null;
  lastDiagnostics = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    warnings: [],
    migratedFromLegacy: false,
  };
}

/** 判断某个 storage key 是否属于本模块（用于 onChanged 失效缓存） */
function isSettingsStorageKey(key: string): boolean {
  return (
    key === SETTINGS_KEY ||
    key.startsWith(SETTINGS_SHARD_PREFIX) ||
    key === PROVIDERS_KEY ||
    key.startsWith(PROVIDERS_SHARD_PREFIX)
  );
}

/**
 * chrome.storage.onChanged 的缓存失效处理：标量 key、providers key、任意分片
 * 任一变化都清空缓存，保证多标签页/多入口读到最新配置。
 */
export function handleSettingsStorageChange(
  changes: Record<string, unknown>,
  area: string
): void {
  if (area !== 'sync') return;
  if (Object.keys(changes).some(isSettingsStorageKey)) {
    settingsCache = null;
  }
}

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener(handleSettingsStorageChange);
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  providers: [],
  selectedProviderId: '',
  selectedModelId: '',
  services: [],
  selectedServiceId: '',
  customTones: [],
  overrideDisplayStyleEnabled: false,
  customDisplayStyle: 'original',
  overrideTranslationToneEnabled: false,
  customTranslationTone: 'normal',
  nativeLanguage: 'zh-CN',
  secondLanguage: 'en',
  uiLanguage: 'zh-CN',
  displayStyle: 'original',
  translationTone: 'normal',
  translationLoadingTheme: 'indigo',
  colorScheme: 'system',
  globalPrompt: DEFAULT_GLOBAL_PROMPT,
  shortcutKey: 'Alt+W',
  hoverShortcutKey: 'Control',
  inputShortcutKey: 'Control',
  inputTranslationTargetLanguage: 'en',
  inputLoadingPulseKeyframes: ['#4b5563', '#2563eb', '#0f172a'],
  inputLoadingPulseDurationMs: 1200,
  inputLoadingPulseEasing: 'ease-out',
  aggregateEnabled: true,
  maxParagraphsPerRequest: 5,
  maxTextLengthPerRequest: 2000,
  maxConcurrentRequests: 3,
  requestTimeout: 30000,
};

/**
 * 组装诊断信息：解析警告 + （仅在确实丢弃过条目时）悬空引用提示。
 */
function buildDiagnostics(
  settings: ValidatedSettings,
  parseWarnings: SettingsWarning[],
  migratedFromLegacy: boolean,
  schemaVersion: number = CURRENT_SCHEMA_VERSION
): SettingsDiagnostics {
  const warnings = [...parseWarnings];
  if (parseWarnings.length > 0) {
    warnings.push(...collectDanglingReferenceWarnings(settings));
  }
  return { schemaVersion, warnings, migratedFromLegacy };
}

// ---------------------------- 读取 ----------------------------

interface LoadedSettings {
  settings: ValidatedSettings;
  schemaVersion: number;
  warnings: SettingsWarning[];
  migratedFromLegacy: boolean;
}

async function loadSettingsFromStorage(): Promise<LoadedSettings> {
  const warnings: SettingsWarning[] = [];
  const record = await readKey(SETTINGS_KEY);

  let rawSettings: Record<string, unknown> = {};
  let schemaVersion = CURRENT_SCHEMA_VERSION;
  let legacy = false;

  if (record !== undefined) {
    if (!isPlainObject(record)) {
      warnings.push({
        code: 'SETTINGS_INVALID_SHAPE',
        path: SETTINGS_KEY,
        message: '存储中的设置不是对象，已回落默认值',
      });
    } else if (!isPlainObject(record.settings) && typeof record.schemaVersion !== 'number') {
      // 旧布局：单 key 存完整 GlobalSettings（含 providers 数组）。
      // 判定条件不用「providers 是数组」，这样即使历史数据里 providers 损坏也能按旧布局读出其余字段。
      legacy = true;
      schemaVersion = 0;
      rawSettings = record;
    } else {
      const storedVersion = record.schemaVersion;
      if (typeof storedVersion === 'number' && Number.isFinite(storedVersion)) {
        schemaVersion = storedVersion;
        if (storedVersion > CURRENT_SCHEMA_VERSION) {
          warnings.push({
            code: 'SETTINGS_SCHEMA_VERSION_UNKNOWN',
            path: SETTINGS_KEY,
            message: `存储版本 ${storedVersion} 高于当前支持的 ${CURRENT_SCHEMA_VERSION}，将尽量按已知字段读取`,
          });
        }
      }
      const scalarsRead = await readScalars(record);
      warnings.push(...scalarsRead.warnings);
      rawSettings = scalarsRead.scalars;
    }
  }

  // 旧布局的 providers 已在 rawSettings 里；新布局需要从 providers key 读取
  if (!legacy) {
    const providersRead = await readProviders();
    warnings.push(...providersRead.warnings);
    if (providersRead.providers !== undefined) {
      rawSettings.providers = providersRead.providers;
    }
  }

  const parsed = parseSettingsLenient(rawSettings);
  warnings.push(...parsed.warnings);
  const normalized = normalizeSettings(parsed.settings);
  // 仅在确实丢弃过条目时才提示悬空引用，避免正常配置产生噪声
  if (parsed.warnings.length > 0) {
    warnings.push(...collectDanglingReferenceWarnings(normalized));
  }

  let migratedFromLegacy = false;
  if (legacy) {
    try {
      await persistSettings(normalized);
      migratedFromLegacy = true;
      schemaVersion = CURRENT_SCHEMA_VERSION;
    } catch (err) {
      // 迁移失败（例如配额不足）不阻断读取，本次继续按旧数据提供
      warnings.push({
        code: 'SETTINGS_MIGRATION_FAILED',
        path: SETTINGS_KEY,
        message: `旧设置迁移到分片布局失败，本次仍按旧数据提供：${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    }
  }

  return { settings: normalized, schemaVersion, warnings, migratedFromLegacy };
}

export async function getSettings(): Promise<ValidatedSettings> {
  if (settingsCache) return settingsCache;
  const loaded = await loadSettingsFromStorage();
  settingsCache = loaded.settings;
  // loadSettingsFromStorage 内部已拼好完整警告列表（含迁移失败与悬空引用）
  lastDiagnostics = {
    schemaVersion: loaded.schemaVersion,
    warnings: loaded.warnings,
    migratedFromLegacy: loaded.migratedFromLegacy,
  };
  return loaded.settings;
}

export async function saveSettings(settings: GlobalSettings): Promise<void> {
  // 字段级降级：单条非法配置只丢弃该条，不会清空全部设置
  const parsed = parseSettingsLenient(settings);
  const validated = normalizeSettings(parsed.settings);
  // 关键顺序：先落盘，set() resolve 之后才更新内存缓存。
  // 写入失败（配额/限流）时缓存保持旧值，内存与磁盘始终一致。
  await persistSettings(validated);
  settingsCache = validated;
  lastDiagnostics = buildDiagnostics(validated, parsed.warnings, false);
}

export async function exportSettings(passphrase?: string): Promise<string> {
  const settings = await getSettings();
  const exportData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toLocaleString('sv-SE').replace(' ', 'T'),
    settings,
  };
  const plaintext = JSON.stringify(exportData, null, 2);
  if (passphrase && passphrase.length > 0) {
    return await encryptJSON(plaintext, passphrase);
  }
  // 明文导出保持原样（不擅自加密，避免破坏用户预期），但通过诊断通道提醒 UI 风险
  const plaintextKeyCount = settings.providers.filter((provider) => provider.apiKey.trim().length > 0).length;
  if (plaintextKeyCount > 0) {
    // 同码警告只保留一条，避免反复导出让诊断列表无限增长
    const kept = lastDiagnostics.warnings.filter((w) => w.code !== 'SETTINGS_EXPORT_PLAINTEXT_API_KEY');
    lastDiagnostics = {
      ...lastDiagnostics,
      warnings: [
        ...kept,
        {
          code: 'SETTINGS_EXPORT_PLAINTEXT_API_KEY',
          path: 'providers',
          message: `明文导出包含 ${plaintextKeyCount} 个 API Key，请妥善保管导出文件或改用口令加密导出`,
        },
      ],
    };
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

  if (!isPlainObject(payload)) {
    throw new SettingsStorageError('SETTINGS_INVALID_PAYLOAD', '导入文件格式不正确，缺少设置对象');
  }

  const wrapper = payload as { version?: unknown; settings?: unknown };
  const version = wrapper.version;
  // 未知的更高版本明确报错，不静默接受（低版本/缺省仍按当前逻辑兼容读取）
  if (typeof version === 'number' && Number.isFinite(version) && version > EXPORT_VERSION) {
    throw new SettingsStorageError(
      'SETTINGS_UNSUPPORTED_VERSION',
      `导入文件版本 ${version} 高于当前支持的版本 ${EXPORT_VERSION}，请先升级扩展`
    );
  }

  if (!isPlainObject(wrapper.settings)) {
    throw new SettingsStorageError('SETTINGS_INVALID_PAYLOAD', '导入文件缺少 settings 字段或格式不正确');
  }

  const lenient = parseSettingsLenient(wrapper.settings);
  const validated = normalizeSettings(lenient.settings);
  await persistSettings(validated);
  settingsCache = validated;
  lastDiagnostics = buildDiagnostics(validated, lenient.warnings, false);
}

export function isEncryptedExport(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as { format?: unknown };
    return parsed?.format === ENCRYPTED_FORMAT;
  } catch {
    return false;
  }
}
