import {
  isTranslatableBlock,
  WHITELIST_TAGS,
  GRAYLIST_TAGS,
  HARD_EXCLUDE_TAGS,
  getDirectTextLength,
  isVisible
} from '@/lib/block-detect';
import { state, wrapperToOriginal, applySettingsToState } from './state';
import { toggleElementDisplay } from './style-apply';
import { translateSingleElement } from './translate';
import {
  eventMatchesSingleKeyShortcut,
  isShortcutKeyEvent,
  mouseEventHasModifierShortcut,
} from './shortcut-utils';

// ─── Shortcut+Hover Translation ────────────────────────────────────────
// 设计：按住配置的单键悬停可翻译段落 → 段落出现高亮，停留 200ms 后触发翻译。
// 不要求先按快捷键启用整页翻译；首次触发时按需懒加载用户设置（母语/样式/聚合参数）。
//
// 触发时机覆盖两种姿势：
// 1. 先按快捷键，再移动到段落 → 由 `mouseover` 触发；
// 2. 先悬停在段落，再按下快捷键 → 由 `keydown` 配合最近 hover 目标触发。
// 仅靠 `mouseover` 会漏掉姿势 2，因为按键不会重发 mouseover。

const HOVER_HIGHLIGHT_ATTR = 'data-translator-hover-target';
const HOVER_DEBOUNCE_MS = 200;
// 高亮命中段落到清除的最小总时长。即使翻译瞬间完成，也保证用户至少看到
// 0.25s 的视觉反馈，避免按键后高亮一闪而过的体验割裂。
const HOVER_MIN_VISIBLE_MS = 250;

let ctrlHoverSettingsLoaded = false;
let hoverShortcutKey = 'Control';
let hoverTarget: HTMLElement | null = null;
let hoverTimer: number | null = null;
// 最近一次 mouseover 命中的 DOM 节点。用于「先悬停再按快捷键」姿势：
// 按快捷键时直接用此节点替代昂贵的 elementFromPoint(x, y)，并彻底
// 消除全局 mousemove 监听（每秒数百次回调）的能耗成本。
//
// 取舍说明：mouseover 只在跨元素时触发（远低于 mousemove 频率）；如果用户
// 进入页面后从未移动鼠标即按快捷键，lastHoverTarget 为 null，那一次手势失效——
// 这是可接受的极小代价，换取持续运行的能耗节省。
let lastHoverTarget: HTMLElement | null = null;
// 屏蔽 keydown 在按住期间的 auto-repeat：仅在「松开后再次按下」时
// 视作一次新的快捷键事件，避免按住期间不停 toggle。
let shortcutPressed = false;

// 「本轮按快捷键已 toggle 过的段落」——按住快捷键期间，鼠标在同一段落内子元素
// 之间移动会持续触发 mouseover（每个子元素一次），若不去重就会反复 toggle，
// 用户感受是「按下没切换 / 切了又切回去」。
//
// 切换段落（移到段落 B）应允许新段落 toggle；松开快捷键重置（下一次按快捷键
// 视作新一轮，可再次 toggle 同一段落）。
let lastShortcutToggledEl: HTMLElement | null = null;

async function ensureCtrlHoverSettings(): Promise<void> {
  if (ctrlHoverSettingsLoaded) return;
  try {
    const { getSettings } = await import('@/lib/storage');
    const s = await getSettings();
    if (!state.isActive) applySettingsToState(s);
    hoverShortcutKey = s.hoverShortcutKey;
    ctrlHoverSettingsLoaded = true;
  } catch (err) {
    console.warn('[Translator] Ctrl+Hover settings loading failed:', err);
  }
}

function isCodeOrCodeBlock(el: HTMLElement): boolean {
  if (el.tagName === 'PRE' || el.tagName === 'CODE') return true;
  if (el.getAttribute?.('role') === 'code') return true;
  if (el.classList?.contains('highlight') || el.classList?.contains('blob-code')) return true;
  return false;
}

