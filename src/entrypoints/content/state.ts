import type { LangCode, TranslationStyle } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ElementState {
  originalHTML: string;
  translatedText: string;
  status: 'idle' | 'pending' | 'translated' | 'error';
  cloneEl?: HTMLElement;
  showingOriginal: boolean;
}

export interface AggregateSettings {
  aggregateEnabled: boolean;
  maxParagraphsPerRequest: number;
  maxTextLengthPerRequest: number;
  maxConcurrentRequests: number;
  requestTimeout: number;
}

export interface GlobalState {
  isActive: boolean;
  style: TranslationStyle;
  nativeLanguage: LangCode;
  targetLang: LangCode;
  observer: IntersectionObserver | null;
  elementMap: Map<HTMLElement, ElementState>;
  aggregate: AggregateSettings;
  pendingAggregateElements: Set<HTMLElement>;
  aggregateDebounceTimer: number | null;
  // 全局显示模式：
  //   'translation' → elementMap 中所有段落显示译文（默认）
  //   'original'    → 所有段落显示原文（Alt+W 二次按下后进入）
  // 与 ElementState.showingOriginal 配合：单段 Ctrl+悬浮 toggle 仅修改单段标志；
  // 全页 Alt+W toggle 修改本字段并把所有段落 sync 到对应状态。
  // 新翻译完成的段落在 applyTranslation 时按本字段决定初始显示。
  displayMode: 'translation' | 'original';
}

// ─── State ──────────────────────────────────────────────────────────────

// 译文 wrapper → 原始 el 反查表。用于 Ctrl 切换恢复时从 wrapper 反查原 el；
// 同时是「原 el 离开 DOM 后仍可触达」的存储锚点。原 el 节点本身保存在
// `state.elementMap`（通过 ElementState）；DOM 树里只剩 wrapper 占据槽位。
export const wrapperToOriginal: WeakMap<HTMLElement, HTMLElement> = new WeakMap();

// WeakSet：标记「由扩展自身 replaceWith 导致的 DOM 移除」，防止 MutationObserver
// 误把翻译/还原/切换操作当成站点移除节点而清理 elementMap。
export const mutationIgnoredNodes = new WeakSet<HTMLElement>();

export const state: GlobalState = {
  isActive: false,
  style: 'original',
  nativeLanguage: 'zh-CN',
  targetLang: 'zh-CN',
  observer: null,
  elementMap: new Map(),
  aggregate: {
    aggregateEnabled: true,
    maxParagraphsPerRequest: 5,
    maxTextLengthPerRequest: 2000,
    maxConcurrentRequests: 3,
    requestTimeout: 30000,
  },
  pendingAggregateElements: new Set(),
  aggregateDebounceTimer: null,
  displayMode: 'translation',
};
