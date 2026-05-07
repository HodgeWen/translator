export const GREETINGS_MAP: Record<string, string> = {
  'zh-CN': '你好',
  'zh-TW': '你好',
  'en': 'Hello',
  'ja': 'こんにちは',
  'ko': '안녕하세요',
  'fr': 'Bonjour',
  'de': 'Hallo',
  'es': 'Hola',
  'it': 'Ciao',
  'ru': 'Привет',
  'pt': 'Olá',
  'ar': 'مرحبا',
  'hi': 'नमस्ते',
  'th': 'สวัสดี',
  'vi': 'Xin chào',
  'id': 'Halo',
  'tr': 'Merhaba',
};

export function getRandomGreeting(): { lang: string; text: string } {
  const entries = Object.entries(GREETINGS_MAP);
  const [lang, text] = entries[Math.floor(Math.random() * entries.length)];
  return { lang, text };
}
