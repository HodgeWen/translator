import type { ElementState } from './state';
import { state, wrapperToOriginal, mutationIgnoredNodes } from './state';
import type { InlineEncodedBlock } from '@/lib/inline-placeholder';
import { decodeInline } from '@/lib/inline-placeholder';
import type { TextNodeTemplate } from '@/lib/dom-text-replace';
import { applyTextNodeTranslations, getTextNodeTemplateText } from '@/lib/dom-text-replace';

export type TranslationRender =
  | ({ kind: 'inline'; translatedText: string } & InlineEncodedBlock)
  | {
      kind: 'textNodes';
      translatedText: string;
      template: TextNodeTemplate;
      translations: Map<number, string>;
    };

// ─── DOM Update Chunking Scheduler ──────────────────────────────────────
const domUpdateQueue: Array<() => void> = [];
let isUpdatingDOM = false;
const CHUNK_SIZE = 4; // 每帧最多处理的 DOM 更新数量

export function scheduleDOMUpdate(updateFn: () => void): void {
  domUpdateQueue.push(updateFn);
  if (!isUpdatingDOM) {
    isUpdatingDOM = true;
    requestAnimationFrame(processDOMUpdateQueue);
  }
}

function processDOMUpdateQueue(): void {
  const limit = Math.min(domUpdateQueue.length, CHUNK_SIZE);
  for (let i = 0; i < limit; i++) {
    const update = domUpdateQueue.shift();
    if (update) {
      try {
        update();
      } catch (err) {
        console.error('[Translator] DOM update failed:', err);
      }
    }
  }
  if (domUpdateQueue.length > 0) {
    requestAnimationFrame(processDOMUpdateQueue);
  } else {
    isUpdatingDOM = false;
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────

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

// ─── Style Application ──────────────────────────────────────────────────

// original / clean 模式：让译文 wrapper 通过 `replaceWith` 直接接管原 el
// 在 DOM 中的槽位，原 el 节点离开 DOM 树（仅保存在 elementMap 中作为存储）。
// 这样 wrapper 拥有与原 el 完全一致的兄弟位置，所有 `:nth-child` /
// `:not(:first-child)` / 相邻兄弟选择器对译文与原文的判定一致，避免站点
// CSS（如 markdown 渲染常见的「首段无 margin-top」）在译文上失效。
function applyReplaceStyle(el: HTMLElement, render: TranslationRender): void {
  const originalHTML = el.innerHTML;
  let wrapper: HTMLElement;
  let translatedText = render.translatedText;

  if (render.kind === 'textNodes') {
    applyTextNodeTranslations(render.template, render.translations);
    wrapper = render.template.wrapper;
    translatedText = getTextNodeTemplateText(render.template);
  } else {
    wrapper = cloneAsWrapper(el);
    wrapper.appendChild(decodeInline(render.translatedText, render.fragments, render.styleTemplates));
  }

  wrapper.setAttribute('data-translator-clone', 'true');
  wrapper.setAttribute('data-translator-processed', 'true');

  wrapperToOriginal.set(wrapper, el);
  mutationIgnoredNodes.add(el);
  el.replaceWith(wrapper);

  state.elementMap.set(el, { originalHTML, translatedText, status: 'translated', cloneEl: wrapper, showingOriginal: false });
}

function saveChildNodes(el: HTMLElement): DocumentFragment {
  const frag = document.createDocumentFragment();
  while (el.firstChild) frag.appendChild(el.firstChild);
  return frag;
}

function restoreChildNodes(el: HTMLElement, elState: ElementState): void {
  if (elState.originalNodes) {
    el.innerHTML = '';
    el.appendChild(elState.originalNodes);
  } else {
    el.innerHTML = elState.originalHTML;
  }
}

function applyBilingualStyle(el: HTMLElement, translatedText: string, fragments: DocumentFragment[], styleTemplates: Element[]): void {
  const originalHTML = el.innerHTML;
  const originalNodes = saveChildNodes(el);
  // Restore original content first, then append bilingual elements
  el.appendChild(originalNodes);
  const br = document.createElement('br');
  br.setAttribute('data-translator-br', 'true');

  const span = document.createElement('span');
  span.setAttribute('data-translator-bilingual', 'true');
  span.dataset.display = isBlockElement(el) ? 'block' : 'inline';
  span.appendChild(decodeInline(translatedText, fragments, styleTemplates));

  el.appendChild(br);
  el.appendChild(span);
  el.setAttribute('data-translator-processed', 'true');

  state.elementMap.set(el, { originalHTML, originalNodes, translatedText, status: 'translated', showingOriginal: false });
}

function applyUnderlineStyle(el: HTMLElement, translatedText: string, fragments: DocumentFragment[], styleTemplates: Element[]): void {
  const originalHTML = el.innerHTML;
  const originalText = el.textContent?.trim() ?? '';
  const originalNodes = saveChildNodes(el);

  const wrapper = document.createElement('span');
  wrapper.setAttribute('data-translator-underline', 'true');
  wrapper.title = originalText;
  wrapper.appendChild(decodeInline(translatedText, fragments, styleTemplates));

  el.appendChild(wrapper);
  el.setAttribute('data-translator-processed', 'true');

  state.elementMap.set(el, { originalHTML, originalNodes, translatedText, status: 'translated', cloneEl: wrapper, showingOriginal: false });
}

export function applyTranslation(el: HTMLElement, render: TranslationRender): void {
  if (state.elementMap.has(el)) return;

  // 同步占位，锁定元素，防止重入
  state.elementMap.set(el, {
    originalHTML: el.innerHTML,
    translatedText: render.translatedText,
    status: 'pending',
    showingOriginal: false,
  });

  scheduleDOMUpdate(() => {
    // 节点可能在异步调度的间隔中已经离开 DOM 树，这里做安全拦截
    if (!el.isConnected) {
      state.elementMap.delete(el);
      return;
    }

    // 清除翻译中状态
    el.removeAttribute('data-translator-pending');
    el.removeAttribute('data-translator-theme');

    switch (state.displayStyle) {
      case 'original':
      case 'clean':
        applyReplaceStyle(el, render);
        break;
      case 'bilingual': {
        if (render.kind !== 'inline') return;
        applyBilingualStyle(el, render.translatedText, render.fragments, render.styleTemplates);
        break;
      }
      case 'underline': {
        if (render.kind !== 'inline') return;
        applyUnderlineStyle(el, render.translatedText, render.fragments, render.styleTemplates);
        break;
      }
    }

    // 若用户处于「全页显示原文」模式（Alt+W 切换过的），新翻译完成的段落也应立即切到原文显示
    if (state.displayMode === 'original') {
      toggleElementDisplay(el);
    }
  });
}

export function toggleElementDisplay(el: HTMLElement): void {
  const elState = state.elementMap.get(el);
  if (!elState) return;

  const show = elState.showingOriginal;

  switch (state.displayStyle) {
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
        restoreChildNodes(el, elState);
        el.removeAttribute('data-translator-processed');
      }
      break;
    }
  }

  elState.showingOriginal = !show;
}

