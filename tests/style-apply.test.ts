import { beforeEach, describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import type { DisplayStyle } from '../src/types';
import {
  state,
  getAutoRetryCount,
  consumeAutoRetry,
  resetAutoRetryCount,
  resetAllAutoRetryCounts,
} from '../src/entrypoints/content/state';
import {
  MAX_AUTO_RETRIES,
  shouldAutoRetry,
  injectStylesIntoShadowRoot,
} from '../src/entrypoints/content/observer';
import {
  applyTranslation,
  restoreAll,
  toggleAllDisplay,
  toggleElementDisplay,
} from '../src/entrypoints/content/style-apply';

// style-apply 依赖全局 document / window / requestAnimationFrame：
// 用 linkedom 装最小 DOM，并把 rAF 降级成 setTimeout（bun 无原生 rAF）。
// state / elementMap 是模块级单例，用例之间共享；每个用例前通过 resetState 复位。
// 注意：不能用带 query 的动态 import 造新实例 —— style-apply 内部 `import { state }
// from './state'` 解析到的是无 query 的那份实例，状态会与实际使用的不一致。

let document: Document;

/** 复位模块级单例状态（不重建 DOM，DOM 由各用例自行 setupDom） */
function resetState(displayStyle: DisplayStyle): void {
  state.elementMap.clear();
  state.pendingAggregateElements.clear();
  state.isActive = true;
  state.displayMode = 'translation';
  state.displayStyle = displayStyle;
}

/** 等待 scheduleDOMUpdate 的分片队列执行完（每帧 CHUNK_SIZE=4 条） */
async function flushDomUpdates(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
}

function setupDom(html: string): void {
  const parsed = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  document = parsed.document as unknown as Document;
  const g = globalThis as unknown as Record<string, unknown>;
  g.document = document;
  g.window = parsed.window;
  g.Node = (parsed as unknown as Record<string, unknown>).Node ?? { TEXT_NODE: 3, ELEMENT_NODE: 1 };
  g.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  };
  g.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
  };
}

/** 渲染 inline 结果所需的空参数（无占位符） */
function inlineRender(translatedText: string) {
  return {
    kind: 'inline' as const,
    translatedText,
    placeholderText: '',
    fragments: [] as DocumentFragment[],
    styleTemplates: [] as Element[],
  };
}

function paragraph(id: string): HTMLElement {
  return document.getElementById(id) as unknown as HTMLElement;
}

beforeEach(() => {
  setupDom('<p id="p1">Hello <b>world</b> and <a href="#x">link</a></p>');
});

