import { defineContentScript } from 'wxt/utils/define-content-script';
import type { LangCode, TranslationStyle, TranslationResponse } from '@/types';
import { shouldSkipTranslation } from '@/lib/lang-detect';
import { collectBlocks, isTranslatableBlock, BLOCK_SELECTOR } from '@/lib/block-detect';
import { encodeInline, decodeInline } from '@/lib/inline-placeholder';
import { encodeBatch, decodeBatch } from '@/lib/batch-protocol';
import { sendBgMessage } from '@/lib/messaging';
import './styles.css';

// ─── Types ──────────────────────────────────────────────────────────────

interface ElementState {
  originalHTML: string;
  translatedText: string;
  status: 'idle' | 'pending' | 'translated' | 'error';
  cloneEl?: HTMLElement;
}

interface AggregateSettings {
  aggregateEnabled: boolean;
  maxParagraphsPerRequest: number;
  maxTextLengthPerRequest: number;
  maxConcurrentRequests: number;
  requestTimeout: number;
}

interface GlobalState {
  isActive: boolean;
  style: TranslationStyle;
  nativeLanguage: LangCode;
  targetLang: LangCode;
  observer: IntersectionObserver | null;
  elementMap: Map<HTMLElement, ElementState>;
  aggregate: AggregateSettings;
  pendingAggregateElements: Set<HTMLElement>;
  aggregateDebounceTimer: number | null;
}

// ─── State ──────────────────────────────────────────────────────────────

// 译文 wrapper → 原始 el 反查表。用于 Ctrl 切换恢复时从 wrapper 反查原 el；
// 同时是「原 el 离开 DOM 后仍可触达」的存储锚点。原 el 节点本身保存在
// `state.elementMap`（通过 ElementState）；DOM 树里只剩 wrapper 占据槽位。
const wrapperToOriginal: WeakMap<HTMLElement, HTMLElement> = new WeakMap();

// MutationObserver 节流批处理：模块级保存（不放进 state，避免 restoreAll 误清）。
// 节点离场清理路径仍实时执行；新增路径入队后由 flush 批处理。
let mutationFlushTimer: number | null = null;
const pendingMutationNodes: Set<HTMLElement> = new Set();
const MUTATION_FLUSH_DELAY_MS = 200;

const state: GlobalState = {
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
};

// ─── Utilities ──────────────────────────────────────────────────────────

function isValidPage(): boolean {
  const url = location.href;
  return !url.startsWith('chrome://') && !url.startsWith('chrome-extension://') && !url.startsWith('devtools://');
}

function getTranslatableElements(root: ParentNode = document): HTMLElement[] {
  return collectBlocks(root);
}

// ─── Style Application ──────────────────────────────────────────────────

function cloneAsWrapper(el: HTMLElement): HTMLElement {
  const wrapper = el.cloneNode(false) as HTMLElement;
  // 避免 id 冲突导致 document.getElementById / 锚点跳转异常
  if (wrapper.id) wrapper.removeAttribute('id');
  return wrapper;
}

// 块级标签集合：用于 bilingual 选择 block / inline 展示形式。
// 直接按 tagName 判定而非 getComputedStyle，避免站点 display 被 inline 化（如
// Tailwind `block` reset、各种 normalize）后误判，也免去同步 reflow 成本。
const BLOCK_TAGS = new Set([
  'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'DIV', 'ARTICLE', 'SECTION', 'FIGCAPTION',
  'DT', 'DD', 'CAPTION', 'TD', 'TH',
]);

function isBlockElement(el: HTMLElement): boolean {
  return BLOCK_TAGS.has(el.tagName);
}

