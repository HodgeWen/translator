import type { LangCode, DisplayStyle, GlobalSettings, TranslationLoadingTheme } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ElementState {
  // 已废弃：历史上用于「innerHTML 兜底还原」，原地渲染改造后**无人读取**。
  // 原节点的权威引用是 originalNodes（真实节点数组），innerHTML 只是它的
  // 字符串副本 —— 保留它等于给每个已翻译段落多存一份完整 HTML，长页面上
  // 是纯内存放大。字段保留为可选以兼容测试里的字面量构造，生产代码不再写入。
  originalHTML?: string;
  // 原子节点引用（按原顺序）。以数组而非 DocumentFragment 保存：fragment 被
  // append 后会移空自身，还原时只会拿到空集合（bilingual 停止清空的根因）
  originalNodes?: ChildNode[];
  // 译文渲染节点引用（按原顺序）。original / clean / underline 三种模式都是
  // 「原地渲染」：原 el 节点本身始终留在 DOM 树中，只交换其子节点。
  // 这里保存渲染出来的子节点，Ctrl+悬浮 / Alt+W 切换时直接换回，
  // 不再需要「wrapper 占位 + 反查原 el」机制（那会让原节点离树、监听器失效）。
  renderedNodes?: ChildNode[];
  translatedText: string;
  status: 'idle' | 'pending' | 'translated' | 'error';
  showingOriginal: boolean;
  // 失败时间戳（performance.now()），仅 status === 'error' 时写入；
  // 用于 IntersectionObserver 再次进入视口时判断是否已过重试阈值
  errorAt?: number;
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
  displayStyle: DisplayStyle;
  translationLoadingTheme: TranslationLoadingTheme;
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

// ─── 自动重试预算 ──────────────────────────────────────────────────────
//
// 失败段落的自动重试次数上限（上限常量与判定函数在 observer.ts，与
// `shouldRetryError` 的时间阈值组合使用）。计数用 WeakMap 保存而不是只放
// `ElementState.retryCount`：观察者在重试前会删除 elementMap 条目（否则
// 翻译流程会因「已存在条目」而跳过），计数必须跨这次删除存活；
// WeakMap 不污染页面 DOM，节点离树即随 GC 回收，无泄漏。
//
// 计数只存在这个 WeakMap 里，不在 ElementState 上留镜像：镜像会让
// resetAllAutoRetryCounts() 失效（复评实测：WeakMap 归零后镜像仍停在 3，
// 取 max 判定为超限，手动重试永不生效）。
let autoRetryCounts: WeakMap<HTMLElement, number> = new WeakMap();

/** 该段落已消耗的自动重试次数（0 表示尚未自动重试过） */
export function getAutoRetryCount(el: HTMLElement): number {
  return autoRetryCounts.get(el) ?? 0;
}

/** 记录一次自动重试，返回累计次数 */
export function consumeAutoRetry(el: HTMLElement): number {
  const next = getAutoRetryCount(el) + 1;
  autoRetryCounts.set(el, next);
  return next;
}

/** 单段落清零（翻译成功时调用：SPA 虚拟列表会复用同一节点承载新段落） */
export function resetAutoRetryCount(el: HTMLElement): void {
  autoRetryCounts.delete(el);
}

/**
 * 全局清零：仅在用户手动重新开启一轮翻译时调用（Alt+W / popup「翻译此页」→
 * startTranslation）。这是「手动触发重置计数」路径，让用户始终可以手动重试。
 */
export function resetAllAutoRetryCounts(): void {
  autoRetryCounts = new WeakMap();
}

// ─── State ──────────────────────────────────────────────────────────────

export const state: GlobalState = {
  isActive: false,
  displayStyle: 'original',
  translationLoadingTheme: 'indigo',
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

export function applySettingsToState(s: GlobalSettings): void {
  // 1. Locate active service
  const activeService = s.services.find(service => service.id === s.selectedServiceId) || s.services[0];
  
  // 2. Resolve cascading displayStyle
  let resolvedStyle: DisplayStyle = 'original';
  if (activeService) {
    if (s.overrideDisplayStyleEnabled) {
      resolvedStyle = s.customDisplayStyle;
    } else {
      const serviceStyle = activeService.defaultDisplayStyle;
      resolvedStyle = serviceStyle === 'personal_default' ? s.displayStyle : serviceStyle;
    }
  } else {
    resolvedStyle = s.displayStyle;
  }
  
  state.displayStyle = resolvedStyle;
  state.translationLoadingTheme = s.translationLoadingTheme;
  state.nativeLanguage = s.nativeLanguage;
  state.targetLang = s.nativeLanguage;
  state.aggregate = {
    aggregateEnabled: s.aggregateEnabled,
    maxParagraphsPerRequest: s.maxParagraphsPerRequest,
    maxTextLengthPerRequest: s.maxTextLengthPerRequest,
    maxConcurrentRequests: s.maxConcurrentRequests,
    requestTimeout: s.requestTimeout,
  };
}

