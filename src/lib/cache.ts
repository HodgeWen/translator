import Dexie, { type EntityTable } from 'dexie';
import type { CacheEntry } from '@/types';

const DB_NAME = 'TranslatorCache';
const DB_VERSION = 1;
const TTL_DAYS = 7;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

interface CacheDatabase extends Dexie {
  translations: EntityTable<CacheEntry, 'hash'>;
}

const db = new Dexie(DB_NAME, { autoOpen: false }) as CacheDatabase;

db.version(DB_VERSION).stores({
  translations: '++hash, sourceLang, targetLang, createdAt',
});

let initialized = false;

async function ensureDb(): Promise<CacheDatabase> {
  if (!initialized) {
    await db.open();
    initialized = true;
  }
  return db;
}

function hashKey(text: string, sourceLang: string, targetLang: string): string {
  // Simple hash using built-in APIs
  const str = `${text}:${sourceLang}:${targetLang}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export async function getCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string | null> {
  const dbInstance = await ensureDb();
  const hash = hashKey(text, sourceLang, targetLang);
  const entry = await dbInstance.translations.get(hash);

  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.createdAt > TTL_MS) {
    await dbInstance.translations.delete(hash);
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
  const hash = hashKey(text, sourceLang, targetLang);
  await dbInstance.translations.put({
    hash,
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
