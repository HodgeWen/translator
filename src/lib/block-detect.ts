/**
 * 段落识别引擎：决定页面上哪些元素可作为"翻译单元"。
 *
 * 设计要点（详见 .agent-context/default/plan-2/plan.md）：
 * - 白名单（必走）+ 灰名单（条件走：直接文本占比 ≥ 50%）+ 硬/软排除。
 * - 父子去重：若某候选的"可翻译祖先"已经入选，则跳过该候选，保留最外层。
 * - 允许含 inline code 的段落通过（后续由占位符机制处理）。
 */

const WHITELIST_TAGS = new Set([
  'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'DT', 'DD', 'FIGCAPTION', 'SUMMARY', 'CAPTION', 'TD', 'TH',
]);

// BLOCKQUOTE 放灰名单：常见的 reddit / github / markdown 渲染会把引文段落
// 包成 <blockquote><p>…</p></blockquote>，此时 blockquote 自身没有直接文本，
// 应让内部 <p> 作为翻译单元；只有当 blockquote 直接文本占比足够（裸文本引用）
// 时才把它当作整段翻译。这样可避免把 <p> 当成 KEEP 占位符导致整段不翻译，
// 同时保留 blockquote 容器自身的左边框 / 缩进等站点引用样式。
const GRAYLIST_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'MAIN', 'BLOCKQUOTE']);

const HARD_EXCLUDE_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME',
  'TEXTAREA', 'INPUT', 'BUTTON', 'SELECT',
  'SVG', 'CANVAS', 'VIDEO', 'AUDIO',
  'PRE', 'CODE',
]);

// 软排除标签：这些标签内的后代元素默认跳过翻译（导航、页头页脚等 UI chrome）。
// 与 HARD_EXCLUDE 的区别：元素自身不会出现在候选列表（它们不在白/灰名单），
// 但内部的 <li>/<p> 等白名单元素会被 hasExcludedAncestor 拦截。
const SOFT_EXCLUDE_TAGS = new Set(['NAV', 'FOOTER', 'HEADER']);

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

const CANDIDATE_SELECTOR = [...WHITELIST_TAGS, ...GRAYLIST_TAGS]
  .map((tag) => tag.toLowerCase())
  .join(',');

/** 供外部（如 Ctrl+hover）快速判定"是不是一个段落级元素"。 */
export const BLOCK_SELECTOR = CANDIDATE_SELECTOR;

function getDirectTextLength(el: HTMLElement): number {
  let len = 0;
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      len += (node.textContent ?? '').trim().length;
    }
  }
  return len;
}

function hasExcludedAncestor(el: HTMLElement): boolean {
  let cur: HTMLElement | null = el;
  while (cur) {
    if (cur.isContentEditable) return true;
    if (cur.getAttribute?.('contenteditable') === 'true') return true;
    if (cur.getAttribute?.('translate') === 'no') return true;
    if (cur.classList?.contains('notranslate')) return true;
    if (cur.getAttribute?.('aria-hidden') === 'true') return true;
    const role = cur.getAttribute?.('role');
    if (role === 'code' || role === 'math') return true;
    if (role && UI_ROLES.has(role)) return true;
    if (SOFT_EXCLUDE_TAGS.has(cur.tagName)) return true;
    if (cur.hasAttribute?.('data-translator-processed')) return true;
    if (cur.hasAttribute?.('data-translator-clone')) return true;
    cur = cur.parentElement;
  }
  return false;
}

function isVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null) {
    // offsetParent === null 对 position:fixed 会误判，退化到 rect 判定
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (style.position !== 'fixed') return false;
  }
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

export function isTranslatableBlock(el: HTMLElement | null | undefined): el is HTMLElement {
  if (!el) return false;

  const tag = el.tagName;
  if (HARD_EXCLUDE_TAGS.has(tag)) return false;

  const isWhitelist = WHITELIST_TAGS.has(tag);
  const isGraylist = GRAYLIST_TAGS.has(tag);
  if (!isWhitelist && !isGraylist) return false;

  if (hasExcludedAncestor(el)) return false;

  const text = el.textContent?.trim() ?? '';
  if (text.length < MIN_TEXT_LENGTH) return false;

  if (!isVisible(el)) return false;

  if (isGraylist) {
    // 灰名单：必须"直接文本"占比够高才视作段落，否则让子元素去匹配。
    const directLen = getDirectTextLength(el);
    const totalLen = text.length;
    if (totalLen === 0) return false;
    if (directLen / totalLen < DIRECT_TEXT_RATIO_THRESHOLD) return false;
  }

  // 链接密度过高的 <li> 等通常是导航列表，跳过
  if (tag === 'LI' && isLinkHeavy(el)) return false;

  return true;
}

/**
 * 从 root 起收集所有可翻译段落，并对父子同时命中的情况保留最外层。
 */
export function collectBlocks(root: ParentNode = document): HTMLElement[] {
  const scope: Element = (root instanceof Document) ? root.documentElement : (root as Element);
  if (!scope) return [];

  const all = Array.from(scope.querySelectorAll(CANDIDATE_SELECTOR)) as HTMLElement[];
  // 把 root 自身也纳入候选（MutationObserver 传入单个新增节点时需要）
  if (scope instanceof HTMLElement && scope.matches(CANDIDATE_SELECTOR)) {
    all.unshift(scope);
  }

  const passed: HTMLElement[] = [];
  for (const el of all) {
    if (isTranslatableBlock(el)) passed.push(el);
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
