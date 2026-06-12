import Dexie, { type EntityTable } from 'dexie';
import type { CacheEntry, RequestLogEntry, DailyTokenUsageEntry } from '@/types';

const DB_NAME = 'TranslatorCache';
const DB_VERSION = 3; // v3: 新增 request_logs 与 daily_token_usage 统计表
const TTL_DAYS = 7;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

interface CacheDatabase extends Dexie {
  translations: EntityTable<CacheEntry, 'hash'>;
  request_logs: EntityTable<RequestLogEntry, 'id'>;
  daily_token_usage: EntityTable<DailyTokenUsageEntry, 'id'>;
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
db.version(DB_VERSION).stores({
  translations: 'hash, sourceLang, targetLang, createdAt',
  request_logs: '++id, [providerId+modelId], timestamp',
  daily_token_usage: '++id, [providerId+modelId+date], date',
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
async function hashKey(text: string, sourceLang: string, targetLang: string, extraSalt = ''): Promise<string> {
  const str = `${text}:${sourceLang}:${targetLang}:${extraSalt}`;
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  extraSalt = ''
): Promise<{ text: string; hash: string } | null> {
  const dbInstance = await ensureDb();
  const hash = await hashKey(text, sourceLang, targetLang, extraSalt);
  const entry = await dbInstance.translations.get(hash);

  if (!entry) return null;

  if (Date.now() - entry.createdAt > TTL_MS) {
    await dbInstance.translations.delete(hash);
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
  sourceLang: string,
  targetLang: string,
  translatedText: string,
  precomputedHash?: string,
  extraSalt = ''
): Promise<void> {
  const dbInstance = await ensureDb();
  const hash = precomputedHash ?? await hashKey(text, sourceLang, targetLang, extraSalt);
  await dbInstance.translations.put({
    hash,
    sourceText: text,
    sourceLang,
    targetLang,
    text: translatedText,
    createdAt: Date.now(),
  });
}

export async function clearExpiredCache(): Promise<number> {
  const dbInstance = await ensureDb();
  const cutoff = Date.now() - TTL_MS;
  const expired = await dbInstance.translations
    .where('createdAt')
    .below(cutoff)
    .toArray();

  await dbInstance.translations.bulkDelete(expired.map(e => e.hash));
  return expired.length;
}