// original / clean 模式：让译文 wrapper 通过 `replaceWith` 直接接管原 el
// 在 DOM 中的槽位，原 el 节点离开 DOM 树（仅保存在 elementMap 中作为存储）。
// 这样 wrapper 拥有与原 el 完全一致的兄弟位置，所有 `:nth-child` /
// `:not(:first-child)` / 相邻兄弟选择器对译文与原文的判定一致，避免站点
// CSS（如 markdown 渲染常见的「首段无 margin-top」）在译文上失效。
function applyOriginalStyle(el: HTMLElement, translatedText: string, fragments: DocumentFragment[]): void {
  const originalHTML = el.innerHTML;
  const wrapper = cloneAsWrapper(el);
  wrapper.appendChild(decodeInline(translatedText, fragments));
  wrapper.classList.add('translator-ext-wrapper');
  wrapper.setAttribute('data-translator-clone', 'true');
  wrapper.setAttribute('data-translator-processed', 'true');

  wrapperToOriginal.set(wrapper, el);
  el.replaceWith(wrapper);

  state.elementMap.set(el, { originalHTML, translatedText, status: 'translated', cloneEl: wrapper });
}

function applyCleanStyle(el: HTMLElement, translatedText: string, fragments: DocumentFragment[]): void {
  const originalHTML = el.innerHTML;
  const wrapper = cloneAsWrapper(el);
  wrapper.appendChild(decodeInline(translatedText, fragments));
  wrapper.classList.add('translator-ext-wrapper');
  wrapper.setAttribute('data-translator-clone', 'true');

  wrapperToOriginal.set(wrapper, el);
  el.replaceWith(wrapper);

  state.elementMap.set(el, { originalHTML, translatedText, status: 'translated', cloneEl: wrapper });
}

function applyBilingualStyle(el: HTMLElement, translatedText: string, fragments: DocumentFragment[]): void {
  const originalHTML = el.innerHTML;
  const br = document.createElement('br');
  br.setAttribute('data-translator-br', 'true');

  const span = document.createElement('span');
  span.classList.add('translator-ext-wrapper');
  span.setAttribute('data-translator-bilingual', 'true');
  span.dataset.display = isBlockElement(el) ? 'block' : 'inline';
  span.appendChild(decodeInline(translatedText, fragments));

  el.appendChild(br);
  el.appendChild(span);
  el.setAttribute('data-translator-processed', 'true');

  state.elementMap.set(el, { originalHTML, translatedText, status: 'translated' });
}

function applyUnderlineStyle(el: HTMLElement, translatedText: string, fragments: DocumentFragment[]): void {
  const originalHTML = el.innerHTML;
  const originalText = el.textContent?.trim() ?? '';

  const wrapper = document.createElement('span');
  wrapper.classList.add('translator-ext-wrapper');
  wrapper.setAttribute('data-translator-underline', 'true');
  wrapper.title = originalText;
  wrapper.appendChild(decodeInline(translatedText, fragments));

  el.innerHTML = '';
  el.appendChild(wrapper);
  el.setAttribute('data-translator-processed', 'true');

  state.elementMap.set(el, { originalHTML, translatedText, status: 'translated' });
}

function applyTranslation(el: HTMLElement, translatedText: string, fragments: DocumentFragment[]): void {
  if (state.elementMap.has(el)) return;

  switch (state.style) {
    case 'original':
      applyOriginalStyle(el, translatedText, fragments);
      break;
    case 'clean':
      applyCleanStyle(el, translatedText, fragments);
      break;
    case 'bilingual':
      applyBilingualStyle(el, translatedText, fragments);
      break;
    case 'underline':
      applyUnderlineStyle(el, translatedText, fragments);
      break;
  }
}

function restoreElement(el: HTMLElement): void {
  const elState = state.elementMap.get(el);
  if (!elState) return;

  switch (state.style) {
    case 'original':
    case 'clean': {
      const wrapper = elState.cloneEl;
      if (wrapper && wrapper.parentNode) {
        wrapper.replaceWith(el);
        wrapperToOriginal.delete(wrapper);
      }
      break;
    }
    case 'bilingual': {
      el.innerHTML = elState.originalHTML;
      el.removeAttribute('data-translator-processed');
      break;
    }
    case 'underline': {
      el.innerHTML = elState.originalHTML;
      el.removeAttribute('data-translator-processed');
      break;
    }
  }

  state.elementMap.delete(el);
}

