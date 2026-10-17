/**
 * 段落识别引擎：决定页面上哪些元素可作为"翻译单元"。
 *
 * 设计要点（详见 .agent-context/default/plan-2/plan.md）：
 * - 白名单（必走）+ 灰名单（条件走：直接文本占比 ≥ 50%）+ 硬/软排除。
 * - 父子去重：若某候选的"可翻译祖先"已经入选，则跳过该候选，保留最外层。
 * - 允许含 inline code 的段落通过（后续由占位符机制处理）。
 */

import { getActiveRules } from './site-rules';

export const WHITELIST_TAGS = new Set([
  'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'DT', 'DD', 'FIGCAPTION', 'SUMMARY', 'CAPTION', 'TD', 'TH',
]);

// BLOCKQUOTE 放灰名单：常见的 reddit / github / markdown 渲染会把引文段落
// 包成 <blockquote><p>…</p></blockquote>，此时 blockquote 自身没有直接文本，
// 应让内部 <p> 作为翻译单元；只有当 blockquote 直接文本占比足够（裸文本引用）
// 时才把它当作整段翻译。这样可避免把 <p>当成 KEEP 占位符导致整段不翻译，
// 同时保留 blockquote 容器自身的左边框 / 缩进等站点引用样式。
export const GRAYLIST_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'MAIN', 'BLOCKQUOTE']);

export const HARD_EXCLUDE_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME',
  'TEXTAREA', 'INPUT', 'BUTTON', 'SELECT',
  'SVG', 'CANVAS', 'VIDEO', 'AUDIO',
  'PRE', 'CODE',
]);

// 软排除标签：这些标签内的后代元素默认跳过翻译（导航、页头页脚等 UI chrome）。
// 与 HARD_EXCLUDE 的区别：元素自身不会出现在候选列表（它们不在白/灰名单），
// 但内部的 <li>/<p> 等白名单元素会被 hasExcludedAncestor 拦截。
const SOFT_EXCLUDE_TAGS = new Set(['NAV', 'FOOTER']);

const SECTIONING_CONTENT_TAGS = new Set(['MAIN', 'SECTION', 'ARTICLE', 'ASIDE']);

function isPageLevelHeader(el: HTMLElement): boolean {
  if (el.getAttribute('role') === 'banner') return true;
  if (el.parentElement?.tagName === 'BODY') return true;
  let cur = el.parentElement;
  while (cur && cur.tagName !== 'BODY') {
    if (SECTIONING_CONTENT_TAGS.has(cur.tagName)) return false;
    cur = cur.parentElement;
  }
  return true;
}

// 交互式 UI 组件的 ARIA role：这些角色下的文本是 UI 控件而非可读内容。
const UI_ROLES = new Set([
  'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'toolbar', 'tablist', 'tab', 'navigation',
  'button', 'switch', 'slider', 'spinbutton',
  'listbox', 'option', 'combobox',
  'alertdialog', 'dialog',
  'tooltip', 'status', 'timer', 'progressbar',
]);

const DIRECT_TEXT_RATIO_THRESHOLD = 0.5;
const MIN_TEXT_LENGTH = 5;

// ─── 行内子树判定（inline-only 放行） ─────────────────────────────────
// 背景：部分 SPA（X / Twitter 等）把正文整体包在 <span> 等行内元素里，
// 灰名单容器的直接文本占比为 0 而被拒、正文完全没有翻译单元覆盖。
// 放行规则：直接文本占比不足、但子树内只含行内元素（含嵌套）且文本达
// 阈值时，容器本身就是段落单元。判定核心抽成纯函数，可脱离 DOM 单测。

// Node.ELEMENT_NODE 的数值常量：helper 需在无 DOM 的测试环境（bun:test）运行，
// 不能引用 Node 全局。
const ELEMENT_NODE_TYPE = 1;

/** 行内元素集合：这些标签（含嵌套）不破坏「容器即段落」的判定。 */
export const INLINE_TAGS = new Set([
  'SPAN', 'A', 'STRONG', 'B', 'EM', 'I', 'U', 'SMALL', 'ABBR', 'CITE', 'Q',
  'MARK', 'SUB', 'SUP', 'TIME', 'CODE', 'BR', 'IMG', 'SVG', 'WBR',
]);

