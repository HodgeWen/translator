/**
 * 行内占位符保留机制：翻译前把行内富文本节点抽成 `#N#`（完全保留原样）与 `<sN>...</sN>`（内容翻译，样式保留）标记，
 * 发送纯文本给 LLM，译文回传后再将占位符完美还原为原 HTML 样式片段。
 *
 * 设计要点：
 * - INLINE_KEEP (Flat)：语义载体且内容无需翻译的（如 CODE / IMG 等） → 放入 fragments，用 `#N#` 占位，保留原 DOM。
 * - INLINE_STYLE (Tags)：强调、行内文本及链接（如 STRONG / B / EM / I / U / SMALL / SPAN / A） → 剥离 class、style 等属性并缓存在内存模板中，文本用 `<sN>...</sN>` 包裹发送翻译，保证样式无损且文本能够流畅翻译、重新语序对齐。
 * - 未知元素默认走 KEEP，避免丢结构。
 * - 占位标签编号从 0 开始，格式 `<sN>...</sN>`，主流 LLM 保留及重构率极高。
 */

export interface InlineEncodedBlock {
  placeholderText: string;
  fragments: DocumentFragment[];
  styleTemplates: Element[];
}

// 行内样式标签：内容需要翻译、但标签本身要保留（剥离 class/style 后作为空壳模板）。
// 这份白名单必须覆盖「承载可读文本的常见行内标签」，否则它们会落进 KEEP（#N#）
// 分支，内部文本永远不被翻译 —— 删掉 Text 节点粒度路径后，这个遗漏就是整段
// 永久英文（例如高亮站点的 <mark> 整句）。
// 排除的仍是不该翻译的：CODE/PRE/KBD/SAMP/VAR（代码）、TIME（时间戳语义）。
const INLINE_STYLE_TAGS = new Set([
  'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SMALL', 'SPAN', 'A',
  'MARK', 'SUP', 'SUB', 'ABBR', 'DEL', 'INS', 'Q', 'CITE', 'DFN',
]);

function isMathLikeSpan(el: Element): boolean {
  if (el.tagName !== 'SPAN') return false;
  const cls = el.getAttribute('class') ?? '';
  return cls.includes('math') || cls.includes('katex');
}

/**
 * 该元素是否按「行内样式占位」编码（`<sN>` 包裹、内部文本参与翻译）。
 * 否则整体变成 `#N#` 片段，内部文本**不会**被发给模型。
 * 编码分支与 `hasTranslatableText` 的探测共用此判定，避免两处规则漂移。
 */
function isStylePlaceholderElement(el: Element): boolean {
  return INLINE_STYLE_TAGS.has(el.tagName) && !isMathLikeSpan(el);
}

function wrapAsFragment(node: Node): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.appendChild(node);
  return frag;
}

interface EncodeContext {
  fragments: DocumentFragment[];
  styleTemplates: Element[];
  parts: string[];
}

function encodeNode(ctx: EncodeContext, node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    // 按「浏览器如何渲染」编码文本：white-space: normal 下，连续可折叠空白
    // （空格 / 制表 / 换行）在渲染时塌缩成一个空格。若把源码换行原样透传，
    // decodeInline 会按「\n → <br>」的既有契约把它还原成**换行节点**：
    // grid / flex 容器里这些 <br> 会变成额外的网格项，凭空撑开布局
    // （Reddit 评论头 <summary> 实测 36px → 104px，整页结构崩坏）。
    //
    // 因此协议里的 \n 只保留「真实换行」一种来源：源码的 <br>（下方显式编码）。
    //
    // ── 只折叠「含换行」的空白段，纯空格段原样保留 ──────────────────────
    // 换行是唯一会被还原成 <br> 的字符，所以只有含 \r / \n 的空白段需要归一化。
    // 纯空格 / 制表段（如正文里的双空格 "red.  Piece"）**原样保留**：
    //   - 渲染上完全等价（HTML 本来就把连续空格塌缩成一个），无结构风险；
    //   - 改动它们会让缓存键漂移 —— 缓存键含请求文本，且写缓存时按
    //     `sourceText !== text` 校验，文本变一个字符就是一次全量 miss。
    // 收窄归一化范围，等于在不放松安全边界的前提下保住更多既有缓存命中。
    //
    // NBSP（\u00a0）始终不参与折叠：它是站点刻意保留的不换行空格，折叠会
    // 改变断行行为。注意 JS 的 \s 包含 \u00a0，必须显式排除。
    //
    // 已知边界：white-space: pre / pre-wrap 的元素里源码换行本应渲染成换行，
    // 这里会塌缩成空格。此类容器通常是代码块（PRE / CODE 已在 HARD_EXCLUDE /
    // KEEP 分支被整体保留，不走本路径），正文极少使用 pre-wrap，故接受该取舍。
    ctx.parts.push((node.textContent ?? '').replace(/[^\S\u00a0]+/g, ws => (
      ws.includes('\n') || ws.includes('\r') ? ' ' : ws
    )));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as Element;
  const tag = el.tagName;

  if (tag === 'BR') {
    ctx.parts.push('\n');
    return;
  }

  if (isStylePlaceholderElement(el)) {
    // 样式占位符标签：剥离内容，缓存属性与空壳模板，并在 parts 中使用 <sN>...</sN> 闭合占位
    const clone = el.cloneNode(false) as Element;
    ctx.styleTemplates.push(clone);
    const index = ctx.styleTemplates.length - 1;
    ctx.parts.push(`<s${index}>`);
    for (const child of Array.from(el.childNodes)) {
      encodeNode(ctx, child);
    }
    ctx.parts.push(`</s${index}>`);
    return;
  }

  // KEEP 占位符：非文本类元素、公式 Span 等
  ctx.fragments.push(wrapAsFragment(el.cloneNode(true)));
  ctx.parts.push(`#${ctx.fragments.length}#`);
}