function restoreAll(): void {
  // restoreElement 在循环中会修改 elementMap，先快照 keys 避免迭代中变更。
  const keys = Array.from(state.elementMap.keys());
  for (const el of keys) restoreElement(el);
  // restoreElement 已逐个 delete；最终 clear 是冗余但无副作用，作防御保留。
  state.elementMap.clear();
}

// 节点（或其子树）离开 DOM 时主动从 elementMap 清理对应 entry。
// elementMap 强引用 HTMLElement，缺少这条主动回收路径时长会话单 Tab 会持续累积。
//
// 关键约束：
//   - bilingual / underline 模式：elementMap 的 key 是原 el，仍在 DOM 树内；
//     站点移除节点时 removedNodes 直接包含 key，命中 `inByKey` 路径。
//   - original / clean 模式：key（原 el）已离开 DOM，DOM 槽位由 cloneEl(wrapper) 占据。
//     站点移除的 root 包含的是 wrapper 而非原 el，必须额外检查 `cloneEl`。
//
// 在 detached subtree 上 `Node.contains` 仍正确判定父子关系。
function cleanupRemovedSubtree(root: HTMLElement): void {
  const victims: HTMLElement[] = [];
  state.elementMap.forEach((entry, key) => {
    const inByKey = key === root || root.contains(key);
    const inByClone =
      entry.cloneEl !== undefined &&
      (entry.cloneEl === root || root.contains(entry.cloneEl));
    if (inByKey || inByClone) victims.push(key);
  });
  for (const el of victims) {
    state.elementMap.delete(el);
    state.observer?.unobserve(el);
    state.pendingAggregateElements.delete(el);
  }
}

// ─── Translation Logic ──────────────────────────────────────────────────

async function translateSingleElement(el: HTMLElement, force = false): Promise<void> {
  if (!force && state.elementMap.has(el)) return;
  if (el.hasAttribute('data-translator-pending')) return;

  const rawText = el.textContent?.trim();
  if (!rawText || rawText.length < 5) return;

  const { placeholderText, fragments } = encodeInline(el);
  if (!placeholderText) return;

  el.setAttribute('data-translator-pending', 'true');

  try {
    const detectResult = await sendBgMessage<{ lang: string | null }>({
      type: 'DETECT_LANG',
      payload: { text: rawText },
    });
    const detectedLang = detectResult.lang;

    if (detectedLang && shouldSkipTranslation(detectedLang, state.nativeLanguage)) {
      el.removeAttribute('data-translator-pending');
      return;
    }

    const result = await sendBgMessage<TranslationResponse>({
      type: 'TRANSLATE',
      payload: {
        text: placeholderText,
        sourceLang: detectedLang || undefined,
        targetLang: state.targetLang,
      },
    });

    el.removeAttribute('data-translator-pending');
    applyTranslation(el, result.text, fragments);
  } catch (error) {
    console.error('Translation failed:', error);
    el.removeAttribute('data-translator-pending');
    state.elementMap.set(el, {
      originalHTML: el.innerHTML,
      translatedText: '',
      status: 'error',
    });
  }
}

// ─── Aggregate Translation ──────────────────────────────────────────────

