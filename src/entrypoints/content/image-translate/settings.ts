import type { LangCode } from '@/types';

// 延迟读取：content script 注入所有页面，首次悬停/触发时才动态加载设置。
let loaded = false;
let hoverButtonEnabled = true;
let targetLang: LangCode = 'zh-CN';

export function hasLoadedImageTranslateSettings(): boolean {
  return loaded;
}

export function isImageHoverButtonEnabled(): boolean {
  return hoverButtonEnabled;
}

/** 网页图片目标语言与页面翻译一致（母语） */
export function getImageTranslateTargetLang(): LangCode {
  return targetLang;
}

export async function ensureImageTranslateSettings(): Promise<void> {
  if (loaded) return;
  const { getSettings } = await import('@/lib/storage');
  const settings = await getSettings();
  hoverButtonEnabled = settings.imageHoverButtonEnabled;
  targetLang = settings.nativeLanguage;
  loaded = true;
}

export function invalidateImageTranslateSettings(): void {
  loaded = false;
}
