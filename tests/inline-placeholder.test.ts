import { beforeEach, describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import { decodeInline, encodeInline, hasTranslatableText } from '../src/lib/inline-placeholder';

// decodeInline / encodeInline 直接使用全局 document / Node：用 linkedom 装一个最小 DOM。
// 每个用例前重建，避免 fragment 之间的 document 交叉引用。
let document: Document;

beforeEach(() => {
  const parsed = parseHTML('<!doctype html><html><body></body></html>');
  document = parsed.document as unknown as Document;
  const g = globalThis as unknown as Record<string, unknown>;
  g.document = document;
  g.Node = (parsed as unknown as Record<string, unknown>).Node ?? {
    TEXT_NODE: 3,
    ELEMENT_NODE: 1,
  };
});

// linkedom 的 DocumentFragment 没有实现 textContent（返回 null），
// 这里用一个临时容器把 fragment 的内容搬进去取文本（搬动不影响断言对象）。
function textOf(frag: DocumentFragment): string {
  const holder = document.createElement('div');
  holder.appendChild(frag.cloneNode(true));
  return holder.textContent ?? '';
}

/** 构造与 encodeInline 输出结构一致的空壳样式模板 */
function styleTemplate(tag: string): Element {
  return document.createElement(tag);
}

function textFragment(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode(text));
  return frag;
}

function elementFragment(tag: string, text: string, attrs: Record<string, string> = {}): DocumentFragment {
  const frag = document.createDocumentFragment();
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  el.textContent = text;
  frag.appendChild(el);
  return frag;
}

describe('decodeInline 正常路径', () => {
  test('纯文本原样还原', () => {
    const frag = decodeInline('你好世界', [], []);
    expect(textOf(frag)).toBe('你好世界');
    expect(frag.childNodes.length).toBe(1);
  });

  test('嵌套 <sN> 正确还原为原标签结构', () => {
    const templates = [styleTemplate('a'), styleTemplate('strong')];
    const frag = decodeInline('<s0>链接<s1>强调</s1>结尾</s0>', [], templates);
    const anchor = frag.firstChild as Element;
    expect(anchor.tagName).toBe('A');
    expect(anchor.textContent).toBe('链接强调结尾');
    const strong = anchor.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('强调');
  });

  test('#N# 还原为原片段（含属性）', () => {
    const fragments = [elementFragment('code', 'const a = 1', { class: 'hljs' })];
    const frag = decodeInline('代码 #1# 结束', fragments, []);
    const code = frag.querySelector('code');
    expect(code?.textContent).toBe('const a = 1');
    expect(code?.getAttribute('class')).toBe('hljs');
    expect(textOf(frag)).toBe('代码 const a = 1 结束');
  });

  test('\\n 还原为 <br>', () => {
    const frag = decodeInline('第一行\n第二行', [], []);
    expect(frag.querySelectorAll('br').length).toBe(1);
    expect(textOf(frag)).toBe('第一行第二行');
  });

  test('不匹配的闭合标签被丢弃（保持既有幻觉容错）', () => {
    const frag = decodeInline('前</s9>后', [], [styleTemplate('a')]);
    expect(textOf(frag)).toBe('前后');
  });
});

