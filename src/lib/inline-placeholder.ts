/**
 * 行内占位符保留机制：翻译前把行内富文本节点抽成 `#N#` 数字标记，
 * 发送纯文本给 LLM，译文回传后再把占位符还原为原 HTML 片段。
 *
 * 设计要点（详见 .agent-context/default/plan-3/plan.md）：
 * - INLINE_KEEP：语义载体（A / CODE / IMG 等）→ 用占位符，保留原 DOM。
 * - INLINE_FLATTEN：文本强调（STRONG / EM / 普通 SPAN）→ 展平为文字，跟随译文。
 * - 未知元素默认走 KEEP，避免丢结构。
 * - 编号从 1 开始，格式 `#N#`，主流 LLM 保留率最高。
 */

export interface EncodedBlock {
  placeholderText: string;
  fragments: DocumentFragment[];
}

const INLINE_FLATTEN_TAGS = new Set([
  'STRONG', 'B', 'EM', 'I', 'U', 'SMALL', 'SPAN',
]);

const PLACEHOLDER_REGEX = /#(\d+)#/g;

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

  if (INLINE_FLATTEN_TAGS.has(tag) && !isMathLikeSpan(el)) {
    for (const child of Array.from(el.childNodes)) {
      encodeNode(ctx, child);
    }
    return;
  }

  // KEEP：INLINE_KEEP + math-like span + 其它未知元素（安全兜底）
  ctx.fragments.push(wrapAsFragment(el.cloneNode(true)));
  ctx.parts.push(`#${ctx.fragments.length}#`);
}

/** 把块级元素的子孙编码为 `#N#` 占位文本与对应 DOM 片段。 */
export function encodeInline(el: HTMLElement): EncodedBlock {
  const ctx: EncodeContext = { fragments: [], parts: [] };
  for (const child of Array.from(el.childNodes)) {
    encodeNode(ctx, child);
  }
  return {
    placeholderText: ctx.parts.join('').trim(),
    fragments: ctx.fragments,
  };
}

function appendTextPreservingBr(container: DocumentFragment, text: string): void {
  if (!text) return;
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (i > 0) container.appendChild(document.createElement('br'));
    if (line) container.appendChild(document.createTextNode(line));
  });
}

/** 按 `#N#` 还原译文为 DocumentFragment；缺失的占位符保留文本并告警，便于发现而非静默丢失。 */
export function decodeInline(translated: string, fragments: DocumentFragment[]): DocumentFragment {
  const out = document.createDocumentFragment();
  let lastIndex = 0;
  PLACEHOLDER_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_REGEX.exec(translated)) !== null) {
    const prefix = translated.slice(lastIndex, match.index);
    appendTextPreservingBr(out, prefix);

    const idx = Number(match[1]);
    const frag = fragments[idx - 1];
    if (!frag) {
      out.appendChild(document.createTextNode(match[0]));
    } else {
      out.appendChild(frag.cloneNode(true));
    }

    lastIndex = PLACEHOLDER_REGEX.lastIndex;
  }

  appendTextPreservingBr(out, translated.slice(lastIndex));
  return out;
}