/** 把块级元素的子孙编码为占位文本、Flat 片段及样式模板。 */
export function encodeInline(el: HTMLElement): InlineEncodedBlock {
  const ctx: EncodeContext = { fragments: [], styleTemplates: [], parts: [] };
  for (const child of Array.from(el.childNodes)) {
    encodeNode(ctx, child);
  }
  return {
    placeholderText: ctx.parts.join('').trim(),
    fragments: ctx.fragments,
    styleTemplates: ctx.styleTemplates,
  };
}

/** 是否含「需要翻译的字面字符」（字母 / 数字，覆盖 CJK、西里尔等所有文字系统） */
const TRANSLATABLE_CHAR_RE = /[\p{L}\p{N}]/u;

// nodeType 数值常量：block-detect 在 bun:test + linkedom 环境下调用本函数，
// 该环境没有 Node 全局，不能引用 Node.TEXT_NODE。
const TEXT_NODE_TYPE = 3;
const ELEMENT_NODE_TYPE = 1;

/**
 * 元素内是否存在**会参与翻译**的字面文本（与 `encodeInline` 的编码规则同构）。
 *
 * 存在的意义：只有 `#N#` 占位符、没有字面文本的容器不能作为翻译单元。
 * 典型形态是「文字全在块级子孙里」的容器（如 Reddit 评论头 `<summary>`：
 * 用户名、时间戳各自在嵌套 `<div>` 中）。这类容器编码后只剩
 * `#1# #2# #3#`，模型没有可翻译内容；而渲染时把整棵子树重建成占位符顺序，
 * 会丢失原节点的位置语义（grid 网格项顺序、`slot` 属性归属），实测把
 * `<summary>` 从 36px 撑到 104px。正确做法是交给内部的块级候选各自翻译。
 *
 * 纯遍历实现（不 clone、不建 fragment），可在大批量候选上低成本调用。
 */
export function hasTranslatableText(el: Element): boolean {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === TEXT_NODE_TYPE) {
      if (TRANSLATABLE_CHAR_RE.test(child.textContent ?? '')) return true;
      continue;
    }
    if (child.nodeType !== ELEMENT_NODE_TYPE) continue;

    const childEl = child as Element;
    // <br> 只编码成换行符，本身不是可翻译内容
    if (childEl.tagName === 'BR') continue;
    // 行内样式占位（<sN>）的内部文本会参与翻译 → 递归探测
    if (isStylePlaceholderElement(childEl) && hasTranslatableText(childEl)) return true;
    // 其余元素整体成为 #N# 片段，内部文本不发给模型 → 不算可翻译内容
  }
  return false;
}

function appendTextPreservingBr(container: DocumentFragment | Node, text: string): void {
  if (!text) return;
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (i > 0) container.appendChild(document.createElement('br'));
    if (line) container.appendChild(document.createTextNode(line));
  });
}

/**
 * 还原译文为带有原始样式与链接的 DocumentFragment。
 * 采用基于 DOM 栈（Stack-based）的轻量 HTML-like 解析器，提供极佳的大模型标签幻觉容错。
 *
 * 幻觉兜底（模型输出不可信，必须保证「不丢语义片段、不吞后文」）：
 * 1. 闭合标签缺失 / 解析结束时栈未清空 → 把「平衡点之后」的内容与剩余文本追加到
 *    **根容器**，而不是留在最后一个未闭合的 `<sN>` 里。否则
 *    `<s0>链接文本，<s1>强调</s1> 后续普通文本` 会被还原成
 *    `<a>链接文本，<strong>强调</strong> 后续普通文本</a>`，后半句整段被吞进链接。
 *    例外：整段只有一个未闭合 `<sN>` 且其后没有内容（模型只是漏写收尾）时，
 *    内容留在标签内 —— 不存在「吞后文」，保留标签才能留住链接 / 强调样式。
 * 2. `#N#` 丢失（模型漏写）→ 该片段（代码 / 图片等语义载体）会凭空消失。
 *    解析结束时把未使用的片段按**原文顺序**补回根容器末尾，并 console.warn 记录。
 * 3. `#N#` 重复（模型复读）→ 同一个片段只允许还原一次。后续重复出现的占位符
 *    **直接丢弃**（不还原、也不输出字面 `#N#`）：还原会克隆出重复的 img / code
 *    （重复 id、重复可见内容），而输出字面 `#N#` 会把内部协议标记泄漏到正文里。
 * 4. 不匹配的闭合标签（幻觉杂音）继续直接丢弃，保持原有容错行为。
 */