function findNearestTranslatableBlock(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  
  let cur: HTMLElement | null = el;
  let fallbackTarget: HTMLElement | null = null;
  
  while (cur && cur.tagName !== 'BODY' && cur.tagName !== 'HTML') {
    // 遇到代码或代码块，坚决不翻译
    if (isCodeOrCodeBlock(cur)) {
      return null;
    }

    // 1. 优先匹配：高优先级的标准强段落
    if (WHITELIST_TAGS.has(cur.tagName) && isTranslatableBlock(cur, undefined, undefined, false)) {
      return cur;
    }
    
    // 2. 局部兜底匹配：若不是强段落，但它有文本且是可见的
    if (!fallbackTarget) {
      const text = cur.textContent?.trim() ?? '';
      if (text.length >= 1 && isVisible(cur) && !HARD_EXCLUDE_TAGS.has(cur.tagName)) {
        const isGray = GRAYLIST_TAGS.has(cur.tagName);
        // 如果是 Graylist 容器（如 DIV），需含有直接文本或本身是叶子，避免把巨型布局容器当成 fallback
        if (!isGray || getDirectTextLength(cur) > 0 || cur.children.length === 0) {
          fallbackTarget = cur;
        }
      }
    }
    
    cur = cur.parentElement;
  }
  
  // 若未找到强段落，使用行内/局部元素兜底
  if (fallbackTarget && isTranslatableBlock(fallbackTarget, undefined, undefined, true)) {
    return fallbackTarget;
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
// 后续 tryStartHoverFor。只有「跨段落」或「快捷键重新按下」时才真正执行 toggle，
// 同段落内的连续 mouseover 静默吞掉、不重复切换。
function tryToggleDisplay(target: HTMLElement | null): boolean {
  const toggleEl = findToggleTarget(target);
  if (!toggleEl || !state.elementMap.has(toggleEl)) return false;

  if (lastShortcutToggledEl === toggleEl) {
    return true;
  }

  if (hoverTarget === toggleEl) cancelHoverDebounce();
  toggleEl.removeAttribute(HOVER_HIGHLIGHT_ATTR);
  const cloneEl = state.elementMap.get(toggleEl)?.cloneEl;
  cloneEl?.removeAttribute(HOVER_HIGHLIGHT_ATTR);
  toggleElementDisplay(toggleEl);
  lastShortcutToggledEl = toggleEl;
  return true;
}

// 仅取消「防抖阶段」的高亮和计时器（hoverTimer != null 时）。
// 一旦计时器回调已 fire 进入翻译阶段（hoverTimer == null），不再做任何清理：
// 高亮与 hoverTarget 的清除完全交由翻译完成回调的 finally 分支接管，确保
// 快捷键短按即松开也能完成翻译，且翻译期间高亮不会被 keyup / mouseout 中断。
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

export function setupCtrlHover(): void {
  void ensureCtrlHoverSettings();

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((_changes, area) => {
      if (area !== 'sync') return;
      ctrlHoverSettingsLoaded = false;
      void ensureCtrlHoverSettings();
    });
  }

  // mouseover 同时承担两个职责：
  //   1. 跟踪最近 hover 目标（lastHoverTarget），供 keydown 时使用；
  //   2. 用户先按快捷键再移动到段落时，由本回调直接触发翻译。
  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    lastHoverTarget = target;
    if (!shortcutPressed && !mouseEventHasModifierShortcut(e, hoverShortcutKey)) return;
    if (tryToggleDisplay(target)) return;
    tryStartHoverFor(target);
  }, { passive: true });

  // 用户先悬停后按快捷键的姿势：mouseover 不会再次触发，需要 keydown 兜底。
  // 同时承担「再按快捷键恢复原文」的 toggle 入口：
  //   1. 用 `shortcutPressed` 屏蔽 auto-repeat，确保「松开后再次按下」才视作一次按键；
  //   2. 命中已翻译段落（wrapper 或原 el）→ 同步恢复原文，不进入翻译路径；
  //   3. 否则走原有翻译路径（lastHoverTarget + tryStartHoverFor）。
  document.addEventListener('keydown', (e) => {
    if (!eventMatchesSingleKeyShortcut(e, hoverShortcutKey)) return;
    if (shortcutPressed || e.repeat) return;
    shortcutPressed = true;
    if (!lastHoverTarget) return;
    if (tryToggleDisplay(lastHoverTarget)) return;
    tryStartHoverFor(lastHoverTarget);
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
  // 这样快捷键短按即松开也能完成 200ms 防抖触发的翻译，且翻译期间
  // 高亮不会被松键中断，与「再按快捷键恢复」的 toggle 语义协调。
  document.addEventListener('keyup', (e) => {
    if (!isShortcutKeyEvent(e, hoverShortcutKey)) return;
    shortcutPressed = false;
    lastShortcutToggledEl = null;
  });

  window.addEventListener('blur', () => {
    shortcutPressed = false;
    lastShortcutToggledEl = null;
    cancelHoverDebounce();
  });
}