/** 行内子树节点数上限：超过视为大容器，退回灰名单规则，防遍历退化。 */
export const INLINE_SUBTREE_MAX_NODES = 100;

/** DOM 子节点的纯数据摘要：行内子树判定不依赖真实 DOM，可直接单测。 */
export interface NodeSummary {
  /** 1 = 元素节点，3 = 文本节点（与 DOM Node 常量一致） */
  nodeType: number;
  /** 元素节点的标签名（大写）；非元素节点省略 */
  tagName?: string;
  /** 元素节点的子节点摘要；叶子省略 */
  children?: NodeSummary[];
}

/**
 * 纯函数：判断一组子节点摘要构成的子树是否全部为行内节点。
 * 文本节点不拦截；元素节点（含嵌套子树）必须在 INLINE_TAGS 中。
 * 子树总节点数超过 maxNodes 时拒绝（防大容器退化）。
 */
export function isInlineOnlySubtree(
  children: readonly NodeSummary[],
  maxNodes: number = INLINE_SUBTREE_MAX_NODES,
): boolean {
  let count = 0;
  return visitAll(children);

  function visitAll(nodes: readonly NodeSummary[]): boolean {
    for (const node of nodes) {
      if (++count > maxNodes) return false;
      if (node.nodeType === ELEMENT_NODE_TYPE) {
        if (!node.tagName || !INLINE_TAGS.has(node.tagName)) return false;
        if (!visitAll(node.children ?? [])) return false;
      }
    }
    return true;
  }
}

// 将元素的子节点摘要为纯数据；子树规模超过 maxNodes 时返回 null，
// 避免为注定会被上限拒绝的大容器构建完整摘要。
function summarizeChildNodes(el: HTMLElement, maxNodes: number): NodeSummary[] | null {
  let budget = maxNodes;

  const summarize = (node: Node): NodeSummary | null => {
    budget -= 1;
    if (budget < 0) return null;
    if (node.nodeType === ELEMENT_NODE_TYPE) {
      const children: NodeSummary[] = [];
      for (const child of Array.from(node.childNodes)) {
        const summary = summarize(child);
        if (summary === null) return null;
        children.push(summary);
      }
      return { nodeType: ELEMENT_NODE_TYPE, tagName: (node as Element).tagName, children };
    }
    return { nodeType: node.nodeType };
  };

  const result: NodeSummary[] = [];
  for (const child of Array.from(el.childNodes)) {
    const summary = summarize(child);
    if (summary === null) return null;
    result.push(summary);
  }
  return result;
}

// 「子树仅行内」的 DOM 判定：灰名单直接文本占比不足时的放行依据。
// 预算与纯 helper 的上限一致，摘要构建成功后由纯 helper 复核标签集合。
function isInlineOnlySubtreeContainer(el: HTMLElement): boolean {
  const summary = summarizeChildNodes(el, INLINE_SUBTREE_MAX_NODES);
  return summary !== null && isInlineOnlySubtree(summary);
}

/**
 * 「灰名单 + 无直接文本 + 仅行内子元素」的容器（如 X 的推文正文 div）。
 * 供块判定与悬停兜底共用，使这类容器可作为翻译单元 / 悬停目标。
 */
export function isInlineOnlyGrayContainer(el: HTMLElement): boolean {
  return (
    GRAYLIST_TAGS.has(el.tagName) &&
    getDirectTextLength(el) === 0 &&
    isInlineOnlySubtreeContainer(el)
  );
}

const CANDIDATE_SELECTOR = [...WHITELIST_TAGS, ...GRAYLIST_TAGS]
  .map((tag) => tag.toLowerCase())
  .join(',');

export function getDirectTextLength(el: HTMLElement): number {
  let len = 0;
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      len += (node.textContent ?? '').trim().length;
    }
  }
  return len;
}

