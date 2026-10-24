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
  // 基础 UI 组件与单测环境可能没有 chrome.i18n（SSR / linkedom / 非扩展上下文），
  // 此时回退到 key 本身，避免直接访问 chrome 抛错打断渲染。
  if (typeof chrome === 'undefined' || !chrome.i18n?.getMessage) {
    return key;
  }
  return chrome.i18n.getMessage(key) || key;
}