function createBatches(elements: HTMLElement[]): HTMLElement[][] {
  const batches: HTMLElement[][] = [];
  let currentBatch: HTMLElement[] = [];
  let currentLength = 0;

  for (const el of elements) {
    const text = el.textContent?.trim() || '';
    if (!text) continue;

    const wouldExceedParagraphs = currentBatch.length >= state.aggregate.maxParagraphsPerRequest;
    const wouldExceedLength = currentLength + text.length > state.aggregate.maxTextLengthPerRequest;

    if (wouldExceedParagraphs || wouldExceedLength) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }
      currentBatch = [el];
      currentLength = text.length;
    } else {
      currentBatch.push(el);
      currentLength += text.length;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

async function translateBatchWithFallback(batch: HTMLElement[]): Promise<void> {
  const placeholderTexts: string[] = [];
  const fragmentsList: DocumentFragment[][] = [];
  const validElements: HTMLElement[] = [];

  for (const el of batch) {
    const rawText = el.textContent?.trim();
    if (!rawText || rawText.length < 5) continue;
    const encoded = encodeInline(el);
    if (!encoded.placeholderText) continue;
    placeholderTexts.push(encoded.placeholderText);
    fragmentsList.push(encoded.fragments);
    validElements.push(el);
  }

  if (validElements.length === 0) return;

  const expected = validElements.length;
  validElements.forEach(el => el.setAttribute('data-translator-pending', 'true'));

  const clearPending = () => {
    validElements.forEach(el => el.removeAttribute('data-translator-pending'));
  };

  const fullFallback = async () => {
    clearPending();
    const tasks = validElements.map(el => () => translateSingleElement(el, true));
    await limitConcurrency(tasks, state.aggregate.maxConcurrentRequests);
  };

  try {
    const combinedText = encodeBatch(
      placeholderTexts.map((text, idx) => ({ id: idx + 1, text }))
    );

    const result = await sendBgMessage<TranslationResponse>({
      type: 'TRANSLATE',
      payload: {
        text: combinedText,
        targetLang: state.targetLang,
        isAggregate: true,
      },
    });

    const { translations, missing, duplicated } = decodeBatch(result.text, expected);

    const protocolFailed =
      translations.size === 0 || missing.length >= Math.ceil(expected / 2);

    if (protocolFailed) {
      console.warn('Batch protocol failed, full fallback', {
        expected,
        got: translations.size,
        missing,
        duplicated,
      });
      await fullFallback();
      return;
    }

    if (missing.length > 0 || duplicated.length > 0) {
      console.warn('Batch protocol partial mismatch, retrying missing only', {
        expected,
        missing,
        duplicated,
      });
    }

    const retryElements: HTMLElement[] = [];
    validElements.forEach((el, index) => {
      el.removeAttribute('data-translator-pending');
      const translated = translations.get(index + 1);
      if (translated) {
        applyTranslation(el, translated, fragmentsList[index]);
      } else {
        retryElements.push(el);
      }
    });

    if (retryElements.length > 0) {
      const tasks = retryElements.map(el => () => translateSingleElement(el, true));
      await limitConcurrency(tasks, state.aggregate.maxConcurrentRequests);
    }
  } catch (error) {
    console.warn('Aggregate translation failed, falling back to single:', error);
    await fullFallback();
  }
}

async function limitConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: (T | undefined)[] = new Array(tasks.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = await tasks[i]();
      } catch (error) {
        // Individual task errors should be handled inside the task
        console.error('Task error:', error);
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results as T[];
}

async function flushAggregateQueue(): Promise<void> {
  if (state.pendingAggregateElements.size === 0) return;

  const elements = Array.from(state.pendingAggregateElements);
  state.pendingAggregateElements.clear();

  // Filter out already translated or pending elements
  const eligible = elements.filter(el => {
    if (state.elementMap.has(el)) return false;
    if (el.hasAttribute('data-translator-pending')) return false;
    return true;
  });

  if (eligible.length === 0) return;

  const batches = createBatches(eligible);
  const tasks = batches.map(batch => () => translateBatchWithFallback(batch));

  await limitConcurrency(tasks, state.aggregate.maxConcurrentRequests);
}

function scheduleAggregateFlush(): void {
  if (state.aggregateDebounceTimer) {
    window.clearTimeout(state.aggregateDebounceTimer);
  }
  state.aggregateDebounceTimer = window.setTimeout(() => {
    state.aggregateDebounceTimer = null;
    flushAggregateQueue();
  }, 300);
}

// ─── Intersection Observer ──────────────────────────────────────────────

function createObserver(): IntersectionObserver {
  const pending = new Set<HTMLElement>();

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target as HTMLElement;
      if (!entry.isIntersecting) {
        pending.delete(el);
        return;
      }
      if (pending.has(el)) return;
      if (state.elementMap.has(el)) return;

      if (state.aggregate.aggregateEnabled) {
        state.pendingAggregateElements.add(el);
        scheduleAggregateFlush();
      } else {
        pending.add(el);
        window.setTimeout(() => {
          pending.delete(el);
          if (state.elementMap.has(el)) return;
          const rect = el.getBoundingClientRect();
          const visible = rect.top < window.innerHeight && rect.bottom > 0;
          if (visible) {
            translateSingleElement(el);
          }
        }, 200);
      }
    });
  }, { threshold: 0, rootMargin: '100px' });
}