function hasExcludedAncestor(
  el: HTMLElement,
  excludedCache?: WeakSet<HTMLElement>,
  safeCache?: WeakSet<HTMLElement>,
  relaxed?: boolean,
): boolean {
  // 检查特定网站的排除规则
  if (typeof window !== 'undefined') {
    const activeRules = getActiveRules(window.location.href);
    for (const rule of activeRules) {
      if (rule.excludeSelectors) {
        for (const selector of rule.excludeSelectors) {
          if (el.closest(selector)) {
            excludedCache?.add(el);
            return true;
          }
        }
      }
      if (rule.shouldExclude?.(el)) {
        excludedCache?.add(el);
        return true;
      }
    }
  }

  const walked: HTMLElement[] = [];
  let cur: HTMLElement | null = el;
  while (cur) {
    if (excludedCache?.has(cur)) {
      for (const w of walked) excludedCache.add(w);
      return true;
    }
    if (safeCache?.has(cur)) return false;

    if (cur.isContentEditable) { markExcluded(); return true; }
    if (cur.getAttribute?.('contenteditable') === 'true') { markExcluded(); return true; }
    const role = cur.getAttribute?.('role');
    if (role === 'code' || role === 'math') { markExcluded(); return true; }
    if (cur.hasAttribute?.('data-translator-processed')) { markExcluded(); return true; }
    if (cur.hasAttribute?.('data-translator-clone')) { markExcluded(); return true; }

    if (!relaxed) {
      if (cur.getAttribute?.('translate') === 'no') { markExcluded(); return true; }
      if (cur.classList?.contains('notranslate')) { markExcluded(); return true; }
      if (cur.getAttribute?.('aria-hidden') === 'true') { markExcluded(); return true; }
      if (role && UI_ROLES.has(role)) { markExcluded(); return true; }
      if (SOFT_EXCLUDE_TAGS.has(cur.tagName)) { markExcluded(); return true; }
      if (cur.tagName === 'HEADER' && isPageLevelHeader(cur)) { markExcluded(); return true; }
    }

    walked.push(cur);
    cur = cur.parentElement;
  }
  if (safeCache) { for (const w of walked) safeCache.add(w); }
  return false;

  function markExcluded() {
    if (excludedCache) { for (const w of walked) excludedCache.add(w); if (cur) excludedCache.add(cur); }
  }
}