describe('original / clean 原地渲染：原元素不离树', () => {
  for (const style of ['original', 'clean'] as const) {
    test(`${style} 模式翻译后原元素仍在 DOM 中、id 保留`, async () => {
      resetState(style);
      const el = paragraph('p1');
      expect(el.isConnected).toBe(true);

      applyTranslation(el, inlineRender('你好 世界'));
      await flushDomUpdates();

      // 关键回归：原节点没有被 replaceWith 掉
      expect(el.isConnected).toBe(true);
      expect(document.getElementById('p1')).toBe(el);
      expect(el.id).toBe('p1');
      // 内容被替换成译文
      expect(el.textContent).toBe('你好 世界');
      expect(el.hasAttribute('data-translator-processed')).toBe(true);
      // 旧的 wrapper 机制产物不应再出现
      expect(document.querySelector('[data-translator-clone]')).toBeNull();
      expect(document.querySelectorAll('p').length).toBe(1);
    });
  }

  test('元素级事件监听器在翻译后仍然有效（不再整棵离树）', async () => {
    resetState('original');
    const el = paragraph('p1');
    let clicks = 0;
    el.addEventListener('click', () => {
      clicks++;
    });

    applyTranslation(el, inlineRender('译文'));
    await flushDomUpdates();

    el.dispatchEvent(new (globalThis as unknown as { window: { Event: typeof Event } }).window.Event('click'));
    expect(clicks).toBe(1);
  });

  test('译文保留行内样式结构（<sN> 还原进原元素内部）', async () => {
    resetState('original');
    const el = paragraph('p1');
    const strong = document.createElement('strong');

    applyTranslation(el, {
      kind: 'inline',
      translatedText: '你好 <s0>世界</s0>',
      placeholderText: '',
      fragments: [],
      styleTemplates: [strong],
    });
    await flushDomUpdates();

    expect(el.isConnected).toBe(true);
    const inner = el.querySelector('strong');
    expect(inner).not.toBeNull();
    expect(inner?.textContent).toBe('世界');
  });

  test('还原后子节点引用与翻译前一致（数组保存原节点，不用 fragment）', async () => {
    resetState('original');
    const el = paragraph('p1');
    const before = Array.from(el.childNodes);

    applyTranslation(el, inlineRender('译文'));
    await flushDomUpdates();
    expect(Array.from(el.childNodes)).not.toEqual(before);

    restoreAll();
    await flushDomUpdates();

    const after = Array.from(el.childNodes);
    expect(after.length).toBe(before.length);
    // 同一批节点对象（引用一致），而不是重建的等价节点
    after.forEach((node, index) => {
      expect(node).toBe(before[index]);
    });
    expect(el.textContent).toBe('Hello world and link');
    expect(el.hasAttribute('data-translator-processed')).toBe(false);
    expect(el.isConnected).toBe(true);
  });

  test('还原后 <b> 等内联元素仍是原节点（样式随之保留）', async () => {
    resetState('clean');
    const el = paragraph('p1');
    const boldBefore = el.querySelector('b');

    applyTranslation(el, inlineRender('译文'));
    await flushDomUpdates();
    expect(el.querySelector('b')).toBeNull();

    restoreAll();
    await flushDomUpdates();
    expect(el.querySelector('b')).toBe(boldBefore);
  });
});

describe('toggleElementDisplay 原地切换', () => {
  test('原文 ↔ 译文反复切换：元素不换、原节点不丢', async () => {
    resetState('original');
    const el = paragraph('p1');
    const before = Array.from(el.childNodes);

    applyTranslation(el, inlineRender('译文'));
    await flushDomUpdates();

    // 译文 → 原文
    toggleElementDisplay(el);
    expect(el.textContent).toBe('Hello world and link');
    expect(el.isConnected).toBe(true);

    // 原文 → 译文
    toggleElementDisplay(el);
    expect(el.textContent).toBe('译文');
    expect(el.isConnected).toBe(true);

    // 再切回原文：仍是同一批原节点
    toggleElementDisplay(el);
    const after = Array.from(el.childNodes);
    after.forEach((node, index) => {
      expect(node).toBe(before[index]);
    });
  });

  test('toggleAllDisplay 全页切换不替换元素节点', async () => {
    resetState('original');
    const el = paragraph('p1');
    applyTranslation(el, inlineRender('译文'));
    await flushDomUpdates();

    toggleAllDisplay(true);
    await flushDomUpdates();
    expect(el.textContent).toBe('Hello world and link');
    expect(document.getElementById('p1')).toBe(el);

    toggleAllDisplay(false);
    await flushDomUpdates();
    expect(el.textContent).toBe('译文');
    expect(document.getElementById('p1')).toBe(el);
  });
});

