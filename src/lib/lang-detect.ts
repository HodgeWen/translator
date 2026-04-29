import { franc } from 'franc-min';
import type { LangCode, LangDetectProvider } from '@/types';
import { getSettings } from './storage';

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

  // 阈值说明：
  // - 假名 ≥ 0.25：日文文本中假名密度通常很高（30-60%），低于此可能是中文夹引日文片段。
  // - 谚文 ≥ 0.3：韩文文本中谚文音节密集，间杂少量汉字。
  // - CJK ≥ 0.3：中文兜底（注意：日文/韩文已在前两条筛掉）。
  if (kana / total >= 0.25) return 'ja';
  if (hangul / total >= 0.3) return 'ko';
  if (cjk / total >= 0.3) return 'zh';

  return null;
}

async function detectWithFranc(text: string): Promise<LangCode | null> {
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

// Google translate 公共端点：免 key，但中国大陆访问可能不稳定。
// 响应是裸数组：[ [["译文","原文",...]], null, "zh-CN", ... ]，第三个元素是检测到的源语言。
async function detectWithGoogleFree(provider: LangDetectProvider, text: string): Promise<LangCode | null> {
  const endpoint = provider.endpoint?.trim() || 'https://translate.googleapis.com/translate_a/single';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), provider.timeout || 10000);

    const url = new URL(endpoint);
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', 'auto');
    url.searchParams.set('tl', 'en');
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', text);

    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) return null;

    const data = await response.json();
    const lang = Array.isArray(data) && typeof data[2] === 'string' ? data[2] : null;
    if (lang && lang.length >= 2) {
      return lang;
    }
    return null;
  } catch (err) {
    console.warn('[Translator] detectWithGoogleFree failed:', err);
    return null;
  }
}

async function detectWithApi(provider: LangDetectProvider, text: string): Promise<LangCode | null> {
  if (!provider.endpoint) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), provider.timeout || 10000);

    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...provider.headers,
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();

    // Try common response shapes
    const lang =
      data.language ||
      data.lang ||
      data.detectedLanguage ||
      data.source_language ||
      data.data?.language ||
      data.data?.detections?.[0]?.language ||
      data.result?.language;

    if (typeof lang === 'string' && lang.length >= 2) {
      return lang;
    }

    return null;
  } catch (err) {
    console.warn('[Translator] detectWithApi failed:', err);
    return null;
  }
}

// 本地检测：仅 franc-min + CJK 字符集兜底，不发起任何网络请求。
// 用于 popup 输入预览等隐私敏感场景，避免每次按键都把内容发给远端检测器。
export async function detectLanguageLocal(text: string): Promise<LangCode | null> {
  return detectWithFranc(text);
}

export async function detectLanguage(text: string): Promise<LangCode | null> {
  const settings = await getSettings();

  for (const provider of settings.detectLangProviders) {
    let result: LangCode | null = null;

    if (provider.type === 'franc') {
      result = await detectWithFranc(text);
    } else if (provider.type === 'api') {
      result = await detectWithApi(provider, text);
    } else if (provider.type === 'google_free') {
      result = await detectWithGoogleFree(provider, text);
    }

    if (result) {
      return result;
    }
  }

  return null;
}

export function shouldSkipTranslation(
  detectedLang: LangCode | null | undefined,
  nativeLanguage: LangCode
): boolean {
  if (!detectedLang) return false;

  // Normalize for comparison
  const detected = detectedLang.toLowerCase().split('-')[0];
  const native = nativeLanguage.toLowerCase().split('-')[0];

  return detected === native;
}
