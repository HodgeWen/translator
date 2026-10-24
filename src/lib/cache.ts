import Dexie, { type EntityTable, type Table } from 'dexie';
import type { CacheEntry, RequestLogEntry, DailyTokenUsageEntry } from '@/types';

const DB_NAME = 'TranslatorCache';
const DB_VERSION = 8; // v8: 统计表补索引（裁剪与按 provider 清理不再全表扫描）
const TTL_DAYS = 7;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

export interface ImageTranslationSnapshot {
  imageHash: string;
  promptVersion: string;
  targetLang: string;
  text: string;
  providerId: string;
  modelId: string;
}

export interface ImageTranslationCacheEntry extends ImageTranslationSnapshot {
  createdAt: number;
}

interface CacheDatabase extends Dexie {
  translations: EntityTable<CacheEntry, 'hash'>;
  request_logs: EntityTable<RequestLogEntry, 'id'>;
  daily_token_usage: EntityTable<DailyTokenUsageEntry, 'id'>;
  image_translations: Table<ImageTranslationCacheEntry, [string, string, string]>;
}

const db = new Dexie(DB_NAME, { autoOpen: false }) as CacheDatabase;

// v1 → v2 迁移：直接清空旧表，因为旧 hash 无法与新 SHA-256 共存。
// 缓存本就是可丢弃数据（7 天 TTL），用户无感。
db.version(1).stores({
  translations: 'hash, sourceLang, targetLang, createdAt',
});
db.version(2).stores({
  translations: 'hash, sourceLang, targetLang, createdAt',
}).upgrade(tx => {
  return tx.table('translations').clear();
});
db.version(3).stores({
  translations: 'hash, sourceLang, targetLang, createdAt',
  request_logs: '++id, [providerId+modelId], timestamp',
  daily_token_usage: '++id, [providerId+modelId+date], date',
});
// v4: 移除 sourceLang 索引维度，清空旧缓存（hash 计算方式已变更）
db.version(4).stores({
  translations: 'hash, targetLang, createdAt',
  request_logs: '++id, [providerId+modelId], timestamp',
  daily_token_usage: '++id, [providerId+modelId+date], date',
}).upgrade(tx => {
  return tx.table('translations').clear();
});
// v5: 新增图片识别缓存；不清理既有 translations / request_logs / daily_token_usage
db.version(5).stores({
  translations: 'hash, targetLang, createdAt',
  request_logs: '++id, [providerId+modelId], timestamp',
  daily_token_usage: '++id, [providerId+modelId+date], date',
  image_translations: '[imageHash+promptVersion], createdAt',
});
// v6: 原计划直接把图片缓存主键改为 [imageHash+promptVersion+targetLang]，但 Dexie
// 不支持在升级中修改主键（会抛 "Not yet support for changing primary key"，导致整个
// 数据库打不开）。因此 v6 只删除旧表，v7 再以新主键重建；旧图片缓存可丢弃。
db.version(6).stores({
  image_translations: null,
});
// v7: 以新主键重建图片缓存表
db.version(7).stores({
  translations: 'hash, targetLang, createdAt',
  request_logs: '++id, [providerId+modelId], timestamp',
  daily_token_usage: '++id, [providerId+modelId+date], date',
  image_translations: '[imageHash+promptVersion+targetLang], createdAt',
});
// v8: 统计表补索引。只新增索引、不改主键、不删表，Dexie 会就地建索引并保留全部既有
// 行（升级后 request_logs / daily_token_usage 的历史统计不丢；translations 与
// image_translations 完全未提及，保持原样）。
//   - request_logs 加 [providerId+modelId+timestamp]：裁剪「每键最多 100 条」时按
//     索引范围取最旧的主键，替代旧实现「把该键全部行读出来再 sortBy」。
//   - daily_token_usage 加 [providerId+modelId]：按 provider+model 清理时命中索引。
//   - 两表都加单字段 providerId：修掉 clearStatsForProvider 的真实报错。
//     旧 v7 的 daily_token_usage 只有 [providerId+modelId+date] 这一个复合索引，
//     Dexie 的 where({providerId}) 会把它当「虚拟前缀索引」用，按 keyTail=2 在
//     上下界补两个 `[[]]` 哨兵；但补位复用了同一个 `[[]]` 实例，而 IndexedDB 规范
//     的「convert value to key」会因数组内出现重复引用判为非法键 → 直接抛 DataError
//     （实测 fake-indexeddb 与 Dexie 4.0.11：request_logs 正常，daily 抛错）。
//     结果是「清除某服务商统计」先删掉 request_logs 再抛错，daily 用量记录静默残留。
//     有了真正的 providerId 单字段索引，where({providerId}) 命中实体索引，不再走
//     虚拟前缀填充，既正确也更快（无需按 keyTail 展开主键）。
db.version(DB_VERSION).stores({
  request_logs: '++id, providerId, [providerId+modelId], [providerId+modelId+timestamp], timestamp',
  daily_token_usage: '++id, providerId, [providerId+modelId], [providerId+modelId+date], date',
});