describe('bilingual / underline 原地渲染契约', () => {
  test('bilingual：原 el 保留、追加双语 span、toggle 只改 display', async () => {
    setupDom('<p id="p1">Hello <b>world</b></p>');
    resetState('bilingual');
    const el = paragraph('p1');

    applyTranslation(el, inlineRender('你好'));
    await flushDomUpdates();

    expect(el.isConnected).toBe(true);
    expect(el.id).toBe('p1');
    // 原文仍在（bilingual 追加而不替换）
    expect(el.textContent).toContain('Hello world');
    const biling = el.querySelector('[data-translator-bilingual]');
    expect(biling?.textContent).toBe('你好');
    expect(el.querySelector('[data-translator-br]')).not.toBeNull();

    toggleElementDisplay(el);
    expect((biling as HTMLElement).style.display).toBe('none');
    toggleElementDisplay(el);
    expect((biling as HTMLElement).style.display).toBe('');
    expect(el.isConnected).toBe(true);
  });

  test('underline：原 el 保留、内容换成 underline span，还原后原节点回归', async () => {
    setupDom('<p id="p1">Hello <b>world</b></p>');
    resetState('underline');
    const el = paragraph('p1');
    const before = Array.from(el.childNodes);

    applyTranslation(el, inlineRender('你好'));
    await flushDomUpdates();

    expect(el.isConnected).toBe(true);
    expect(el.id).toBe('p1');
    const underline = el.querySelector('[data-translator-underline]');
    expect(underline?.textContent).toBe('你好');
    expect(underline?.getAttribute('title')).toBe('Hello world');

    restoreAll();
    await flushDomUpdates();
    const after = Array.from(el.childNodes);
    after.forEach((node, index) => {
      expect(node).toBe(before[index]);
    });
    expect(el.isConnected).toBe(true);
  });
});

describe('restoreAll 语义不变', () => {
  test('停止翻译后全部段落回到原文、processed 标记清除', async () => {
    setupDom('<p id="p1">Hello <b>world</b></p><p id="p2">Second paragraph</p>');
    resetState('original');
    const p1 = paragraph('p1');
    const p2 = paragraph('p2');

    applyTranslation(p1, inlineRender('译文一'));
    applyTranslation(p2, inlineRender('译文二'));
    await flushDomUpdates();
    expect(p1.textContent).toBe('译文一');

    restoreAll();
    await flushDomUpdates();

    expect(p1.textContent).toBe('Hello world');
    expect(p2.textContent).toBe('Second paragraph');
    expect(p1.hasAttribute('data-translator-processed')).toBe(false);
    expect(p2.hasAttribute('data-translator-processed')).toBe(false);
    expect(state.elementMap.size).toBe(0);
    // 元素仍是原来的节点
    expect(document.getElementById('p1')).toBe(p1);
  });
});

