import type { ValidatedSettings, SettingsWarning } from './schema';
import { isPlainObject } from './schema';

// ============================================================================
// 持久化布局 / 配额预检 / 落盘
// ----------------------------------------------------------------------------
// 本文件是 storage.ts 的持久化细节层：chrome.storage.sync 的分片布局、字节计量、
// 配额预检、写入串行化与读取分片合并。对外的配置读写 API（getSettings /
// saveSettings / exportSettings / importSettings 等）仍定义在 storage.ts，
// 这里只提供它内部使用的实现。
// ============================================================================

type ValidatedProvider = ValidatedSettings['providers'][number];
type ScalarSettings = Omit<ValidatedSettings, 'providers'>;

// ============================================================================
// 分片存储布局
// ----------------------------------------------------------------------------
// chrome.storage.sync 的硬限制（来源：Chrome 扩展文档 / @types/chrome 中
// SyncStorageArea 的 QUOTA_BYTES / QUOTA_BYTES_PER_ITEM）：
//   - QUOTA_BYTES_PER_ITEM = 8192      单个 key（值 + key 名）最大 8KB
//   - QUOTA_BYTES          = 102400    整个 sync 区总量 100KB
// 一旦 set() 超过任一限制会直接 reject。旧实现只有 translator_settings_v1 一个 key，
// 且先把内存缓存改成新值再落盘，于是超限时出现「看起来保存成功、实际没落盘、重启丢失」。
//
// 现布局（每类数据都能在装不下时继续分片，保证单 key 目标 < 6KB）：
//   translator_settings_v1        标量配置（不含 providers）
//                                 装得下：{ schemaVersion, settings: {...} }
//                                 装不下：{ schemaVersion, shardCount, fields: [...] } 清单
//   translator_settings_v1_<n>    标量分片：{ schemaVersion, settings: {字段子集} }
//   translator_providers_v1       providers（最占空间，含 apiKey/headers/body）
//                                 装得下：{ schemaVersion, providers: [...] }
//                                 装不下：{ schemaVersion, shardCount } 清单
//   translator_providers_v1_<n>   providers 分片：{ schemaVersion, providers: [...] }
//
// 单 key 目标 6144B（< 6KB），给 8192 上限留 2KB 余量：Chrome 按
// 「JSON.stringify(值) + key 长度」计费，留余量可吸收转义、Unicode 与后续字段新增。
//
// 旧布局（只有 translator_settings_v1，值是完整 GlobalSettings）读取时自动识别，
// 读取成功后迁移到新布局；迁移幂等：迁移后该 key 不再含 providers 数组，
// 再次读取不会重复迁移。迁移失败（如配额不足）不影响本次读取，只记录诊断警告。
// ============================================================================

export const SETTINGS_KEY = 'translator_settings_v1';
export const SETTINGS_SHARD_PREFIX = 'translator_settings_v1_';
export const PROVIDERS_KEY = 'translator_providers_v1';
export const PROVIDERS_SHARD_PREFIX = 'translator_providers_v1_';

/** 持久化结构版本号：只存在于 storage 层，不污染 types 里的 GlobalSettings */
export const CURRENT_SCHEMA_VERSION = 1;
/** 导出文件格式版本号（导出 wrapper 的 version 字段） */
export const EXPORT_VERSION = 1;

const SYNC_QUOTA_BYTES = 102_400;
const SYNC_QUOTA_BYTES_PER_ITEM = 8_192;
/** 分片目标体积，给 8KB 上限留余量 */
const ITEM_TARGET_BYTES = 6_144;

// ---------------------------- 错误类型 ----------------------------

export type SettingsErrorCode =
  | 'SETTINGS_QUOTA_EXCEEDED'
  | 'SETTINGS_UNSUPPORTED_VERSION'
  | 'SETTINGS_INVALID_PAYLOAD';

/** 带稳定错误码的设置存储错误，UI 可用 code 或 isSettingsStorageError() 识别 */
export class SettingsStorageError extends Error {
  readonly code: SettingsErrorCode;

  constructor(code: SettingsErrorCode, message: string) {
    super(message);
    this.name = 'SettingsStorageError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isSettingsStorageError(err: unknown): err is SettingsStorageError {
  if (err instanceof SettingsStorageError) return true;
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { code?: unknown }).code === 'string' &&
    (err as { code: string }).code.startsWith('SETTINGS_')
  );
}

// ---------------------------- 持久化结构 ----------------------------

