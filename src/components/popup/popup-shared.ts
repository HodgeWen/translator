import type { LangCode } from '@/types'
import { isSameLanguage } from '@/lib/lang-detect'

/** 目标语言「自动」哨兵值：与具体 LangCode 区分开，避免和真实语言码撞车 */
export const TARGET_AUTO = 'auto' as const
export type TargetSelection = typeof TARGET_AUTO | LangCode

export interface SelectedImage {
  previewUrl: string
  dataUrl: string
  name: string
}

/** 根据检测结果决定翻译方向：母语→第二语言，外语→母语 */
export function resolveAutoTargetLang(
  detectedLang: LangCode | null,
  nativeLanguage: LangCode,
  secondLanguage: LangCode
): LangCode {
  if (detectedLang && isSameLanguage(detectedLang, nativeLanguage)) {
    return secondLanguage
  }
  return nativeLanguage
}