describe('decodeInline 幻觉兜底：闭合标签缺失', () => {
  test('末尾缺 </sN> 时内容完整保留（不丢字符），且仍留在未闭合标签内', () => {
    const templates = [styleTemplate('a'), styleTemplate('strong')];
    // 模型漏写外层 </s0>。此处存在无法消解的歧义：
    //   `<s0>链接文本，<s1>强调</s1> 后续普通文本`（后文该在标签外）
    // 与 `<s0>这是<s1>重点</s1>后续链接文字`（后文该在标签内）结构完全相同。
    // 取舍：一律留在标签内 —— 内容永不丢，且不会把属于链接的文字挪到标签外。
    // 见 inline-placeholder.ts 第 4 节注释。
    const frag = decodeInline('<s0>链接文本，<s1>强调</s1> 后续普通文本', [], templates);

    const anchor = frag.firstChild as Element;
    expect(anchor.tagName).toBe('A');
    // 关键：全部文本都在，一个字符都没丢
    expect(textOf(frag)).toBe('链接文本，强调 后续普通文本');
    expect(anchor.textContent).toBe('链接文本，强调 后续普通文本');
  });

  test('正常嵌套只缺外层闭合：内层样式保留、文字不被抬出外层', () => {
    const templates = [styleTemplate('a'), styleTemplate('strong')];
    // 复评实测的误判输入：平衡点抬升会把「后续链接文字」挪到链接外，丢外层样式
    const frag = decodeInline('<s0>这是<s1>重点</s1>后续链接文字', [], templates);

    const anchor = frag.firstChild as Element;
    expect(anchor.tagName).toBe('A');
    expect(anchor.textContent).toBe('这是重点后续链接文字');
    // 内层 <strong> 仍然嵌套在 <a> 内，样式结构未被破坏
    expect(anchor.querySelector('strong')?.textContent).toBe('重点');
  });

  test('整段只有一个未闭合 <sN>（无平衡点）：内容留在标签内，链接不丢', () => {
    const frag = decodeInline('<s0>前半句 后半句', [], [styleTemplate('a')]);
    const anchor = frag.firstChild as Element;
    expect(anchor.tagName).toBe('A');
    // 标签之后没有任何内容，不存在「吞后文」；保留标签才能留住链接
    expect(anchor.textContent).toBe('前半句 后半句');
    expect(textOf(frag)).toBe('前半句 后半句');
  });

  test('未闭合标签内的占位符片段仍能正确还原（内容不丢）', () => {
    const fragments = [elementFragment('code', 'CODE')];
    const templates = [styleTemplate('a'), styleTemplate('strong')];
    const frag = decodeInline('<s0>链接<s1>强调</s1>后文 #1# 尾巴', fragments, templates);

    const anchor = frag.firstChild as Element;
    expect(anchor.tagName).toBe('A');
    // 全文内容完整：链接文字、强调、后文、代码片段、尾巴都在
    expect(textOf(frag)).toBe('链接强调后文 CODE 尾巴');
    expect(frag.querySelector('code')?.textContent).toBe('CODE');
  });

  test('栈未清空时 console.warn 记录未闭合占位符', () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '));
    };
    try {
      decodeInline('<s0>链接<s1>强调</s1>后文', [], [styleTemplate('a'), styleTemplate('strong')]);
    } finally {
      console.warn = originalWarn;
    }
    expect(warnings.some(text => text.includes('<s0>'))).toBe(true);
  });
});

describe('decodeInline 幻觉兜底：#N# 丢失 / 重复', () => {
  test('模型漏写 #N#：片段按原文顺序补回末尾', () => {
    const fragments = [
      elementFragment('code', 'A'),
      elementFragment('img', ''),
    ];
    // 模型只写了 #1#，漏掉 #2#
    const frag = decodeInline('代码 #1# 之后', fragments, []);
    const codes = frag.querySelectorAll('code');
    const images = frag.querySelectorAll('img');
    expect(codes.length).toBe(1);
    expect(images.length).toBe(1); // 未使用的片段被补回
    expect(textOf(frag)).toBe('代码 A 之后');
    // 补回的片段在末尾（根容器最后子节点）
    const last = frag.lastChild as Element;
    expect(last.tagName).toBe('IMG');
  });

  test('全部 #N# 丢失：所有片段按序补回', () => {
    const fragments = [
      elementFragment('code', 'first'),
      elementFragment('img', ''),
    ];
    const frag = decodeInline('只有文字', fragments, []);
    const tags = Array.from(frag.childNodes).map(node => (node as Element).tagName ?? '#text');
    expect(tags).toEqual(['#text', 'CODE', 'IMG']);
  });

  test('#N# 重复：同一片段只还原一次，重复出现被丢弃', () => {
    const fragments = [elementFragment('code', 'X')];
    const frag = decodeInline('#1# 中间 #1# 结尾 #1#', fragments, []);
    expect(frag.querySelectorAll('code').length).toBe(1);
    // 重复占位符不泄漏字面 #1#
    expect(textOf(frag)).not.toContain('#1#');
    expect(textOf(frag)).toContain('中间');
    expect(textOf(frag)).toContain('结尾');
  });

  test('重复 #N# 的丢弃行为有 console.warn 记录', () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '));
    };
    try {
      decodeInline('#1# #1#', [elementFragment('code', 'X')], []);
    } finally {
      console.warn = originalWarn;
    }
    expect(warnings.some(text => text.includes('duplicated'))).toBe(true);
  });

  test('越界 #N# 保留字面文本（不静默吞字符）', () => {
    const frag = decodeInline('前 #9# 后', [], []);
    expect(textOf(frag)).toBe('前 #9# 后');
  });

  test('未使用片段的补回有 console.warn 记录', () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '));
    };
    try {
      decodeInline('无占位符', [elementFragment('code', 'X')], []);
    } finally {
      console.warn = originalWarn;
    }
    expect(warnings.some(text => text.includes('#1#'))).toBe(true);
  });
});

