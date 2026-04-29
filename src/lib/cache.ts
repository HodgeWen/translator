import Dexie, { type EntityTable } from 'dexie';
import type { CacheEntry } from '@/types';

const DB_NAME = 'TranslatorCache';
const DB_VERSION = 2; // v2: hash 改 SHA-256 + 新增 sourceText 字段
const TTL_DAYS = 7;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

interface CacheDatabase extends Dexie {
  translations: EntityTable<CacheEntry, 'hash'>;
}

const db = new Dexie(DB_NAME, { autoOpen: false }) as CacheDatabase;

// v1 → v2 迁移：直接清空旧表，因为旧 hash 无法与新 SHA-256 共存。
// 缓存本就是可丢弃数据（7 天 TTL），用户无感。
db.version(1).stores({
  translations: '++hash, sourceLang, targetLang, createdAt',
});
db.version(DB_VERSION).stores({
  translations: '++hash, sourceLang, targetLang, createdAt',
}).upgrade(tx => {
  return tx.table('translations').clear();
});

let initialized = false;

async function ensureDb(): Promise<CacheDatabase> {
  if (!initialized) {
    await db.open();
    initialized = true;
  }
  return db;
}

// SHA-256 哈希：碰撞概率 ~2^-128（birthday bound），消除 djb2 32-bit 碰撞风险。
// Service Worker 和 content script 均可访问 crypto.subtle。
async function hashKey(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const str = `${text}:${sourceLang}:${targetLang}`;
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  let hex = '';
  for (let i = 0; i < hashArray.length; i++) {
    hex += hashArray[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export async function getCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string | null> {
  const dbInstance = await ensureDb();
  const hash = await hashKey(text, sourceLang, targetLang);
  const entry = await dbInstance.translations.get(hash);

  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.createdAt > TTL_MS) {
    await dbInstance.translations.delete(hash);
    return null;
  }

  // 二次校验：即使 SHA-256 碰撞极不可能，仍核对原文确保 100% 正确
  if (entry.sourceText !== text) {
    return null;
  }

  return entry.text;
}

export async function setCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  translatedText: string
): Promise<void> {
  const dbInstance = await ensureDb();
  const hash = await hashKey(text, sourceLang, targetLang);
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

export async function clearAllCache(): Promise<number> {
  const dbInstance = await ensureDb();
  const count = await dbInstance.translations.count();
  await dbInstance.translations.clear();
  return count;
}