export function decodeInline(
  translated: string,
  fragments: DocumentFragment[],
  styleTemplates: Element[]
): DocumentFragment {
  const root = document.createDocumentFragment();
  let currentContainer: Node = root;
  const stack: { element: HTMLElement; index: number }[] = [];
  // 已还原的片段序号（1-based，与 `#N#` 一致），用于识别重复与未使用
  const usedFragments = new Set<number>();
  let duplicateCount = 0;

  // 匹配 #N#、<sN> 或 </sN>，不区分大小写
  const TOKEN_REGEX = /(?:#(\d+)#)|(?:<s(\d+)>)|(?:<\/s(\d+)>)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_REGEX.exec(translated)) !== null) {
    const textBetween = translated.slice(lastIndex, match.index);
    if (textBetween) {
      appendTextPreservingBr(currentContainer, textBetween);
    }

    if (match[1] !== undefined) {
      // 1. Flat 占位符 #N# 还原
      const idx = Number(match[1]);
      const frag = fragments[idx - 1];
      if (!frag) {
        // 越界序号纯属幻觉：保留字面文本，避免静默丢弃用户可见字符
        currentContainer.appendChild(document.createTextNode(match[0]));
      } else if (usedFragments.has(idx)) {
        // 重复出现：只还原一次，后续丢弃（见函数头注释第 3 条）
        duplicateCount++;
      } else {
        usedFragments.add(idx);
        currentContainer.appendChild(frag.cloneNode(true));
      }
    } else if (match[2] !== undefined) {
      // 2. 样式占位标签 <sN> 还原（压栈并转移当前容器）
      const idx = Number(match[2]);
      const template = styleTemplates[idx];
      if (template) {
        const newEl = template.cloneNode(false) as HTMLElement;
        currentContainer.appendChild(newEl);
        stack.push({ element: newEl, index: idx });
        currentContainer = newEl;
      } else {
        currentContainer.appendChild(document.createTextNode(match[0]));
      }
    } else if (match[3] !== undefined) {
      // 3. 样式占位闭合标签 </sN> 还原（退栈并恢复容器）
      const idx = Number(match[3]);
      let foundIndex = -1;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].index === idx) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== -1) {
        stack.splice(foundIndex);
        currentContainer = stack.length > 0 ? stack[stack.length - 1].element : root;
      }
      // 如果没有匹配的开启标签则直接丢弃闭合标，容错 LLM 杂音
    }

    lastIndex = TOKEN_REGEX.lastIndex;
  }

  // 4. 闭合标签缺失 / 栈未清空时的兜底。
  //
  //    这里的歧义无法从文本消解，必须先讲清取舍：
  //      `<s0>链接文本，<s1>强调</s1> 后续普通文本`   ← 模型漏写 </s0>
  //      `<s0>这是<s1>重点</s1>后续链接文字`         ← 模型漏写 </s0>
  //    两者结构完全相同，但前者「后续普通文本」应该在外层标签之外，后者
  //    「后续链接文字」应该在外层标签之内。任何基于「平衡点」的启发式都会在
  //    其中一种上判错（复评已实测：平衡点抬升会把后者的文字错误抬出链接）。
  //
  //    因此选择**一致且不丢内容**的行为：尾部内容留在未闭合标签内，不做抬升。
  //    理由：
  //    - 内容永远不会丢（最坏情况是样式范围偏大，视觉可接受）；
  //    - 不会把本属于链接/强调的文字挪到标签外（那是明显的视觉错误）；
  //    - 行为可预测，不随内容长度/嵌套层数漂移。
  //    已闭合的标签不受影响：它们的子节点在闭合时已定型，抬升逻辑只作用于
  //    栈上仍未闭合的元素。
  //
  //    仍然保留 console.warn，让这种模型幻觉可被观测。
  const remaining = translated.slice(lastIndex);
  if (remaining) {
    appendTextPreservingBr(currentContainer, remaining);
  }
  if (stack.length > 0) {
    console.warn(
      '[Translator] decodeInline: unclosed style placeholder(s):',
      stack.map(entry => `<s${entry.index}>`).join(', ')
    );
  }

  // 5. 未使用的 #N#：模型漏写，片段（代码 / 图片等）会凭空消失。
  //    按原文顺序补回末尾，保证语义片段不丢。
  const missingFragments: number[] = [];
  for (let i = 0; i < fragments.length; i++) {
    const idx = i + 1;
    if (usedFragments.has(idx)) continue;
    missingFragments.push(idx);
    root.appendChild(fragments[i].cloneNode(true));
  }
  if (missingFragments.length > 0) {
    console.warn(
      '[Translator] decodeInline: placeholder(s) missing from model output, restored at tail:',
      missingFragments.map(idx => `#${idx}#`).join(', ')
    );
  }
  if (duplicateCount > 0) {
    console.warn(
      `[Translator] decodeInline: ${duplicateCount} duplicated placeholder occurrence(s) dropped`
    );
  }

  return root;
}