function startTranslation(): void {
  if (!isValidPage()) return;

  const elements = getTranslatableElements();
  if (!state.observer) {
    state.observer = createObserver();
  }

  elements.forEach((el) => {
    state.observer!.observe(el);
  });

  // If aggregate is enabled, also immediately flush any elements already in viewport
  if (state.aggregate.aggregateEnabled) {
    const visibleElements = elements.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    visibleElements.forEach(el => state.pendingAggregateElements.add(el));
    scheduleAggregateFlush();
  }
}

function stopTranslation(): void {
  state.observer?.disconnect();
  state.observer = null;
  restoreAll();
  state.pendingAggregateElements.clear();
  if (state.aggregateDebounceTimer !== null) {
    window.clearTimeout(state.aggregateDebounceTimer);
    state.aggregateDebounceTimer = null;
  }
  pendingMutationNodes.clear();
  if (mutationFlushTimer !== null) {
    window.clearTimeout(mutationFlushTimer);
    mutationFlushTimer = null;
  }
}

// ─── Input Box Translation ──────────────────────────────────────────────

let spaceCount = 0;
let inputDebounceTimer: number | null = null;

async function translateInput(el: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
  const text = el.value.trim();
  if (!text || text.length < 2) return;

  try {
    const detectResult = await sendBgMessage<{ lang: string | null }>({
      type: 'DETECT_LANG',
      payload: { text },
    });
    const detectedLang = detectResult.lang;

    if (detectedLang && shouldSkipTranslation(detectedLang, state.nativeLanguage)) {
      return;
    }

    const result = await sendBgMessage<TranslationResponse>({
      type: 'TRANSLATE',
      payload: {
        text,
        sourceLang: detectedLang || undefined,
        targetLang: state.targetLang,
      },
    });

    el.value = result.text;
  } catch (error) {
    console.error('Input translation failed:', error);
  }
}

function setupInputListeners(): void {
  document.addEventListener('keydown', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (e.key === ' ') {
      spaceCount++;
      if (spaceCount >= 3) {
        spaceCount = 0;
        if (inputDebounceTimer) window.clearTimeout(inputDebounceTimer);
        inputDebounceTimer = window.setTimeout(() => {
          translateInput(target);
        }, 300);
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      spaceCount = 0;
    }
  });
}

// ─── Ctrl+Hover Translation ─────────────────────────────────────────────
// 设计：按住 Ctrl 悬停可翻译段落 → 段落出现高亮，停留 200ms 后触发翻译。
// 不要求先按快捷键启用整页翻译；首次触发时按需懒加载用户设置（母语/样式/聚合参数）。
//
// 触发时机覆盖两种姿势：
// 1. 先按 Ctrl，再移动到段落 → 由 `mouseover`（带 ctrlKey=true）触发；
// 2. 先悬停在段落，再按下 Ctrl → 由 `keydown('Control')` 配合 mousemove
//    记录的最近坐标 + `document.elementFromPoint` 触发。
// 仅靠 `mouseover` 会漏掉姿势 2，因为按键不会重发 mouseover。

const HOVER_HIGHLIGHT_ATTR = 'data-translator-hover-target';
const HOVER_DEBOUNCE_MS = 200;
// 高亮命中段落到清除的最小总时长。即使翻译瞬间完成，也保证用户至少看到
// 0.25s 的视觉反馈，避免「按 Ctrl 后高亮一闪而过」的体验割裂。
const HOVER_MIN_VISIBLE_MS = 250;

let ctrlHoverSettingsLoaded = false;
let hoverTarget: HTMLElement | null = null;
let hoverTimer: number | null = null;
let lastMouseX = -1;
let lastMouseY = -1;
// 屏蔽 keydown 在按住期间的 auto-repeat：仅在「松开后再次按下」时
// 视作一次新的"按 Ctrl"事件，避免按住期间不停 toggle。
let ctrlPressed = false;