export function isVisible(el: HTMLElement): boolean {
  // Use native checkVisibility when available to avoid forced synchronous layout.
  if (typeof el.checkVisibility === 'function') {
    return el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
  }
  // Fallback for older browsers: minimal checks without getComputedStyle.
  const rect = el.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

// 链接密度启发式：当元素中链接文本占比过高时（> 70%），认为是导航型列表，跳过翻译。
// 典型场景：侧边栏目录、面包屑、标签云、分页控件。
const LINK_DENSITY_THRESHOLD = 0.7;

function isLinkHeavy(el: HTMLElement): boolean {
  const totalLen = (el.textContent?.trim() ?? '').length;
  if (totalLen === 0) return false;

  // 仅检查直接子级 <a> 的文本占比，避免深层子树查询导致性能退化。
  // 导航型 <li> 的链接通常就在第一层子节点中。
  const links = el.querySelectorAll(':scope > a, :scope > span > a');
  let linkTextLen = 0;
  links.forEach(a => { linkTextLen += (a.textContent?.trim() ?? '').length; });
  return linkTextLen / totalLen > LINK_DENSITY_THRESHOLD;
}

export function isTranslatableBlock(
  el: HTMLElement | null | undefined,
  excludedCache?: WeakSet<HTMLElement>,
  safeCache?: WeakSet<HTMLElement>,
  relaxed?: boolean,
): el is HTMLElement {
  if (!el) return false;

  const tag = el.tagName;
  if (HARD_EXCLUDE_TAGS.has(tag)) return false;

  const isWhitelist = WHITELIST_TAGS.has(tag);
  const isGraylist = GRAYLIST_TAGS.has(tag);
  if (!relaxed && !isWhitelist && !isGraylist) return false;

  if (hasExcludedAncestor(el, excludedCache, safeCache, relaxed)) return false;

  const text = el.textContent?.trim() ?? '';
  const minLen = relaxed ? 1 : MIN_TEXT_LENGTH;
  if (text.length < minLen) return false;

  if (!isVisible(el)) return false;

  if (!relaxed && isGraylist) {
    const directLen = getDirectTextLength(el);
    const totalLen = text.length;
    if (totalLen === 0) return false;
    if (directLen / totalLen < DIRECT_TEXT_RATIO_THRESHOLD) {
      // inline-only 放行：文本全在行内子元素里（如 X 的 tweetText）时，
      // 子树仅含行内节点且规模受控 → 容器本身放行为翻译单元；否则维持
      // 灰名单拒绝，把机会留给内部的白名单候选。
      if (!isInlineOnlySubtreeContainer(el)) return false;
    }
  }

  if (!relaxed && tag === 'LI' && isLinkHeavy(el)) return false;

  return true;
}

/**
 * 递归收集匹配 CANDIDATE_SELECTOR 的元素，包括 Shadow DOM 内的元素。
 *
 * 背景：Reddit 的 <shreddit-comment> 等 Web Components 会将文本内容渲染在
 * Shadow Root 内，而 querySelectorAll 默认不穿透 Shadow DOM。
 * 此函数在光 DOM 搜索后遍历所有元素，发现 open shadowRoot 时递归进入，
 * 确保 Web Components 内的文本也能被发现并翻译。
 */
function collectCandidatesWithShadow(scope: ParentNode): HTMLElement[] {
  const results: HTMLElement[] = [];

  // 在光 DOM 内快速搜索（浏览器原生优化路径）
  results.push(...Array.from(scope.querySelectorAll(CANDIDATE_SELECTOR)) as HTMLElement[]);

  // 遍历所有元素，递归进入 open shadow roots
  const allElements = Array.from(scope.querySelectorAll('*')) as HTMLElement[];
  for (const el of allElements) {
    if (el.shadowRoot) {
      results.push(...collectCandidatesWithShadow(el.shadowRoot));
    }
  }

  return results;
}

/**
 * 从 root 起收集所有可翻译段落，并对父子同时命中的情况保留最外层。
 */
export function collectBlocks(root: ParentNode = document): HTMLElement[] {
  const scope: Element = (root instanceof Document) ? root.documentElement : (root as Element);
  if (!scope) return [];

  const excludedCache = new WeakSet<HTMLElement>();
  const safeCache = new WeakSet<HTMLElement>();

  const all = collectCandidatesWithShadow(scope);
  if (scope instanceof HTMLElement && scope.matches(CANDIDATE_SELECTOR)) {
    all.unshift(scope);
  }

  const passed: HTMLElement[] = [];
  for (const el of all) {
    if (isTranslatableBlock(el, excludedCache, safeCache)) passed.push(el);
  }

  if (passed.length === 0) return [];

  // 父子去重（含子夺权）：
  // 原始策略：父子同时命中时只保留最外层（父）。
  // 问题：当父节点直接文本为空（所有文字在子块级元素内），encodeInline 会把
  // 子块当 KEEP 占位符（#N#），导致 LLM 收到的只有占位符、没有可翻译内容。
  // 典型场景：<li><p>文本</p></li>、<td><p>文本</p></td>。
  //
  // 子夺权策略：当父节点直接文本占比不足（< DIRECT_TEXT_RATIO_THRESHOLD），
  // 说明父只是容器，应保留子节点翻译、抑制父节点。
  const passedSet = new Set(passed);
  const suppressed = new Set<HTMLElement>();
  const survivors: HTMLElement[] = [];

  for (const el of passed) {
    let hasAncestorInSet = false;
    let parent: HTMLElement | null = el.parentElement;
    while (parent) {
      if (passedSet.has(parent)) {
        // 检查父节点直接文本占比
        const parentDirectLen = getDirectTextLength(parent);
        const parentTotalLen = (parent.textContent?.trim() ?? '').length;
        if (parentTotalLen > 0 && parentDirectLen / parentTotalLen < DIRECT_TEXT_RATIO_THRESHOLD) {
          // 父节点直接文本不够 → 子夺权，标记父被抑制
          suppressed.add(parent);
        } else {
          hasAncestorInSet = true;
        }
        break;
      }
      parent = parent.parentElement;
    }
    if (!hasAncestorInSet) survivors.push(el);
  }

  return survivors.filter(el => !suppressed.has(el));
}
