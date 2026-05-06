import type { LangCode } from '@/types';
import { shouldSkipTranslation } from './lang-detect';
import { sendBgMessage } from './messaging';

/**
 * 内容脚本翻译入口前置：在 background 完成语言检测，并判断是否应跳过翻译。
 *
 * 抽取动机：单段翻译、聚合翻译、输入框翻译三处都重复 detect → catch → shouldSkip 的模板。
 *
 * 失败处理：检测请求异常被吞掉，等同于 detectedLang=null，后续翻译仍会进行
 * （由 LLM 自身做语言识别）；这避免了检测层故障阻塞正文翻译。
 */
export async function detectAndCheckSkip(
  text: string,
  nativeLanguage: LangCode
): Promise<{ skip: boolean; detectedLang: LangCode | null }> {
  let detectedLang: LangCode | null = null;
  try {
    const r = await sendBgMessage<{ lang: LangCode | null }>({
      type: 'DETECT_LANG',
      payload: { text },
    });
    detectedLang = r.lang;
  } catch {
    // 检测失败 → 视为未知，继续翻译。
  }
  return {
    skip: !!(detectedLang && shouldSkipTranslation(detectedLang, nativeLanguage)),
    detectedLang,
  };
}
