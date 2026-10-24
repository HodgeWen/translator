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
//
// 入口预探测：下面的逐字符循环只统计三个码位区间（CJK 表意文字、假名、谚文），
// 三者计数全为 0 时必然返回 null。预探测正则覆盖的正是这三个区间的并集，因此
// 「预探测未命中 ⇒ 三计数全 0 ⇒ 返回 null」与原逻辑严格等价（区间全在 BMP 内，
// 不涉及代理对），但把拉丁/西里尔等非 CJK 文本的路径从「逐字符 + 每字符一次
// 正则」压缩成一次正则扫描。页面翻译会对每段文本调用本函数，这是固定开销。
const CJK_CHARSET_PROBE = /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;

function detectByCharset(text: string): LangCode | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!CJK_CHARSET_PROBE.test(trimmed)) return null;

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

// CJK 语言前缀集合：无 [lang] 属性时的字符集兜底仅对这些目标语言启用，
// 避免对拉丁等语言做字符集误判。
const CJK_LANG_PREFIXES = new Set(['zh', 'ja', 'ko']);

// 翻译调度前的目标语言跳过判定（纯函数，不调用 franc、不发网络请求）。
// lang 来源分两种，语义不同：
// - ownLang（元素自身 lang 属性）：直接决定该元素语言，命中目标语即跳过；
// - ancestorLang（最近 [lang] 祖先）：只是页面环境——站点 UI 本地化为目标语
//   （如中文 locale 的 X，<html lang="zh-cn">）时祖先必然命中，正文却可能是外语。
//   因此目标语为 CJK 时还需 detectByCharset 确认文本确为目标语才跳过，否则放行翻译；
//   非 CJK 目标语维持前缀比对（复用其阈值）。
// - 两者皆缺失：仅当 targetLang 为 CJK 语言且文本命中 detectByCharset 兜底时跳过。
export function shouldSkipByLanguage(
  ownLang: string | null,
  ancestorLang: string | null,
  text: string,
  targetLang: LangCode
): boolean {
  if (ownLang) {
    return isSameLanguage(ownLang, targetLang);
  }
  const isCjkTarget = CJK_LANG_PREFIXES.has(targetLang.toLowerCase().split('-')[0]);
  if (ancestorLang && isSameLanguage(ancestorLang, targetLang)) {
    return !isCjkTarget || isSameLanguage(detectByCharset(text), targetLang);
  }
  return isCjkTarget && isSameLanguage(detectByCharset(text), targetLang);
}