describe('encodeInline → decodeInline 往返', () => {
  test('含行内样式与代码片段的段落往返后结构等价', () => {
    const p = document.createElement('p') as HTMLElement;
    p.innerHTML = 'Hello <b>world</b> and <code>code()</code> here';
    const encoded = encodeInline(p);

    expect(encoded.fragments.length).toBe(1);
    expect(encoded.styleTemplates.length).toBe(1);
    expect(encoded.placeholderText).toBe('Hello <s0>world</s0> and #1# here');

    const decoded = decodeInline(encoded.placeholderText, encoded.fragments, encoded.styleTemplates);
    const b = decoded.querySelector('b');
    const code = decoded.querySelector('code');
    expect(b?.textContent).toBe('world');
    expect(code?.textContent).toBe('code()');
    expect(textOf(decoded)).toBe('Hello world and code() here');
  });
});

describe('encodeInline 排版空白折叠（不得产生 <br>）', () => {
  // 回归：Reddit 评论头 <summary> 的文本全在嵌套块级 div 里，编码后只剩
  // `#1#\n  #2#\n  #3#`；decodeInline 把标记之间的缩进换行还原成 <br>，
  // 往 CSS grid 容器里多塞 2 个 <br>，实测把 36px 撑到 104px、整页结构崩坏。
  test('块级子元素之间的缩进换行折叠为空格，不再编码成 \\n', () => {
    const summary = document.createElement('summary') as HTMLElement;
    summary.innerHTML =
      '\n  <div class="avatar">A</div>\n  <div class="meta">B</div>\n  <div class="actions">C</div>\n';
    const encoded = encodeInline(summary);

    expect(encoded.placeholderText.includes('\n')).toBe(false);
    expect(encoded.placeholderText).toBe('#1# #2# #3#');
  });

  test('往返后不注入任何 <br>（grid / flex 容器布局不被撑开）', () => {
    const summary = document.createElement('summary') as HTMLElement;
    summary.innerHTML = '\n  <div>A</div>\n  <div>B</div>\n';
    const encoded = encodeInline(summary);

    const decoded = decodeInline(encoded.placeholderText, encoded.fragments, encoded.styleTemplates);
    const holder = document.createElement('div');
    holder.appendChild(decoded);
    expect(holder.querySelectorAll('br').length).toBe(0);
    // 三个片段全部还原，内容不丢
    expect(holder.querySelectorAll('div').length).toBe(2);
  });

  test('显式 <br> 仍然编码为 \\n 并在还原时变回 <br>（语义换行不受影响）', () => {
    const p = document.createElement('p') as HTMLElement;
    p.innerHTML = 'line one<br>line two';
    const encoded = encodeInline(p);
    expect(encoded.placeholderText).toBe('line one\nline two');

    const decoded = decodeInline(encoded.placeholderText, encoded.fragments, encoded.styleTemplates);
    const holder = document.createElement('div');
    holder.appendChild(decoded);
    expect(holder.querySelectorAll('br').length).toBe(1);
    expect(holder.textContent).toBe('line oneline two');
  });

  test('含换行的空白段折叠为一个空格；纯空格与 NBSP 原样保留', () => {
    const p = document.createElement('p') as HTMLElement;
    p.textContent = 'a  b\u00a0c\nd';
    const encoded = encodeInline(p);
    // 换行是唯一会被 decodeInline 还原成 <br> 的字符，必须折叠成空格；
    // 纯空格段（"a  b"）与 NBSP 在渲染上本就等价 / 有断行语义，保持原样 ——
    // 既不注入 <br>，也不让缓存键无谓漂移（缓存键含请求文本）。
    expect(encoded.placeholderText).toBe('a  b\u00a0c d');
  });

  test('纯空格段不折叠（渲染等价，且保住既有缓存键）', () => {
    const p = document.createElement('p') as HTMLElement;
    p.textContent = 'red.  Piece';
    const encoded = encodeInline(p);
    // 双空格在 white-space: normal 下渲染为单空格，折叠与否视觉一致；
    // 不折叠可以让升级前的缓存条目继续命中。
    expect(encoded.placeholderText).toBe('red.  Piece');
  });

  test('多词正文的空格保留（不粘连成一句）', () => {
    const p = document.createElement('p') as HTMLElement;
    p.innerHTML = 'Hello <b>big</b> world';
    const encoded = encodeInline(p);
    expect(encoded.placeholderText).toBe('Hello <s0>big</s0> world');
  });

  test('「既有字面文本又有块级子元素」的容器同样不注入 <br>（第二道防线）', () => {
    // 这类容器 hasTranslatableText 为 true、仍会作为翻译单元，因此必须靠
    // 编码期的空白折叠保证 <br> 不被还原出来。
    const div = document.createElement('div') as HTMLElement;
    div.innerHTML = '\n  Some intro text\n  <div class="child">nested</div>\n  tail text\n';
    const encoded = encodeInline(div);

    expect(encoded.placeholderText.includes('\n')).toBe(false);
    const decoded = decodeInline(encoded.placeholderText, encoded.fragments, encoded.styleTemplates);
    const holder = document.createElement('div');
    holder.appendChild(decoded);
    expect(holder.querySelectorAll('br').length).toBe(0);
  });
});