// ─── 失败段落自动重试上限（observer.ts 侧判定 + state.ts 计数） ───────────
//
// 说明：重试判定与计数归属 observer.ts / state.ts，但本次改动的测试文件
// 写作用域限定在 inline-placeholder / style-apply 两个文件，故集中放在这里，
// 用独立 describe 分组，便于后续拆出。
describe('失败段落自动重试上限', () => {
  test('未超限：error + 冷却已过 → 允许重试', () => {
    expect(shouldAutoRetry('error', 1_000, 20_000, 0)).toBe(true);
    expect(shouldAutoRetry('error', 1_000, 20_000, 1)).toBe(true);
    expect(shouldAutoRetry('error', 1_000, 20_000, MAX_AUTO_RETRIES - 1)).toBe(true);
  });

  test('超限：重试次数达到上限后不再自动重试', () => {
    expect(shouldAutoRetry('error', 1_000, 20_000, MAX_AUTO_RETRIES)).toBe(false);
    expect(shouldAutoRetry('error', 1_000, 100_000, MAX_AUTO_RETRIES + 5)).toBe(false);
  });

  test('冷却未到 / 非 error 状态 → 不重试（沿用 shouldRetryError 语义）', () => {
    expect(shouldAutoRetry('error', 1_000, 5_000, 0)).toBe(false);
    expect(shouldAutoRetry('translated', 1_000, 20_000, 0)).toBe(false);
    expect(shouldAutoRetry('idle', 1_000, 20_000, 0)).toBe(false);
    expect(shouldAutoRetry('pending', 1_000, 20_000, 0)).toBe(false);
    expect(shouldAutoRetry('error', undefined, 20_000, 0)).toBe(false);
  });

  test('MAX_AUTO_RETRIES 为有名字的常量且值为 3', () => {
    expect(MAX_AUTO_RETRIES).toBe(3);
  });

  test('计数跨 elementMap 条目删除存活（重试流程会先删条目）', () => {
    const el = document.createElement('p') as unknown as HTMLElement;
    expect(getAutoRetryCount(el)).toBe(0);

    consumeAutoRetry(el);
    consumeAutoRetry(el);
    expect(getAutoRetryCount(el)).toBe(2);

    // 模拟观察者重试前的清理：删 elementMap 条目不影响计数
    state.elementMap.delete(el);
    expect(getAutoRetryCount(el)).toBe(2);
  });

  test('手动重置：单段清零与全局清零都回到 0', () => {
    const el = document.createElement('p') as unknown as HTMLElement;
    consumeAutoRetry(el);
    expect(getAutoRetryCount(el)).toBe(1);

    resetAutoRetryCount(el);
    expect(getAutoRetryCount(el)).toBe(0);

    consumeAutoRetry(el);
    consumeAutoRetry(el);
    expect(getAutoRetryCount(el)).toBe(2);

    resetAllAutoRetryCounts();
    expect(getAutoRetryCount(el)).toBe(0);
  });

  test('翻译成功清零计数（applyTranslation 内调用）', async () => {
    setupDom('<p id="p1">Hello <b>world</b></p>');
    resetState('original');
    const el = paragraph('p1');
    consumeAutoRetry(el);
    consumeAutoRetry(el);
    expect(getAutoRetryCount(el)).toBe(2);

    applyTranslation(el, inlineRender('译文'));
    await flushDomUpdates();

    expect(getAutoRetryCount(el)).toBe(0);
  });
});

// ─── pending / error 条目不可切换（避免把段落清空） ───────────────────────
describe('toggleElementDisplay 只对已翻译段落生效', () => {
  test('pending 条目切换是 no-op，段落内容不丢', async () => {
    setupDom('<p id="p1">Hello <b>world</b></p>');
    resetState('original');
    const el = paragraph('p1');
    // 手工造一个 pending 快照（applyTranslation 在调度前写入的形态）
    state.elementMap.set(el, {
      originalHTML: el.innerHTML,
      translatedText: '译文',
      status: 'pending',
      showingOriginal: false,
    });

    toggleElementDisplay(el);
    expect(el.textContent).toBe('Hello world');
    expect(el.isConnected).toBe(true);
    expect(state.elementMap.get(el)?.showingOriginal).toBe(false);
  });

  test('error 条目切换是 no-op，段落内容不丢', () => {
    setupDom('<p id="p1">Hello <b>world</b></p>');
    resetState('original');
    const el = paragraph('p1');
    state.elementMap.set(el, {
      originalHTML: el.innerHTML,
      translatedText: '',
      status: 'error',
      showingOriginal: false,
      errorAt: 1,
      retryCount: 1,
    });

    toggleElementDisplay(el);
    expect(el.textContent).toBe('Hello world');
    expect(el.isConnected).toBe(true);
  });
});

