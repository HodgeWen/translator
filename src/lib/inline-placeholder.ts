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

interface EncodedBlock {
  placeholderText: string;
  fragments: DocumentFragment[];
  styleTemplates: Element[];
}

const INLINE_STYLE_TAGS = new Set([
  'STRONG', 'B', 'EM', 'I', 'U', 'SMALL', 'SPAN', 'A',
]);

function isMathLikeSpan(el: Element): boolean {
  if (el.tagName !== 'SPAN') return false;
  const cls = el.getAttribute('class') ?? '';
  return cls.includes('math') || cls.includes('katex');
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
    ctx.parts.push(node.textContent ?? '');
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as Element;
  const tag = el.tagName;

  if (tag === 'BR') {
    ctx.parts.push('\n');
    return;
  }

  if (INLINE_STYLE_TAGS.has(tag) && !isMathLikeSpan(el)) {
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
export function encodeInline(el: HTMLElement): EncodedBlock {
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
 */
export function decodeInline(
  translated: string,
  fragments: DocumentFragment[],
  styleTemplates: Element[]
): DocumentFragment {
  const root = document.createDocumentFragment();
  let currentContainer: Node = root;
  const stack: { element: HTMLElement; index: number }[] = [];

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
      if (frag) {
        currentContainer.appendChild(frag.cloneNode(true));
      } else {
        currentContainer.appendChild(document.createTextNode(match[0]));
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

  const remaining = translated.slice(lastIndex);
  if (remaining) {
    appendTextPreservingBr(currentContainer, remaining);
  }

  return root;
}

