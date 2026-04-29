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
  showingOriginal: boolean;
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
const wrapperToOriginal: WeakMap<HTMLElement, HTMLElement> = new WeakMap();

// MutationObserver 节流批处理：模块级保存（不放进 state，避免 restoreAll 误清）。
// 节点离场清理路径仍实时执行；新增路径入队后由 flush 批处理。
let mutationFlushTimer: number | null = null;
const pendingMutationNodes: Set<HTMLElement> = new Set();
const MUTATION_FLUSH_DELAY_MS = 200;

// WeakSet：标记「由扩展自身 replaceWith 导致的 DOM 移除」，防止 MutationObserver
// 误把翻译/还原/切换操作当成站点移除节点而清理 elementMap。
const mutationIgnoredNodes = new WeakSet<HTMLElement>();

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
  displayMode: 'translation',
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
  mutationIgnoredNodes.add(el);
  el.replaceWith(wrapper);

  state.elementMap.set(el, { originalHTML, translatedText, status: 'translated', cloneEl: wrapper, showingOriginal: false });
}

function applyCleanStyle(el: HTMLElement, translatedText: string, fragments: DocumentFragment[]): void {
  const originalHTML = el.innerHTML;
  const wrapper = cloneAsWrapper(el);
  wrapper.appendChild(decodeInline(translatedText, fragments));
  wrapper.classList.add('translator-ext-wrapper');
  wrapper.setAttribute('data-translator-clone', 'true');

  wrapperToOriginal.set(wrapper, el);
  mutationIgnoredNodes.add(el);
  el.replaceWith(wrapper);

  state.elementMap.set(el, { originalHTML, translatedText, status: 'translated', cloneEl: wrapper, showingOriginal: false });
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

  state.elementMap.set(el, { originalHTML, translatedText, status: 'translated', showingOriginal: false });
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

  state.elementMap.set(el, { originalHTML, translatedText, status: 'translated', cloneEl: wrapper, showingOriginal: false });
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

  // 若用户处于「全页显示原文」模式（Alt+W 切换过的），新翻译完成的段落
  // 也应立即同步切到原文显示，避免出现「滚动后部分段落是译文，整体却显示原文」的视觉错乱。
  if (state.displayMode === 'original') {
    toggleElementDisplay(el);
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
        mutationIgnoredNodes.add(wrapper);
        wrapper.replaceWith(el);
        wrapperToOriginal.delete(wrapper);
      } else if (elState.showingOriginal && !wrapper?.parentNode) {
        // showingOriginal: el 已在 DOM，wrapper 已脱离，无需操作
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

  el.removeAttribute('data-translator-error');
  state.elementMap.delete(el);
}

function toggleElementDisplay(el: HTMLElement): void {
  const elState = state.elementMap.get(el);
  if (!elState) return;

  const show = elState.showingOriginal;

  switch (state.style) {
    case 'original':
    case 'clean': {
      const wrapper = elState.cloneEl;
      if (!wrapper) break;
      if (show) {
        // 原文 → 译文：把 wrapper 放回 DOM
        mutationIgnoredNodes.add(el);
        el.replaceWith(wrapper);
      } else {
        // 译文 → 原文：把 el 放回 DOM
        mutationIgnoredNodes.add(wrapper);
        wrapper.replaceWith(el);
      }
      break;
    }
    case 'bilingual': {
      const br = el.querySelector('[data-translator-br]') as HTMLElement | null;
      const biling = el.querySelector('[data-translator-bilingual]') as HTMLElement | null;
      if (show) {
        // 原文 → 译文：恢复可见
        if (br) br.style.display = '';
        if (biling) biling.style.display = '';
      } else {
        // 译文 → 原文：隐藏双语部分
        if (br) br.style.display = 'none';
        if (biling) biling.style.display = 'none';
      }
      break;
    }
    case 'underline': {
      const wrapper = elState.cloneEl;
      if (!wrapper) break;
      if (show) {
        // 原文 → 译文：恢复 underline wrapper
        el.innerHTML = '';
        el.appendChild(wrapper);
        el.setAttribute('data-translator-processed', 'true');
      } else {
        // 译文 → 原文：恢复原内容
        el.innerHTML = elState.originalHTML;
        el.removeAttribute('data-translator-processed');
      }
      break;
    }
  }

  elState.showingOriginal = !show;
}

function restoreAll(): void {
  const keys = Array.from(state.elementMap.keys());
  for (const el of keys) restoreElement(el);
  // restoreElement 已逐个 delete；最终 clear 是冗余但无副作用，作防御保留。
  state.elementMap.clear();
}

// 全页 toggle：把 elementMap 中所有「当前 showingOriginal 与目标态不一致」的段落
// 都切到目标态。成功翻译的段落（status === 'translated'）才有切换价值；
// 失败/pending 的段落跳过（其 cloneEl 可能不存在，toggleElementDisplay 会 break）。
function toggleAllDisplay(targetShowOriginal: boolean): void {
  state.elementMap.forEach((entry, el) => {
    if (entry.status !== 'translated') return;
    if (entry.showingOriginal === targetShowOriginal) return;
    toggleElementDisplay(el);
  });
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
    if (!inByKey && !inByClone) return;

    // 命中目标节点 → 检查是否是扩展自身 replaceWith 触发的：
    //   只在「真正命中本次 root」的条目上消耗 mutationIgnoredNodes 标记，
    //   避免一次 forEach 把所有 mark 都耗光，导致后续同一批 mutation 中
    //   其他 root 的 cleanup 因找不到 mark 而把对应 entry 误删。
    if (inByKey && mutationIgnoredNodes.has(key)) {
      mutationIgnoredNodes.delete(key);
      return;
    }
    if (inByClone && entry.cloneEl && mutationIgnoredNodes.has(entry.cloneEl)) {
      mutationIgnoredNodes.delete(entry.cloneEl);
      return;
    }
    victims.push(key);
  });
  for (const el of victims) {
    state.elementMap.delete(el);
    state.observer?.unobserve(el);
    state.pendingAggregateElements.delete(el);
  }
}