async function ensureCtrlHoverSettings(): Promise<void> {
  if (ctrlHoverSettingsLoaded || state.isActive) return;
  try {
    const { getSettings } = await import('@/lib/storage');
    const s = await getSettings();
    state.style = s.defaultStyle;
    state.nativeLanguage = s.nativeLanguage;
    state.targetLang = s.nativeLanguage;
    state.aggregate = {
      aggregateEnabled: s.aggregateEnabled,
      maxParagraphsPerRequest: s.maxParagraphsPerRequest,
      maxTextLengthPerRequest: s.maxTextLengthPerRequest,
      maxConcurrentRequests: s.maxConcurrentRequests,
      requestTimeout: s.requestTimeout,
    };
    ctrlHoverSettingsLoaded = true;
  } catch (error) {
    console.error('Failed to load settings for Ctrl+hover:', error);
  }
}

function findNearestTranslatableBlock(el: HTMLElement | null): HTMLElement | null {
  let cur: HTMLElement | null = el;
  while (cur) {
    if (cur.matches?.(BLOCK_SELECTOR) && isTranslatableBlock(cur)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

// 沿祖先链寻找已翻译的「逻辑段落 el」：
// - original / clean 模式：原 el 已离开 DOM，鼠标命中的是带 `[data-translator-clone]`
//   的 wrapper，通过 wrapperToOriginal 反查；
// - bilingual / underline 模式：原 el 仍在 DOM，且作为 `state.elementMap` 的 key，
//   直接命中即可（hover 目标可能是注入的 span/br 子节点）。
function findToggleTarget(target: HTMLElement | null): HTMLElement | null {
  let cur: HTMLElement | null = target;
  while (cur) {
    if (cur.dataset?.translatorClone === 'true') {
      return wrapperToOriginal.get(cur) ?? null;
    }
    if (state.elementMap.has(cur)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

// 命中已翻译目标时同步恢复原文，返回是否已处理。
function tryToggleRestore(target: HTMLElement | null): boolean {
  const toggleEl = findToggleTarget(target);
  if (!toggleEl || !state.elementMap.has(toggleEl)) return false;
  // 若当前 hover 候选恰好是要恢复的目标，先清掉防抖阶段的高亮 / 计时器，
  // 避免恢复后残留 `[data-translator-hover-target]` 样式或后续误触发翻译。
  if (hoverTarget === toggleEl) cancelHoverDebounce();
  restoreElement(toggleEl);
  return true;
}

// 仅取消「防抖阶段」的高亮和计时器（hoverTimer != null 时）。
// 一旦计时器回调已 fire 进入翻译阶段（hoverTimer == null），不再做任何清理：
// 高亮与 hoverTarget 的清除完全交由翻译完成回调的 finally 分支接管，确保
// 「Ctrl 短按即松开」也能完成翻译，且翻译期间高亮不会被 keyup / mouseout 中断。
function cancelHoverDebounce(): void {
  if (hoverTimer === null) return;
  if (hoverTarget) {
    hoverTarget.removeAttribute(HOVER_HIGHLIGHT_ATTR);
    hoverTarget = null;
  }
  window.clearTimeout(hoverTimer);
  hoverTimer = null;
}

function tryStartHoverFor(target: HTMLElement | null): void {
  if (!target) return;
  const paragraph = findNearestTranslatableBlock(target);
  if (!paragraph) {
    cancelHoverDebounce();
    return;
  }
  if (state.elementMap.has(paragraph)) return;
  if (paragraph.hasAttribute('data-translator-pending')) return;
  if (hoverTarget === paragraph) return;

  // 切换段落时把旧候选的高亮 / 计时清掉。这里不复用 cancelHoverDebounce
  // 是因为旧 hoverTarget 可能正处于翻译阶段（hoverTimer 已为 null），
  // 但用户的鼠标已切到新段落，应让旧候选脱离 hover 状态机。
  // 翻译完成 finally 是幂等的（removeAttribute + 比较 hoverTarget 再清空）。
  if (hoverTarget) hoverTarget.removeAttribute(HOVER_HIGHLIGHT_ATTR);
  if (hoverTimer !== null) window.clearTimeout(hoverTimer);

  hoverTarget = paragraph;
  paragraph.setAttribute(HOVER_HIGHLIGHT_ATTR, 'true');
  const startedAt = performance.now();

  hoverTimer = window.setTimeout(async () => {
    hoverTimer = null;
    if (hoverTarget !== paragraph) return;
    if (state.elementMap.has(paragraph) || paragraph.hasAttribute('data-translator-pending')) {
      paragraph.removeAttribute(HOVER_HIGHLIGHT_ATTR);
      if (hoverTarget === paragraph) hoverTarget = null;
      return;
    }
    // 进入翻译阶段：保持 hoverTarget=paragraph 与高亮 attribute；cancelHoverDebounce
    // 此时短路（hoverTimer === null），mouseout / keyup / blur 都不会清掉高亮。
    try {
      await ensureCtrlHoverSettings();
      await translateSingleElement(paragraph, true);
    } finally {
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, HOVER_MIN_VISIBLE_MS - elapsed);
      if (wait > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, wait));
      }
      // bilingual / underline 模式：paragraph 仍在 DOM，直接清掉自身属性。
      paragraph.removeAttribute(HOVER_HIGHLIGHT_ATTR);
      // original / clean 模式：paragraph 已离开 DOM，但 cloneAsWrapper 通过
      // cloneNode(false) 把高亮 attribute 复制到了 wrapper 上，需要主动从
      // wrapper 移除——否则高亮永久残留在 DOM 中（因为 paragraph 上的
      // removeAttribute 作用在已脱离的节点上、对 wrapper 无效）。
      const wrapper = state.elementMap.get(paragraph)?.cloneEl;
      wrapper?.removeAttribute(HOVER_HIGHLIGHT_ATTR);
      if (hoverTarget === paragraph) hoverTarget = null;
    }
  }, HOVER_DEBOUNCE_MS);
}

function setupCtrlHover(): void {
  // 仅记录鼠标坐标，供 keydown 路径用 elementFromPoint 反查当前 hover 目标
  document.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }, { passive: true });

  document.addEventListener('mouseover', (e) => {
    if (!e.ctrlKey) return;
    tryStartHoverFor(e.target as HTMLElement);
  });

  // 用户先悬停后按 Ctrl 的姿势：mouseover 不会再次触发，需要 keydown 兜底。
  // 同时承担「再按 Ctrl 恢复原文」的 toggle 入口：
  //   1. 用 `ctrlPressed` 屏蔽 auto-repeat，确保「松开后再次按下」才视作一次按键；
  //   2. 命中已翻译段落（wrapper 或原 el）→ 同步恢复原文，不进入翻译路径；
  //   3. 否则走原有翻译路径（elementFromPoint + tryStartHoverFor）。
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Control') return;
    if (ctrlPressed || e.repeat) return;
    ctrlPressed = true;
    if (lastMouseX < 0 || lastMouseY < 0) return;
    const el = document.elementFromPoint(lastMouseX, lastMouseY) as HTMLElement | null;
    if (tryToggleRestore(el)) return;
    tryStartHoverFor(el);
  });

  // mouseout 仅在防抖阶段（hoverTimer != null）取消高亮 + 计时；翻译已 fire
  // 后保持高亮直到翻译完成（cancelHoverDebounce 内部短路）。
  document.addEventListener('mouseout', (e) => {
    if (!hoverTarget) return;
    const related = e.relatedTarget as Node | null;
    if (related && hoverTarget.contains(related)) return;
    cancelHoverDebounce();
  });

  // 仅复位按键状态机；不取消防抖也不清高亮。
  // 这样「Ctrl 短按即松开」也能完成 200ms 防抖触发的翻译，且翻译期间
  // 高亮不会被松键中断，与「再按 Ctrl 恢复」的 toggle 语义协调。
  document.addEventListener('keyup', (e) => {
    if (e.key !== 'Control') return;
    ctrlPressed = false;
  });

  // 窗口失焦视作用户主动离开，仍走防抖期取消逻辑。
  window.addEventListener('blur', () => {
    ctrlPressed = false;
    cancelHoverDebounce();
  });
}