// ─── Shadow DOM 样式注入（问题 F） ────────────────────────────────────────
describe('shadow root 样式注入', () => {
  test('注入成功且带幂等标记，重复注入不重复插入', () => {
    setupDom('<div id="host"></div>');
    const host = document.getElementById('host') as unknown as HTMLElement;
    const shadow = host.attachShadow({ mode: 'open' });

    expect(injectStylesIntoShadowRoot(shadow, '[data-translator-bilingual]{color:red}')).toBe(true);
    const styles = shadow.querySelectorAll('style[data-translator-shadow-style]');
    expect(styles.length).toBe(1);
    expect(styles[0].textContent).toContain('[data-translator-bilingual]');

    // 幂等：第二次不写入
    expect(injectStylesIntoShadowRoot(shadow, '[data-translator-bilingual]{color:blue}')).toBe(false);
    expect(shadow.querySelectorAll('style[data-translator-shadow-style]').length).toBe(1);
    expect(shadow.querySelector('style[data-translator-shadow-style]')?.textContent)
      .toContain('color:red');
  });

  test('样式文本为空时不注入（不留空 <style>）', () => {
    setupDom('<div id="host"></div>');
    const host = document.getElementById('host') as unknown as HTMLElement;
    const shadow = host.attachShadow({ mode: 'open' });
    expect(injectStylesIntoShadowRoot(shadow, '')).toBe(false);
    expect(shadow.querySelector('style[data-translator-shadow-style]')).toBeNull();
  });

  test('无显式文本时回落到 document.styleSheets 提取本扩展样式', () => {
    setupDom('<div id="host"></div>');
    const host = document.getElementById('host') as unknown as HTMLElement;
    const shadow = host.attachShadow({ mode: 'open' });

    // 模拟浏览器里 manifest 注入的 content.css（同源可读 cssRules）。
    // 混入一张「别的扩展」的样式表，验证指纹过滤只挑本扩展那张。
    const fakeSheets = [
      { cssRules: [{ cssText: '.unrelated { color: pink; }' }] },
      { cssRules: [
        { cssText: '[data-translator-pending] { opacity: 0.2; }' },
        { cssText: '[data-translator-bilingual] { all: revert; }' },
        { cssText: '[data-translator-underline] { cursor: help; }' },
      ] },
    ];
    const originalSheets = (document as unknown as { styleSheets?: unknown }).styleSheets;
    Object.defineProperty(document, 'styleSheets', { value: fakeSheets, configurable: true });
    try {
      expect(injectStylesIntoShadowRoot(shadow)).toBe(true);
    } finally {
      Object.defineProperty(document, 'styleSheets', { value: originalSheets, configurable: true });
    }

    const text = shadow.querySelector('style[data-translator-shadow-style]')?.textContent ?? '';
    expect(text).toContain('[data-translator-pending]');
    expect(text).toContain('[data-translator-bilingual]');
    expect(text).toContain('[data-translator-underline]');
    // 只取本扩展那张表
    expect(text).not.toContain('.unrelated');
  });

  test('跨域样式表（cssRules 抛错）被跳过，不影响注入', () => {
    setupDom('<div id="host"></div>');
    const host = document.getElementById('host') as unknown as HTMLElement;
    const shadow = host.attachShadow({ mode: 'open' });

    const fakeSheets = [
      {
        get cssRules(): never {
          throw new Error('SecurityError');
        },
      },
      { cssRules: [{ cssText: '[data-translator-bilingual] { all: revert; }' }] },
    ];
    Object.defineProperty(document, 'styleSheets', { value: fakeSheets, configurable: true });
    try {
      expect(injectStylesIntoShadowRoot(shadow)).toBe(true);
    } finally {
      Object.defineProperty(document, 'styleSheets', { value: undefined, configurable: true });
    }
    const text = shadow.querySelector('style[data-translator-shadow-style]')?.textContent ?? '';
    expect(text).toContain('[data-translator-bilingual]');
  });
});

