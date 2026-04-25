const cache: Record<string, Record<string, string>> = {};
let loadedLang = '';

export async function setUILanguage(lang: string): Promise<void> {
  const normalized = lang.replace(/-/g, '_');
  if (normalized === loadedLang) return;
  if (!cache[normalized]) {
    try {
      const url = chrome.runtime.getURL(`/_locales/${normalized}/messages.json`);
      const res = await fetch(url);
      const data = await res.json();
      const messages: Record<string, string> = {};
      for (const [key, val] of Object.entries(data)) {
        messages[key] = (val as { message: string }).message;
      }
      cache[normalized] = messages;
    } catch {
      cache[normalized] = {};
    }
  }
  loadedLang = normalized;
}

export function t(key: string): string {
  if (loadedLang && cache[loadedLang]?.[key]) {
    return cache[loadedLang][key];
  }
  return chrome.i18n.getMessage(key) || key;
}