// ─── SPA Route Change Detection ─────────────────────────────────────────

function handleRouteChange(): void {
  if (state.isActive) {
    stopTranslation();
    window.setTimeout(() => {
      if (state.isActive) {
        startTranslation();
      }
    }, 500);
  }
}

function setupSPADetection(): void {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    window.dispatchEvent(new Event('translator-pushstate'));
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event('translator-replacestate'));
  };

  window.addEventListener('popstate', handleRouteChange);
  window.addEventListener('translator-pushstate', handleRouteChange);
  window.addEventListener('translator-replacestate', handleRouteChange);
}

// ─── Mutation Observer for Dynamic Content ──────────────────────────────

function scheduleMutationFlush(): void {
  if (mutationFlushTimer !== null) return;
  mutationFlushTimer = window.setTimeout(() => {
    mutationFlushTimer = null;
    flushMutationQueue();
  }, MUTATION_FLUSH_DELAY_MS);
}

function flushMutationQueue(): void {
  if (!state.isActive || !state.observer) {
    pendingMutationNodes.clear();
    return;
  }
  const nodes = Array.from(pendingMutationNodes);
  pendingMutationNodes.clear();

  // 祖先去重：若 A 包含 B 且都在集合里，仅扫描 A。
  // 复杂度 O(n²)，单次 flush 节点数实测 < 500，可接受；
  // 若日后量级超出，改为按 DOM 深度排序 + Set 标记。
  const roots = nodes.filter(
    (n) => !nodes.some((m) => m !== n && m.contains(n))
  );

  const newElements: HTMLElement[] = [];
  for (const root of roots) {
    if (!root.isConnected) continue;
    newElements.push(...getTranslatableElements(root));
  }
  for (const el of newElements) {
    if (!state.elementMap.has(el)) {
      state.observer.observe(el);
    }
  }
}