describe('hasTranslatableText：区分「有字面文本」与「只剩占位符」', () => {
  test('直接文本 → true', () => {
    const p = document.createElement('p') as HTMLElement;
    p.textContent = 'Hello world';
    expect(hasTranslatableText(p)).toBe(true);
  });

  test('行内样式子元素的文本参与翻译 → true', () => {
    const p = document.createElement('p') as HTMLElement;
    p.innerHTML = '<a href="#">link text</a>';
    expect(hasTranslatableText(p)).toBe(true);
  });

  test('文本全在块级子孙里（Reddit 评论头形态）→ false', () => {
    const summary = document.createElement('summary') as HTMLElement;
    summary.innerHTML =
      '<div><div><span><a href="#">nitor999</a></span></div></div>' +
      '<div slot="commentMeta"><div><span>•</span><time>1个月前</time></div></div>';
    expect(hasTranslatableText(summary)).toBe(false);
  });

  test('只有 <br> 与空白 → false（<br> 只编码成换行符）', () => {
    const p = document.createElement('p') as HTMLElement;
    p.innerHTML = ' <br> \n <br> ';
    expect(hasTranslatableText(p)).toBe(false);
  });

  test('代码片段（#N# 整体保留）不构成可翻译文本 → false', () => {
    const p = document.createElement('p') as HTMLElement;
    p.innerHTML = '<code>const a = 1</code>';
    expect(hasTranslatableText(p)).toBe(false);
  });

  test('中文字面文本（无空格）同样识别 → true', () => {
    const p = document.createElement('p') as HTMLElement;
    p.textContent = '中文段落';
    expect(hasTranslatableText(p)).toBe(true);
  });

  test('纯标点 / 空白 → false', () => {
    const p = document.createElement('p') as HTMLElement;
    p.textContent = ' — · ... ';
    expect(hasTranslatableText(p)).toBe(false);
  });
});
