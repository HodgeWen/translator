import type { ElementState } from './state';
import { state, wrapperToOriginal, mutationIgnoredNodes } from './state';
import { decodeInline } from '@/lib/inline-placeholder';

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
  wrapper.setAttribute('data-translator-processed', 'true');

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

export function applyTranslation(el: HTMLElement, translatedText: string, fragments: DocumentFragment[]): void {
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

export function restoreElement(el: HTMLElement): void {
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

export function toggleElementDisplay(el: HTMLElement): void {
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

export function restoreAll(): void {
  const keys = Array.from(state.elementMap.keys());
  for (const el of keys) restoreElement(el);
  // restoreElement 已逐个 delete；最终 clear 是冗余但无副作用，作防御保留。
  state.elementMap.clear();
}

// 全页 toggle：把 elementMap 中所有「当前 showingOriginal 与目标态不一致」的段落
// 都切到目标态。成功翻译的段落（status === 'translated'）才有切换价值；
// 失败/pending 的段落跳过（其 cloneEl 可能不存在，toggleElementDisplay 会 break）。
export function toggleAllDisplay(targetShowOriginal: boolean): void {
  state.elementMap.forEach((entry: ElementState, el: HTMLElement) => {
    if (entry.status !== 'translated') return;
    if (entry.showingOriginal === targetShowOriginal) return;
    toggleElementDisplay(el);
  });
}
