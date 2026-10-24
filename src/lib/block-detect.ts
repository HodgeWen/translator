/**
 * 段落识别引擎：决定页面上哪些元素可作为"翻译单元"。
 *
 * 设计要点（详见 .agent-context/default/plan-2/plan.md）：
 * - 白名单（必走）+ 灰名单（条件走：直接文本占比 ≥ 50%）+ 硬/软排除。
 * - 父子去重：若某候选的"可翻译祖先"已经入选，则跳过该候选，保留最外层。
 * - 允许含 inline code 的段落通过（后续由占位符机制处理）。
 */

import { getActiveRules, type SiteRule } from './site-rules';
import { hasTranslatableText } from './inline-placeholder';

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

// Node.ELEMENT_NODE / Node.TEXT_NODE / Node.DOCUMENT_NODE 的数值常量：helper
// 需在无 DOM 的测试环境（bun:test + linkedom）运行，不能引用 Node / Document 全局。
const ELEMENT_NODE_TYPE = 1;
const TEXT_NODE_TYPE = 3;
const DOCUMENT_NODE_TYPE = 9;

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

// 候选标签集合：遍历时按标签名 O(1) 命中，避免每个节点都跑一次选择器引擎。
const CANDIDATE_TAG_SET: ReadonlySet<string> = new Set([...WHITELIST_TAGS, ...GRAYLIST_TAGS]);

/**
 * 候选标签判定。HTML 文档里 tagName 恒为大写（O(1) 命中，零分配）；
 * XHTML（application/xhtml+xml）等保留小写的文档走一次 toUpperCase 兜底，
 * 保证与旧实现 querySelectorAll(CANDIDATE_SELECTOR) 的大小写不敏感语义一致。
 */
function isCandidateElement(el: Element): boolean {
  const tag = el.tagName;
  if (CANDIDATE_TAG_SET.has(tag)) return true;
  // 首字符非大写字母（> 'Z'）时才可能需要归一化，避免每个元素都分配新字符串
  return tag.charCodeAt(0) > 90 && CANDIDATE_TAG_SET.has(tag.toUpperCase());
}

export function getDirectTextLength(el: HTMLElement): number {
  let len = 0;
  // 直接用 firstChild / nextSibling 遍历：`Array.from(childNodes)` 会为每个
  // 候选元素额外分配一个子节点数组，而本函数在整页扫描里每个候选都要调用一次。
  for (let node = el.firstChild; node; node = node.nextSibling) {
    if (node.nodeType === TEXT_NODE_TYPE) {
      len += (node.textContent ?? '').trim().length;
    }
  }
  return len;
}

// ─── 活跃站点规则缓存（按 URL） ──────────────────────────────────────
// hasExcludedAncestor 对每个候选的祖先链都要判定站点排除规则，而
// getActiveRules 内部要 new URL() + filter。候选量大时是明显热点。
// 这里按 location.href 字符串缓存结果：SPA 路由变化（pushState/replaceState）
// 会改变 href，下次调用即失效重算，不会把上一页的规则带到新页面。
// 缓存只保存「字符串 → 规则数组」的纯数据，规则对象本身无状态，不持有 DOM，
// 因此不会泄漏跨页面状态，也不会阻止 GC。
let cachedRules: SiteRule[] | null = null;
let cachedHref: string | null = null;

/** 取当前页面活跃规则（按 href 缓存）。非浏览器环境下返回空数组。 */
export function getCachedActiveRules(): SiteRule[] {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') return [];
  const href = window.location.href;
  if (cachedRules !== null && cachedHref === href) return cachedRules;
  cachedRules = getActiveRules(href);
  cachedHref = href;
  return cachedRules;
}

/** 清空规则缓存（供测试与极端场景手动失效；正常路径靠 href 比较自动失效）。 */
export function clearActiveRulesCache(): void {
  cachedRules = null;
  cachedHref = null;
}

