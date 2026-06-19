import { franc } from 'franc-min';
import type { LangCode } from '@/types';

// ISO 639-3 to BCP 47 / ISO 639-1 mapping for common languages
const ISO3_TO_BCP47: Record<string, string> = {
  cmn: 'zh',
  zho: 'zh',
  eng: 'en',
  jpn: 'ja',
  kor: 'ko',
  fra: 'fr',
  deu: 'de',
  spa: 'es',
  ita: 'it',
  rus: 'ru',
  por: 'pt',
  ara: 'ar',
  hin: 'hi',
  tha: 'th',
  vie: 'vi',
  ind: 'id',
  tur: 'tr',
  nld: 'nl',
  pol: 'pl',
  ukr: 'uk',
  swe: 'sv',
  nor: 'no',
  fin: 'fi',
  dan: 'da',
  ces: 'cs',
  ell: 'el',
  heb: 'he',
  hun: 'hu',
  rom: 'ro',
};

function mapLangCode(iso3: string): LangCode {
  return ISO3_TO_BCP47[iso3] || iso3;
}

// 字符集快速兜底：CJK 文本（中/日/韩）即使长度 < 10 也能正确识别。
// 优先级：日文（含假名）> 韩文（谚文）> 中文（仅 CJK 表意文字）。
function detectByCharset(text: string): LangCode | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  let cjk = 0;
  let kana = 0;
  let hangul = 0;
  let total = 0;

  for (const ch of trimmed) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (/\s/.test(ch)) continue;
    total += 1;
    if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) {
      cjk += 1;
    } else if (
      (code >= 0x3040 && code <= 0x309f) || // Hiragana
      (code >= 0x30a0 && code <= 0x30ff)    // Katakana
    ) {
      kana += 1;
    } else if (code >= 0xac00 && code <= 0xd7af) {
      hangul += 1;
    }
  }

  if (total === 0) return null;

  if (kana / total >= 0.25) return 'ja';
  if (hangul / total >= 0.3) return 'ko';
  if (cjk / total >= 0.3) return 'zh';

  return null;
}

// 本地检测：franc-min + CJK 字符集兜底，不发起任何网络请求。
// 仅用于 popup 翻译面板：检测输入语言以决定翻译方向（母语→第二语言 / 外语→母语）。
export async function detectLanguageLocal(text: string): Promise<LangCode | null> {
  const trimmed = text.trim();

  // franc-min requires at least ~10 chars for reliable detection；短文本走字符集兜底。
  if (trimmed.length < 10) {
    return detectByCharset(trimmed);
  }

  try {
    const iso3 = franc(text);
    if (iso3 === 'und') {
      return detectByCharset(trimmed);
    }
    return mapLangCode(iso3);
  } catch (err) {
    console.warn('[Translator] franc detection failed, using charset fallback:', err);
    return detectByCharset(trimmed);
  }
}

// 比较检测语言与目标语言是否同源（前缀匹配）。
export function isSameLanguage(
  detectedLang: LangCode | null | undefined,
  targetLang: LangCode
): boolean {
  if (!detectedLang) return false;
  const detected = detectedLang.toLowerCase().split('-')[0];
  const target = targetLang.toLowerCase().split('-')[0];
  return detected === target;
}