let openPromise: Promise<CacheDatabase> | null = null;

export async function ensureDb(): Promise<CacheDatabase> {
  if (!openPromise) {
    openPromise = db.open().then(() => db).catch((err) => {
      openPromise = null;
      throw err;
    });
  }
  return openPromise;
}

// SHA-256 哈希：碰撞概率 ~2^-128（birthday bound），消除 djb2 32-bit 碰撞风险。
// Service Worker 和 content script 均可访问 crypto.subtle。
//
// extraSalt：可选盐值（如 globalPrompt 的摘要）。同 salt 共享缓存；
// 调用方修改 prompt 后传入新 salt 即可让旧缓存自然失效，TTL 兜底回收。
async function hashKey(text: string, targetLang: string, extraSalt = ''): Promise<string> {
  const str = `${text}:${targetLang}:${extraSalt}`;
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getCachedTranslation(
  text: string,
  targetLang: string,
  extraSalt = ''
): Promise<{ text: string; hash: string } | null> {
  const dbInstance = await ensureDb();
  const hash = await hashKey(text, targetLang, extraSalt);
  const entry = await dbInstance.translations.get(hash);

  if (!entry) return null;

  if (Date.now() - entry.createdAt > TTL_MS) {
    // 缓存是可选加速层：清理失败（事务被中止 / 连接关闭）绝不能把「缓存未命中」
    // 变成「翻译失败」。与下方碰撞占位清理保持同一策略。
    await dbInstance.translations.delete(hash).catch(() => {});
    return null;
  }

  if (entry.sourceText !== text) {
    // SHA-256 碰撞极其罕见，但若发生需主动删除占位 entry，避免下次同样的
    // sourceText 永远 cache miss（会落到同一 hash 槽继续命中失效路径）。
    await dbInstance.translations.delete(hash).catch(() => {});
    return null;
  }

  return { text: entry.text, hash };
}

export async function setCachedTranslation(
  text: string,
  targetLang: string,
  translatedText: string,
  precomputedHash?: string,
  extraSalt = ''
): Promise<void> {
  const dbInstance = await ensureDb();
  const hash = precomputedHash ?? await hashKey(text, targetLang, extraSalt);
  await dbInstance.translations.put({
    hash,
    sourceText: text,
    targetLang,
    text: translatedText,
    createdAt: Date.now(),
  });
}

/** 图片译文缓存键：同一图片内容 + 提示词版本 + 目标语言在 TTL 内共享译文 */
export function buildImageCacheKey(
  imageHash: string,
  promptVersion: string,
  targetLang: string
): [string, string, string] {
  return [imageHash, promptVersion, targetLang];
}

export function isImageCacheEntryExpired(
  entry: Pick<ImageTranslationCacheEntry, 'createdAt'>,
  now = Date.now()
): boolean {
  return now - entry.createdAt > TTL_MS;
}

export async function getCachedImageTranslation(
  imageHash: string,
  promptVersion: string,
  targetLang: string
): Promise<ImageTranslationCacheEntry | null> {
  const dbInstance = await ensureDb();
  const key = buildImageCacheKey(imageHash, promptVersion, targetLang);
  const entry = await dbInstance.image_translations.get(key);

  if (!entry) return null;

  if (isImageCacheEntryExpired(entry)) {
    await dbInstance.image_translations.delete(key);
    return null;
  }

  return entry;
}

export async function setCachedImageTranslation(entry: ImageTranslationSnapshot): Promise<void> {
  const dbInstance = await ensureDb();
  await dbInstance.image_translations.put({
    ...entry,
    createdAt: Date.now(),
  });
}

export async function clearExpiredCache(): Promise<number> {
  const dbInstance = await ensureDb();
  const cutoff = Date.now() - TTL_MS;

  // 只取主键而不 toArray()：过期条目可能上千条，每条都带 sourceText + text（数 KB），
  // 全量物化会让后台 service worker 在清理时白白吃几 MB 内存。索引 'createdAt'
  // 上的 primaryKeys() 走同一条索引范围扫描，但只读键、不读值。
  const expiredHashes = await dbInstance.translations
    .where('createdAt')
    .below(cutoff)
    .primaryKeys();

  await dbInstance.translations.bulkDelete(expiredHashes);

  // 图片缓存主键是复合键 [imageHash+promptVersion+targetLang]，primaryKeys() 返回的
  // 正是该复合键数组，可直接交给 bulkDelete。
  const expiredImageKeys = await dbInstance.image_translations
    .where('createdAt')
    .below(cutoff)
    .primaryKeys();

  await dbInstance.image_translations.bulkDelete(expiredImageKeys);

  return expiredHashes.length + expiredImageKeys.length;
}