function hasExcludedAncestor(
  el: HTMLElement,
  excludedCache?: WeakSet<HTMLElement>,
  safeCache?: WeakSet<HTMLElement>,
  relaxed?: boolean,
): boolean {
  // 检查特定网站的排除规则（按 href 缓存的活跃规则，避免每个候选重复
  // new URL() + filter 的热点开销）
  const activeRules = getCachedActiveRules();
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
      // shouldExclude 语义为「仅排除候选自身」：不写入 excludedCache，后代
      // 候选独立判定（如 X 未登录回复 li 整条排除，但其内的推文正文 div 仍
      // 要独立成翻译单元）。这与 excludeSelectors 的 closest 祖先语义不同。
      return true;
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

  // 子树内已有翻译产物的容器不再作为翻译单元：首轮收集中这类父子候选由
  // 「子夺权」去重抑制，但后续 wave（mutation flush / IO 再收集）时内层已带
  // data-translator-processed，白名单祖先（如 X 未登录变体的回复 li）会绕过
  // 去重被整块收集，把已翻译的正文与用户名/时间戳等 UI 混在一个单元里重译。
  if (el.querySelector('[data-translator-processed]')) return false;

  const isWhitelist = WHITELIST_TAGS.has(tag);
  const isGraylist = GRAYLIST_TAGS.has(tag);
  if (!relaxed && !isWhitelist && !isGraylist) return false;

  if (hasExcludedAncestor(el, excludedCache, safeCache, relaxed)) return false;

  const text = el.textContent?.trim() ?? '';
  const minLen = relaxed ? 1 : MIN_TEXT_LENGTH;
  if (text.length < minLen) return false;

  // 可翻译字面文本判定（与 encodeInline 的编码规则同构）：文本全在**块级**
  // 子孙里的容器不能作为翻译单元。这类容器编码后只剩 `#1# #2# #3#`，模型
  // 没有可翻译内容，而原地渲染会按占位符顺序重建整棵子树 —— 丢失原节点的
  // 位置语义（grid 网格项、`slot` 归属）。实测 Reddit 评论头 `<summary>`
  // （用户名 / 时间戳各在嵌套 div 中）被重建后高度 36px → 104px，整页结构
  // 崩坏。内部的块级候选会各自成为翻译单元，容器本身不需要参与。
  if (!hasTranslatableText(el)) return false;

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
 * 递归收集匹配候选标签的元素，包括 Shadow DOM 内的元素。
 *
 * 背景：Reddit 的 <shreddit-comment> 等 Web Components 会将文本内容渲染在
 * Shadow Root 内，而 querySelectorAll 默认不穿透 Shadow DOM。
 *
 * 性能：旧实现做两次全量 querySelectorAll —— 一次 CANDIDATE_SELECTOR、一次
 * '*'（为了找 shadow host），且都把结果 Array.from 成完整数组。现在合并为
 * 「单次迭代式 DFS + 标签名 O(1) 判定 + shadowRoot 属性探测」：
 * 每个元素只访问一次，不再分配中间的全元素数组。
 * 复杂度：O(n) 双遍历 + O(n) 中间数组 → O(n) 单遍历 + O(k) 结果数组
 * （n = 子树元素数，k = 候选数）。子树增量收集（observer flush 传入新增
 * root）时 n 就是该子树规模，不再随整页 DOM 增长。
 *
 * 正确性边界（可能漏翻的情况）：本函数不做任何「跨调用缓存」，每次都真实
 * 遍历传入 scope，因此新增 / 移动 / 复用的节点都不会被漏掉；只有 shadow
 * host 的 shadowRoot 处于 closed 模式（el.shadowRoot === null）时无法穿透，
 * 这与旧实现一致，属浏览器安全边界而非缓存导致。
 */
function collectCandidatesWithShadow(scope: ParentNode): HTMLElement[] {
  const results: HTMLElement[] = [];
  walkCandidates(scope, results);
  // scope 自身是 shadow host 时也要穿透：增量收集的 root 可能正是一个新建的
  // Web Component 宿主，其影子树文本不在 scope 的「后代」里。
  const scopeShadow = (scope as HTMLElement).shadowRoot;
  if (scopeShadow) walkCandidates(scopeShadow, results);
  return results;
}

/** 迭代式 DFS（显式栈，避免深 DOM 递归爆栈）；子节点逆序入栈以保持文档顺序。 */
function walkCandidates(scope: ParentNode, out: HTMLElement[]): void {
  const stack: Element[] = [];
  let child = scope.lastElementChild;
  while (child) {
    stack.push(child);
    child = child.previousElementSibling;
  }

  while (stack.length > 0) {
    const el = stack.pop() as Element;
    if (isCandidateElement(el)) out.push(el as HTMLElement);

    // shadow 探测与候选收集合并在同一次遍历里：非 host 上读 shadowRoot
    // 只是一次属性读取，不再需要额外的全量 '*' 扫描。
    const shadow = (el as HTMLElement).shadowRoot;
    if (shadow) walkCandidates(shadow, out);

    let grandchild = el.lastElementChild;
    while (grandchild) {
      stack.push(grandchild);
      grandchild = grandchild.previousElementSibling;
    }
  }
}

/**
 * 从 root 起收集所有可翻译段落，并对父子同时命中的情况保留最外层。
 */
export function collectBlocks(root: ParentNode = document): HTMLElement[] {
  // 用 nodeType 判定文档节点，避免依赖 Document / HTMLElement 全局构造器
  // （bun:test + linkedom 环境下这些全局不存在）。
  const scope: Element = root.nodeType === DOCUMENT_NODE_TYPE
    ? (root as Document).documentElement
    : (root as Element);
  if (!scope) return [];

  const excludedCache = new WeakSet<HTMLElement>();
  const safeCache = new WeakSet<HTMLElement>();

  const all = collectCandidatesWithShadow(scope);
  // scope 自身也可能是候选：旧实现用 unshift 保证它排在最前，这里保持同样语义
  if (scope.nodeType === ELEMENT_NODE_TYPE && isCandidateElement(scope)) {
    all.unshift(scope as HTMLElement);
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
  //
  // 多层嵌套：不能只看最近一层 passed 祖先就 break（旧实现的缺陷 —— 三层
  // <div><div><p> 同时命中时只抑制内层 div，外层 div 仍会整块重译）。这里
  // 继续向上遍历完整祖先链：
  // - 直接文本不足的 passed 祖先 → 全部加入 suppressed（它们都是纯容器）；
  // - 遇到直接文本足够的 passed 祖先 → 该祖先负责本段翻译，停止上溯并把
  //   当前候选标记为被覆盖（不再作为独立翻译单元）。
  const passedSet = new Set(passed);
  const suppressed = new Set<HTMLElement>();
  const survivors: HTMLElement[] = [];

  for (const el of passed) {
    let hasAncestorInSet = false;
    let parent: HTMLElement | null = el.parentElement;
    while (parent) {
      if (passedSet.has(parent)) {
        const parentDirectLen = getDirectTextLength(parent);
        const parentTotalLen = (parent.textContent?.trim() ?? '').length;
        if (parentTotalLen > 0 && parentDirectLen / parentTotalLen < DIRECT_TEXT_RATIO_THRESHOLD) {
          // 父节点直接文本不够 → 子夺权，标记父被抑制，并继续检查更外层
          suppressed.add(parent);
        } else {
          // 该祖先自身承担翻译，当前候选被它覆盖
          hasAncestorInSet = true;
          break;
        }
      }
      parent = parent.parentElement;
    }
    if (!hasAncestorInSet) survivors.push(el);
  }

  return survivors.filter(el => !suppressed.has(el));
}