export function restoreAll(): void {
  const keys = Array.from(state.elementMap.keys());
  
  // 同步收集所有要还原的状态快照并清除 elementMap，使状态立即恢复到未翻译状态，防止状态冲突
  const snapshots = keys.map(el => ({
    el,
    elState: state.elementMap.get(el)
  })).filter(item => item.elState !== undefined);
  
  state.elementMap.clear();

  // 异步帧分片进行真实的 DOM 还原动作
  for (const item of snapshots) {
    scheduleDOMUpdate(() => {
      const { el, elState } = item;
      if (!elState) return;

      switch (state.displayStyle) {
        case 'original':
        case 'clean': {
          const wrapper = elState.cloneEl;
          if (wrapper && wrapper.parentNode) {
            mutationIgnoredNodes.add(wrapper);
            wrapper.replaceWith(el);
            wrapperToOriginal.delete(wrapper);
          }
          break;
        }
        case 'bilingual':
        case 'underline': {
          restoreChildNodes(el, elState);
          el.removeAttribute('data-translator-processed');
          break;
        }
      }
      el.removeAttribute('data-translator-error');
    });
  }
}

// 全页 toggle：把 elementMap 中所有「当前 showingOriginal 与目标态不一致」的段落
// 都切到目标态。成功翻译的段落（status === 'translated'）才有切换价值；
// 失败/pending 的段落跳过（其 cloneEl 可能不存在，toggleElementDisplay 会 break）。
// 为避免长页面阻塞主线程，使用 requestAnimationFrame 分片处理。
const TOGGLE_BATCH_SIZE = 50;
let toggleRunId = 0;

export function toggleAllDisplay(targetShowOriginal: boolean): void {
  const runId = ++toggleRunId;
  const targets: HTMLElement[] = [];
  state.elementMap.forEach((entry: ElementState, el: HTMLElement) => {
    if (entry.status !== 'translated') return;
    if (entry.showingOriginal === targetShowOriginal) return;
    targets.push(el);
  });

  let index = 0;
  function processBatch(): void {
    if (runId !== toggleRunId) return;
    const end = Math.min(index + TOGGLE_BATCH_SIZE, targets.length);
    for (; index < end; index++) {
      const el = targets[index];
      const entry = state.elementMap.get(el);
      if (entry?.status === 'translated' && entry.showingOriginal !== targetShowOriginal) {
        toggleElementDisplay(el);
      }
    }
    if (index < targets.length) {
      requestAnimationFrame(processBatch);
    }
  }
  processBatch();
}