function setupMutationObserver(): void {
  const mutationObserver = new MutationObserver((mutations) => {
    if (!state.isActive || !state.observer) return;

    // 移除路径：实时执行（GC 不能等节流，泄漏窗口越短越好）。
    for (const m of mutations) {
      m.removedNodes.forEach((node) => {
        if (node instanceof HTMLElement) cleanupRemovedSubtree(node);
      });
    }

    // 添加路径：仅入队 + 调度 flush，避免对每条 mutation 同步跑
    // querySelectorAll(BLOCK_SELECTOR) + getComputedStyle 兜底。
    let added = false;
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.isConnected) {
          pendingMutationNodes.add(node);
          added = true;
        }
      });
    }
    if (added) scheduleMutationFlush();
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

// ─── Toggle Handler ─────────────────────────────────────────────────────

async function toggleTranslation(): Promise<void> {
  if (state.isActive) {
    state.isActive = false;
    stopTranslation();
  } else {
    try {
      await sendBgMessage({ type: 'PING' }).catch(() => null);

      const { getSettings } = await import('@/lib/storage');
      const s = await getSettings();

      state.style = s.defaultStyle;
      state.nativeLanguage = s.nativeLanguage;
      state.targetLang = s.nativeLanguage;
      state.aggregate = {
        aggregateEnabled: s.aggregateEnabled,
        maxParagraphsPerRequest: s.maxParagraphsPerRequest,
        maxTextLengthPerRequest: s.maxTextLengthPerRequest,
        maxConcurrentRequests: s.maxConcurrentRequests,
        requestTimeout: s.requestTimeout,
      };
      state.isActive = true;

      startTranslation();
    } catch (error) {
      console.error('Failed to start translation:', error);
    }
  }
}

// ─── Main Entrypoint ────────────────────────────────────────────────────

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    if (!isValidPage()) return;

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOGGLE_TRANSLATION') {
        toggleTranslation();
      }
    });

    setupInputListeners();
    setupCtrlHover();
    setupSPADetection();
    setupMutationObserver();

    console.log('Translator content script loaded');
  },
});