/** translator_settings_v1 的值：标量配置 + 版本号（单 key 形态） */
interface PersistedSettingsRecord {
  schemaVersion: number;
  settings: ScalarSettings;
}

/** 标量配置分片清单（放在 translator_settings_v1 上） */
interface PersistedSettingsManifest {
  schemaVersion: number;
  shardCount: number;
  fields: string[];
}

/** 标量配置分片 */
interface PersistedSettingsShard {
  schemaVersion: number;
  settings: Record<string, unknown>;
}

/** providers 单 key / 单个分片的值 */
interface PersistedProvidersPayload {
  schemaVersion: number;
  providers: ValidatedProvider[];
}

/** providers 分片清单（放在 translator_providers_v1 上） */
interface PersistedProvidersManifest {
  schemaVersion: number;
  shardCount: number;
}

// ---------------------------- 字节计量与配额预检 ----------------------------

const textEncoder = new TextEncoder();

/**
 * 按 Chrome 的计费口径估算单项体积：JSON.stringify(值) 的 UTF-8 字节数 + key 长度。
 */
function measureBytes(key: string, value: unknown): number {
  return textEncoder.encode(JSON.stringify(value) ?? '').length + key.length;
}

function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)}KB`;
}

type SyncArea = typeof chrome.storage.sync;

/** getBytesInUse 在部分环境/测试替身里不存在，取不到时返回 null（跳过总量校验） */
async function getBytesInUseSafe(keys: string[] | null): Promise<number | null> {
  const area = chrome.storage.sync as SyncArea & {
    getBytesInUse?: (keys?: string[] | null) => Promise<number>;
  };
  if (typeof area.getBytesInUse !== 'function') return null;
  try {
    return await area.getBytesInUse(keys);
  } catch {
    return null;
  }
}

/**
 * 写入前的配额预检：
 * 1) 每个 item（值 + key 名）不得超过 8KB 单项上限；
 * 2) 用 getBytesInUse(null) 取当前总量，减去即将被覆盖/删除的旧字节，加上新字节，
 *    不得超过 100KB 总量上限。
 * 超限抛 SETTINGS_QUOTA_EXCEEDED，且此时尚未写入、内存缓存未被修改。
 */
async function assertSyncQuota(items: Record<string, unknown>, replacedKeys: string[]): Promise<void> {
  let newBytes = 0;
  for (const [key, value] of Object.entries(items)) {
    const bytes = measureBytes(key, value);
    newBytes += bytes;
    if (bytes > SYNC_QUOTA_BYTES_PER_ITEM) {
      throw new SettingsStorageError(
        'SETTINGS_QUOTA_EXCEEDED',
        `配置体积过大：${key} 需要 ${formatKB(bytes)}，超过浏览器同步存储单项上限 8KB。请精简提示词、请求头或自定义配置后重试。`
      );
    }
  }

  const total = await getBytesInUseSafe(null);
  if (total === null) return; // 无法计量时只保证单项上限，不阻塞保存
  const replaced = (await getBytesInUseSafe(replacedKeys)) ?? 0;
  const projected = total - replaced + newBytes;
  if (projected > SYNC_QUOTA_BYTES) {
    throw new SettingsStorageError(
      'SETTINGS_QUOTA_EXCEEDED',
      `同步存储空间不足：保存后预计占用 ${formatKB(projected)}，超过 100KB 上限（当前 ${formatKB(total)}）。本次设置未保存，请删除不用的服务商或缩短提示词。`
    );
  }
}

// ---------------------------- 分片规划 ----------------------------

function shardKey(prefix: string, index: number): string {
  return `${prefix}${index}`;
}

/**
 * 通用贪心装箱：把条目依次塞进当前分片，超出目标体积就开新分片。
 * measure 用于按目标 key 名计算真实体积（key 名长度也计入配额）。
 */
function packItems<T>(
  items: T[],
  measure: (index: number, batch: T[]) => number,
  targetBytes: number = ITEM_TARGET_BYTES
): T[][] {
  if (items.length === 0) return [[]];
  const batches: T[][] = [];
  let current: T[] = [];
  for (const item of items) {
    const candidate = [...current, item];
    if (current.length > 0 && measure(batches.length, candidate) > targetBytes) {
      batches.push(current);
      current = [item];
      continue;
    }
    current = candidate;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

function providersPayload(providers: ValidatedProvider[]): PersistedProvidersPayload {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, providers };
}

function buildProvidersLayout(providers: ValidatedProvider[]): {
  items: Record<string, unknown>;
  shardCount: number;
} {
  const shards = packItems(providers, (index, batch) =>
    measureBytes(shardKey(PROVIDERS_SHARD_PREFIX, index), providersPayload(batch))
  );
  if (shards.length <= 1) {
    // 能塞进一个 key：translator_providers_v1 直接存 { schemaVersion, providers }
    return {
      items: { [PROVIDERS_KEY]: providersPayload(providers) },
      shardCount: 0,
    };
  }
  const manifest: PersistedProvidersManifest = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    shardCount: shards.length,
  };
  const items: Record<string, unknown> = { [PROVIDERS_KEY]: manifest };
  shards.forEach((shard, index) => {
    items[shardKey(PROVIDERS_SHARD_PREFIX, index)] = providersPayload(shard);
  });
  return { items, shardCount: shards.length };
}

function settingsShardPayload(entries: [string, unknown][]): PersistedSettingsShard {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: Object.fromEntries(entries),
  };
}

/**
 * 标量配置分片：按字段贪心装箱。重型用户（长提示词 + 大量自定义语气）时
 * 单个标量 key 会逼近 8KB，因此这里同样允许分片。
 */
function buildSettingsLayout(scalars: ScalarSettings): {
  items: Record<string, unknown>;
  shardCount: number;
} {
  const entries = Object.entries(scalars) as [string, unknown][];
  const shards = packItems(entries, (index, batch) =>
    measureBytes(shardKey(SETTINGS_SHARD_PREFIX, index), settingsShardPayload(batch))
  );

  if (shards.length <= 1) {
    const record: PersistedSettingsRecord = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: scalars,
    };
    return { items: { [SETTINGS_KEY]: record }, shardCount: 0 };
  }

  const manifest: PersistedSettingsManifest = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    shardCount: shards.length,
    fields: shards.flatMap((shard) => shard.map(([key]) => key)),
  };
  const items: Record<string, unknown> = { [SETTINGS_KEY]: manifest };
  shards.forEach((shard, index) => {
    items[shardKey(SETTINGS_SHARD_PREFIX, index)] = settingsShardPayload(shard);
  });
  return { items, shardCount: shards.length };
}

/** 列出 storage 中现存的分片下标（取不到时返回空数组） */
async function listExistingShardIndices(prefix: string): Promise<number[]> {
  const area = chrome.storage.sync as SyncArea & { getKeys?: () => Promise<string[]> };
  let keys: string[] = [];
  try {
    if (typeof area.getKeys === 'function') {
      keys = await area.getKeys();
    } else {
      const all = await chrome.storage.sync.get(null);
      keys = Object.keys(all);
    }
  } catch {
    return [];
  }
  return keys
    .filter((key) => key.startsWith(prefix))
    .map((key) => Number(key.slice(prefix.length)))
    .filter((index) => Number.isInteger(index) && index >= 0);
}

/** 清理上一版布局遗留的多余分片；失败不影响已写入的数据 */
async function removeStaleShards(prefix: string, keep: number, existing: number[]): Promise<void> {
  const stale = existing.filter((index) => index >= keep).map((index) => shardKey(prefix, index));
  if (stale.length === 0) return;
  try {
    await chrome.storage.sync.remove(stale);
  } catch {
    // 分片数由清单决定，多余分片不会被读取；清理失败仅浪费空间
  }
}

// ---------------------------- 落盘 ----------------------------

/**
 * 写入串行化：persistSettings 是「读分片清单 → 计算布局 → 一次 set → 清理旧分片」
 * 的多步流程。同一扩展进程内并发调用（设置页快速连点、popup 与 options 同时保存）
 * 会让两次调用的分片清单互相覆盖，导致 manifest 里的 shardCount 与实际分片不一致，
 * 读取端只能跳过缺失分片 → provider 静默消失。
 *
 * 这里用模块级 Promise 链把写操作串成队列（进程内互斥）。跨标签页/跨进程的并发
 * 由 chrome.storage.sync 自身的一致性与 onChanged 缓存失效兜底；真正的跨进程事务
 * 语义 WebExtension 并未提供，此处只消除可控的那部分竞态。
 */
let writeChain: Promise<unknown> = Promise.resolve();

function serializeWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeChain.then(task, task);
  // 无论成功失败都让链条继续，避免一次失败把后续写永久卡住
  writeChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

/**
 * 唯一的写入口：先做配额预检，再一次 set 写入（标量与 providers 同批，避免半写），
 * 成功后清理多余分片。任何失败都向上抛，调用方据此决定是否更新内存缓存。
 */
export async function persistSettings(validated: ValidatedSettings): Promise<void> {
  return serializeWrite(async () => {
    const { providers, ...scalars } = validated;
    const settingsLayout = buildSettingsLayout(scalars);
    const providersLayout = buildProvidersLayout(providers);
    const items: Record<string, unknown> = {
      ...settingsLayout.items,
      ...providersLayout.items,
    };

    const existingSettingsShards = await listExistingShardIndices(SETTINGS_SHARD_PREFIX);
    const existingProvidersShards = await listExistingShardIndices(PROVIDERS_SHARD_PREFIX);
    const replacedKeys = [
      SETTINGS_KEY,
      PROVIDERS_KEY,
      ...existingSettingsShards.map((index) => shardKey(SETTINGS_SHARD_PREFIX, index)),
      ...existingProvidersShards.map((index) => shardKey(PROVIDERS_SHARD_PREFIX, index)),
    ];

    await assertSyncQuota(items, replacedKeys);
    await chrome.storage.sync.set(items);
    await removeStaleShards(SETTINGS_SHARD_PREFIX, settingsLayout.shardCount, existingSettingsShards);
    await removeStaleShards(PROVIDERS_SHARD_PREFIX, providersLayout.shardCount, existingProvidersShards);
  });
}

// ---------------------------- 读取 ----------------------------

export async function readKey(key: string): Promise<unknown> {
  const result = await chrome.storage.sync.get(key);
  return result[key];
}

async function readKeys(keys: string[]): Promise<Record<string, unknown>> {
  if (keys.length === 0) return {};
  try {
    return await chrome.storage.sync.get(keys);
  } catch {
    return {};
  }
}

/** 读取标量配置：单 key 形态直接取 settings，清单形态合并各分片 */
export async function readScalars(record: Record<string, unknown>): Promise<{
  scalars: Record<string, unknown>;
  warnings: SettingsWarning[];
}> {
  const warnings: SettingsWarning[] = [];
  if (isPlainObject(record.settings)) {
    return { scalars: { ...record.settings }, warnings };
  }

  const shardCount = typeof record.shardCount === 'number' ? record.shardCount : 0;
  if (shardCount <= 0) {
    warnings.push({
      code: 'SETTINGS_INVALID_SHAPE',
      path: `${SETTINGS_KEY}.settings`,
      message: '存储中的标量设置缺失，已回落默认值',
    });
    return { scalars: {}, warnings };
  }

  const keys = Array.from({ length: shardCount }, (_, index) => shardKey(SETTINGS_SHARD_PREFIX, index));
  const shards = await readKeys(keys);
  const scalars: Record<string, unknown> = {};
  for (const key of keys) {
    const shard = shards[key];
    if (!isPlainObject(shard) || !isPlainObject(shard.settings)) {
      warnings.push({
        code: 'SETTINGS_SHARD_MISSING',
        path: key,
        message: `配置分片 ${key} 缺失或损坏，已跳过`,
      });
      continue;
    }
    Object.assign(scalars, shard.settings);
  }
  return { scalars, warnings };
}

/** 读取 providers：单 key 形态直接取数组，清单形态合并各分片 */
export async function readProviders(): Promise<{
  providers: unknown;
  warnings: SettingsWarning[];
}> {
  const warnings: SettingsWarning[] = [];
  const payload = await readKey(PROVIDERS_KEY);
  if (payload === undefined) return { providers: undefined, warnings };
  if (!isPlainObject(payload)) {
    warnings.push({
      code: 'SETTINGS_INVALID_SHAPE',
      path: PROVIDERS_KEY,
      message: '服务商配置格式不正确，已回落为空列表',
    });
    return { providers: [], warnings };
  }

  if (Array.isArray(payload.providers)) {
    return { providers: payload.providers, warnings };
  }

  const shardCount = typeof payload.shardCount === 'number' ? payload.shardCount : 0;
  if (shardCount <= 0) return { providers: [], warnings };

  const keys = Array.from({ length: shardCount }, (_, index) => shardKey(PROVIDERS_SHARD_PREFIX, index));
  const shards = await readKeys(keys);
  const merged: unknown[] = [];
  for (const key of keys) {
    const shard = shards[key];
    if (!isPlainObject(shard) || !Array.isArray(shard.providers)) {
      warnings.push({
        code: 'SETTINGS_SHARD_MISSING',
        path: key,
        message: `服务商分片 ${key} 缺失或损坏，已跳过`,
      });
      continue;
    }
    merged.push(...shard.providers);
  }
  return { providers: merged, warnings };
}