// ─── 原地渲染的边界：未渲染条目 / 调度竞态 ────────────────────────────────
describe('restoreAll 不触碰未渲染段落', () => {
  test('error / idle 条目的子节点引用不被重建（监听器不失效）', async () => {
    setupDom('<p id="p1">Hello <b>world</b></p><p id="p2">Second paragraph</p>');
    resetState('original');
    const p1 = paragraph('p1');
    const p2 = paragraph('p2');
    const boldBefore = p1.querySelector('b');
    const textBefore = Array.from(p2.childNodes);

    // 手工写入「从未渲染过译文」的条目（error / idle 的真实形态）
    state.elementMap.set(p1, {
      originalHTML: p1.innerHTML,
      translatedText: '',
      status: 'error',
      showingOriginal: false,
      errorAt: 1,
    });
    state.elementMap.set(p2, {
      originalHTML: p2.innerHTML,
      translatedText: '',
      status: 'idle',
      showingOriginal: false,
    });

    restoreAll();
    await flushDomUpdates();

    // 同一批节点对象，没有被 innerHTML 重新解析替换
    expect(p1.querySelector('b')).toBe(boldBefore);
    Array.from(p2.childNodes).forEach((node, index) => {
      expect(node).toBe(textBefore[index]);
    });
    expect(state.elementMap.size).toBe(0);
  });

  test('调度期间被 restoreAll 清空：迟到的 pending 回调不再渲染译文', async () => {
    setupDom('<p id="p1">Hello <b>world</b></p>');
    resetState('original');
    const el = paragraph('p1');

    applyTranslation(el, inlineRender('译文'));
    // 同一 tick 内停止翻译：restoreAll 先清空 elementMap 并排队还原，
    // applyTranslation 的渲染回调排在后面，必须自行放弃
    restoreAll();
    await flushDomUpdates();

    expect(el.textContent).toBe('Hello world');
    expect(el.hasAttribute('data-translator-processed')).toBe(false);
    expect(el.isConnected).toBe(true);
  });
});

// ─── 嵌套 shadow root（Web Components 里再套 Web Components） ──────────────
describe('嵌套 shadow root 样式注入', () => {
  test('内层 shadow root 同样注入样式且互不重复', () => {
    setupDom('<div id="outer"></div>');
    const outerHost = document.getElementById('outer') as unknown as HTMLElement;
    const outerShadow = outerHost.attachShadow({ mode: 'open' });
    // 外层 shadow root 里再挂一个 shadow host
    const innerHost = document.createElement('div');
    outerShadow.appendChild(innerHost);
    const innerShadow = innerHost.attachShadow({ mode: 'open' });

    expect(injectStylesIntoShadowRoot(outerShadow, '[data-translator-pending]{opacity:0}')).toBe(true);
    expect(injectStylesIntoShadowRoot(innerShadow, '[data-translator-pending]{opacity:0}')).toBe(true);

    expect(outerShadow.querySelectorAll('style[data-translator-shadow-style]').length).toBe(1);
    expect(innerShadow.querySelectorAll('style[data-translator-shadow-style]').length).toBe(1);
    // 两份样式各自独立，互不串入
    expect(outerShadow.querySelector('style[data-translator-shadow-style]')?.textContent)
      .toContain('[data-translator-pending]');
    expect(innerShadow.querySelector('style[data-translator-shadow-style]')?.textContent)
      .toContain('[data-translator-pending]');
  });
});

// ─── 手动重试：error 快照不能挡住重新渲染 ─────────────────────────────────
describe('手动重试（force）能重新渲染', () => {
  test('存在 error 旧条目时，force 翻译仍会渲染译文并替换条目', async () => {
    setupDom('<p id="p1">Hello world example</p>');
    resetState('original');
    const el = paragraph('p1');

    // 上一次失败留下的快照
    state.elementMap.set(el, {
      originalHTML: el.innerHTML,
      translatedText: '',
      status: 'error',
      showingOriginal: false,
      errorAt: 0,
      retryCount: 2,
    });

    // 直接验证「清掉非 translated 旧条目」这一前置动作的语义：
    // applyTranslation 对已存在条目是幂等 no-op，所以必须先删。
    const existing = state.elementMap.get(el);
    expect(existing?.status).toBe('error');
    state.elementMap.delete(el);

    applyTranslation(el, inlineRender('你好世界示例'));
    await flushDomUpdates();

    expect(el.textContent).toBe('你好世界示例');
    expect(state.elementMap.get(el)?.status).toBe('translated');
    expect(el.isConnected).toBe(true);
  });
});