// ─── Translation Logic ──────────────────────────────────────────────────

async function translateSingleElement(el: HTMLElement, force = false, skipActiveCheck = false): Promise<void> {
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
    // 如果用户已在翻译完成前按快捷键关闭翻译，则不再应用结果
    // skipActiveCheck: Ctrl+Hover 独立翻译时 state.isActive 始终为 false，需跳过此检查
    if (!skipActiveCheck && !state.isActive) {
      return;
    }
    applyTranslation(el, result.text, fragments);
  } catch {
    el.removeAttribute('data-translator-pending');
    el.setAttribute('data-translator-error', 'true');
    state.elementMap.set(el, {
      originalHTML: el.innerHTML,
      translatedText: '',
      status: 'error',
      showingOriginal: false,
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

    const { translations, missing } = decodeBatch(result.text, expected);

    const protocolFailed =
      translations.size === 0 || missing.length >= Math.ceil(expected / 2);

    if (protocolFailed) {
      await fullFallback();
      return;
    }

    // 如果用户已在翻译完成前按快捷键关闭翻译，则不再应用结果
    if (!state.isActive) {
      clearPending();
      return;
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
  } catch {
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
      } catch {
        // Individual task errors should be handled inside the task
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
  } catch {
    // ignore
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

// 「本轮按 Ctrl 已 toggle 过的段落」——按住 Ctrl 期间，鼠标在同一段落内子元素
// 之间移动会持续触发 mouseover（每个子元素一次），若不去重就会反复 toggle，
// 用户感受是「按下没切换 / 切了又切回去」。
//
// 切换段落（移到段落 B）应允许新段落 toggle；松开 Ctrl 重置（下一次按 Ctrl
// 视作新一轮，可再次 toggle 同一段落）。
let lastCtrlToggledEl: HTMLElement | null = null;

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
  } catch {
    // ignore
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

// 命中已翻译目标时切换原文/译文显示，返回是否已「认定为命中」（无论是否真正切换）。
//
// 返回 true 即认为「这次 mouseover/keydown 命中了已翻译段落」，调用方据此跳过
// 后续 tryStartHoverFor。只有「跨段落」或「Ctrl 重新按下」时才真正执行 toggle，
// 同段落内的连续 mouseover 静默吞掉、不重复切换。
function tryToggleDisplay(target: HTMLElement | null): boolean {
  const toggleEl = findToggleTarget(target);
  if (!toggleEl || !state.elementMap.has(toggleEl)) return false;

  if (lastCtrlToggledEl === toggleEl) {
    return true;
  }

  if (hoverTarget === toggleEl) cancelHoverDebounce();
  toggleEl.removeAttribute(HOVER_HIGHLIGHT_ATTR);
  const cloneEl = state.elementMap.get(toggleEl)?.cloneEl;
  cloneEl?.removeAttribute(HOVER_HIGHLIGHT_ATTR);
  toggleElementDisplay(toggleEl);
  lastCtrlToggledEl = toggleEl;
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
      await translateSingleElement(paragraph, true, true);
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
    const target = e.target as HTMLElement;
    if (tryToggleDisplay(target)) return;
    tryStartHoverFor(target);
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
    if (tryToggleDisplay(el)) return;
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
    // 释放 Ctrl 视为「上一轮交互结束」：清空去重锚点，下次按下 Ctrl
    // 即使鼠标停留原段落也允许再次 toggle（再按 Ctrl 切回另一面）。
    lastCtrlToggledEl = null;
  });

  // 窗口失焦视作用户主动离开，仍走防抖期取消逻辑。
  window.addEventListener('blur', () => {
    ctrlPressed = false;
    lastCtrlToggledEl = null;
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

// Alt+W 状态机：
//   inactive                          → press → active + translation（启动翻译，显示译文）
//   active + translation              → press → active + original（全页 toggle 到原文，不停止 observer）
//   active + original                 → press → active + translation（全页 toggle 回译文）
// 目的：避免每次按 Alt+W 都重新请求 API；翻译结果保留在 elementMap，纯切换 DOM 显示。
async function toggleTranslation(): Promise<void> {
  if (state.isActive) {
    if (state.displayMode === 'translation') {
      state.displayMode = 'original';
      toggleAllDisplay(true);
    } else {
      state.displayMode = 'translation';
      toggleAllDisplay(false);
    }
    return;
  }

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
    state.displayMode = 'translation';

    startTranslation();
  } catch {
    // ignore
  }
}

// ─── Main Entrypoint ────────────────────────────────────────────────────

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    if (!isValidPage()) return;

    // Guard against double-injection (extension reload/update)
    if ((window as unknown as Record<string, unknown>).__translatorContentScriptLoaded) {
      return;
    }
    (window as unknown as Record<string, unknown>).__translatorContentScriptLoaded = true;

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOGGLE_TRANSLATION') {
        toggleTranslation();
      }
    });

    setupInputListeners();
    setupCtrlHover();
    setupSPADetection();
    setupMutationObserver();
  },
});
