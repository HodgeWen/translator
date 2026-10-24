import { beforeEach, describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import type { DisplayStyle } from '../src/types';
import {
  state,
  getAutoRetryCount,
  consumeAutoRetry,
  resetAllAutoRetryCounts,
} from '../src/entrypoints/content/state';
import { MAX_RETRIES, shouldRetryManually } from '../src/entrypoints/content/retry';
import {
  retryFailedElement,
  retryFailedElements,
} from '../src/entrypoints/content/translate';
import { findShortcutTarget, setupCtrlHover } from '../src/entrypoints/content/ctrl-hover';
import { applyTranslation } from '../src/entrypoints/content/style-apply';

// 失败段落的手动重试路径（Ctrl+悬浮 / 切回译文）回归测试。
//
// 背景：translateSingleElement 失败后写入 data-translator-error 红虚线 +
// status === 'error' 快照。旧实现里所有手动入口都被这些快照挡住：
//   - Ctrl+悬浮：tryToggleDisplay 命中 elementMap 条目后直接 return true，
//     toggleElementDisplay 对 status !== 'translated' 早退 → 什么都没发生；
//   - 切回译文：toggleAllDisplay 跳过非 translated 条目 → 红虚线不动。
// 自动重试还有 MAX_RETRIES 上限，耗尽后失败段落永久卡死。这里的用例锁住
// 「用户手势必须绕过冷却与次数上限，且成功后红虚线消失」这一契约。

let document: Document;

/** 复位模块级单例状态 */
function resetState(displayStyle: DisplayStyle = 'original'): void {
  state.elementMap.clear();
  state.pendingAggregateElements.clear();
  state.isActive = true;
  state.displayMode = 'translation';
  state.displayStyle = displayStyle;
  resetAllAutoRetryCounts();
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

/** 等待 applyTranslation 的 rAF 分片队列执行完（CHUNK_SIZE=4 条/帧） */
async function flushDomUpdates(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
}

/** 统计实际发出的翻译请求数；text 决定返回成功还是失败 */
function installTranslationStub(shouldFail = false): { requests: number } {
  const stats = { requests: 0 };
  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: {
      sendMessage: (
        _message: unknown,
        callback: (response: unknown) => void
      ): void => {
        stats.requests += 1;
        if (shouldFail) {
          callback({ success: false, error: 'quota exceeded' });
        } else {
          callback({ success: true, data: { text: '你好世界示例' } });
        }
      },
    },
  };
  return stats;
}

/**
 * 造一个真实 DOM 事件。linkedom 不提供 MouseEvent / KeyboardEvent 构造器，
 * 只能走 createEvent + initEvent，再用 defineProperty 补上判定所需的字段
 * （ctrlKey / key）—— 与真机事件在监听器看来等价。
 */
function fireEvent(
  target: EventTarget,
  type: string,
  init: { ctrlKey?: boolean; key?: string } = {}
): void {
  const event = (document as unknown as {
    createEvent: (kind: string) => Event & { initEvent: (t: string, b: boolean, c: boolean) => void };
  }).createEvent(type === 'keydown' ? 'KeyboardEvents' : 'MouseEvents');
  event.initEvent(type, true, false);
  if (init.ctrlKey !== undefined) {
    Object.defineProperty(event, 'ctrlKey', { value: init.ctrlKey });
  }
  if (init.key !== undefined) {
    Object.defineProperty(event, 'key', { value: init.key });
  }
  target.dispatchEvent(event);
}

function paragraph(id: string): HTMLElement {
  return document.getElementById(id) as unknown as HTMLElement;
}

/** 造一个「上一次翻译失败」的真实形态：红虚线属性 + error 快照 + 已耗尽的自动重试预算 */
function markAsFailed(el: HTMLElement, retriesUsed = MAX_RETRIES): void {
  el.setAttribute('data-translator-error', 'true');
  state.elementMap.set(el, {
    originalHTML: el.innerHTML,
    translatedText: '',
    status: 'error',
    showingOriginal: false,
    errorAt: performance.now(),
  });
  for (let i = 0; i < retriesUsed; i++) consumeAutoRetry(el);
}

beforeEach(() => {
  setupDom('<p id="p1">Hello world example</p><p id="p2">Second paragraph text</p>');
  resetState();
});

describe('shouldRetryManually 手动重试判定', () => {
  test('error 快照 → 可重试（不受冷却与次数上限影响）', () => {
    expect(shouldRetryManually('error', false)).toBe(true);
  });

  test('红虚线残留（条目已删 / 改写成 idle）→ 可重试', () => {
    expect(shouldRetryManually(undefined, true)).toBe(true);
    expect(shouldRetryManually('idle', true)).toBe(true);
  });

  test('pending 在飞 / translated 已成功 → 不重试（避免重复计费与幂等空转）', () => {
    expect(shouldRetryManually('pending', false)).toBe(false);
    expect(shouldRetryManually('pending', true)).toBe(false);
    expect(shouldRetryManually('translated', false)).toBe(false);
    expect(shouldRetryManually('translated', true)).toBe(false);
  });

  test('无失败痕迹的普通段落 → 不重试', () => {
    expect(shouldRetryManually(undefined, false)).toBe(false);
    expect(shouldRetryManually('idle', false)).toBe(false);
  });
});

describe('findShortcutTarget 手势命中失败段落', () => {
  test('error 条目（含其译文 / 文本子节点上溯）可被命中', () => {
    const el = paragraph('p1');
    markAsFailed(el);
    expect(findShortcutTarget(el)).toBe(el);
    // 真实 mouseover 的 target 是段落内的行内元素：沿 parentElement 上溯命中段落
    const bold = document.createElement('b') as unknown as HTMLElement;
    bold.textContent = 'Hello';
    el.replaceChildren(bold as unknown as Node);
    expect(findShortcutTarget(bold)).toBe(el);
  });

  test('条目已删但红虚线还在的残留元素同样可被命中（旧实现永久无解）', () => {
    const el = paragraph('p1');
    el.setAttribute('data-translator-error', 'true');
    expect(state.elementMap.has(el)).toBe(false);
    expect(findShortcutTarget(el)).toBe(el);
  });

  test('普通未处理段落不被命中（继续走悬停翻译路径）', () => {
    expect(findShortcutTarget(paragraph('p1'))).toBeNull();
  });
});

describe('retryFailedElement 单段手动重试', () => {
  test('耗尽自动重试预算后仍能重试：清零计数、摘红虚线、渲染译文', async () => {
    installTranslationStub();
    const el = paragraph('p1');
    markAsFailed(el);
    expect(getAutoRetryCount(el)).toBe(MAX_RETRIES);

    await retryFailedElement(el);
    await flushDomUpdates();

    // 红虚线必须消失，否则用户会以为重试没生效（报障观感）
    expect(el.hasAttribute('data-translator-error')).toBe(false);
    expect(el.hasAttribute('data-translator-pending')).toBe(false);
    expect(el.textContent).toBe('你好世界示例');
    expect(state.elementMap.get(el)?.status).toBe('translated');
    // 手动重试恢复完整自动重试预算
    expect(getAutoRetryCount(el)).toBe(0);
  });

  test('重试再次失败时红虚线重新出现，条目回到 error（用户可继续重试）', async () => {
    installTranslationStub(true);
    const el = paragraph('p1');
    markAsFailed(el);

    await retryFailedElement(el);
    await flushDomUpdates();

    expect(el.hasAttribute('data-translator-error')).toBe(true);
    expect(state.elementMap.get(el)?.status).toBe('error');
    // 仍可再次手动重试（预算已被清零，自动路径也会重新可用）
    expect(shouldRetryManually(state.elementMap.get(el)?.status, true)).toBe(true);
    expect(getAutoRetryCount(el)).toBe(0);
  });

  test('skipActiveCheck：整页翻译未激活（悬停场景）时结果仍会渲染', async () => {
    installTranslationStub();
    const el = paragraph('p1');
    markAsFailed(el);
    state.isActive = false;

    await retryFailedElement(el, true);
    await flushDomUpdates();

    expect(el.textContent).toBe('你好世界示例');
    expect(state.elementMap.get(el)?.status).toBe('translated');
  });

  test('已翻译 / pending 段落不重试（避免重复计费）', async () => {
    const stats = installTranslationStub();
    const el = paragraph('p1');
    state.elementMap.set(el, {
      originalHTML: el.innerHTML,
      translatedText: '译文',
      status: 'translated',
      showingOriginal: false,
    });

    await retryFailedElement(el);
    await flushDomUpdates();
    expect(stats.requests).toBe(0);

    state.elementMap.set(el, {
      originalHTML: el.innerHTML,
      translatedText: '译文',
      status: 'pending',
      showingOriginal: false,
    });
    await retryFailedElement(el);
    await flushDomUpdates();
    expect(stats.requests).toBe(0);
  });

  test('属性态与条目态不一致（error 条目 + 在飞 pending 属性）时不清红虚线、不发请求', async () => {
    const stats = installTranslationStub();
    const el = paragraph('p1');
    markAsFailed(el);
    el.setAttribute('data-translator-pending', 'true');

    await retryFailedElement(el);
    await flushDomUpdates();

    // 若此时摘掉红虚线，用户将看不到任何失败痕迹，而在飞请求也不会被替换
    expect(stats.requests).toBe(0);
    expect(el.hasAttribute('data-translator-error')).toBe(true);
  });
});

describe('retryFailedElements 切回译文时重排失败段落', () => {
  test('只重排失败段落，已翻译段落只做显示切换、不重复请求', async () => {
    const stats = installTranslationStub();
    const failed = paragraph('p1');
    const ok = paragraph('p2');
    markAsFailed(failed);
    state.elementMap.set(ok, {
      originalHTML: ok.innerHTML,
      translatedText: '第二段译文',
      status: 'translated',
      showingOriginal: true,
    });

    await retryFailedElements();
    await flushDomUpdates();

    // 一次切换最多对每个失败段落发一次请求；已翻译段落零请求
    expect(stats.requests).toBe(1);
    expect(failed.hasAttribute('data-translator-error')).toBe(false);
    expect(state.elementMap.get(failed)?.status).toBe('translated');
    expect(state.elementMap.get(ok)?.status).toBe('translated');
  });

  test('没有失败段落时不发任何请求（反复切换不放大计费）', async () => {
    const stats = installTranslationStub();
    await retryFailedElements();
    await flushDomUpdates();
    expect(stats.requests).toBe(0);
  });

  test('已离树的失败条目被跳过（等 observer 清理，不白花配额）', async () => {
    const stats = installTranslationStub();
    const el = paragraph('p1');
    markAsFailed(el);
    el.remove();

    await retryFailedElements();
    await flushDomUpdates();
    expect(stats.requests).toBe(0);
  });
});

describe('applyTranslation 成功即摘红虚线', () => {
  test('所有成功路径统一清除 data-translator-error', async () => {
    const el = paragraph('p1');
    el.setAttribute('data-translator-error', 'true');

    applyTranslation(el, {
      kind: 'inline',
      translatedText: '你好世界',
      placeholderText: '',
      fragments: [],
      styleTemplates: [],
    });
    await flushDomUpdates();

    expect(el.hasAttribute('data-translator-error')).toBe(false);
    expect(el.textContent).toBe('你好世界');
  });
});

// ─── 用户实际手势的端到端覆盖 ──────────────────────────────────────────
//
// 上面的用例直接调用 retryFailedElement / retryFailedElements，能锁定重试函数
// 本身的行为，但**锁定不到「手势是否被正确分流到重试」**：把 ctrl-hover 里
// 的失败段落分流整段删掉，那些用例依然全绿（实测回退根因只挂 1 个断言）。
// 而用户报障的正是手势完全无反应，所以必须用真实 DOM 事件驱动真机路径。
describe('Ctrl+悬浮手势（真实事件）触发失败段落重试', () => {
  test('mouseover + 按住 Ctrl 命中红虚线段落 → 发出重试请求并渲染译文', async () => {
    const stats = installTranslationStub();
    const el = paragraph('p1');
    markAsFailed(el);

    // 真机顺序：先按快捷键，再移动到段落（mouseover 携带 ctrlKey）
    setupCtrlHover();
    fireEvent(el, 'mouseover', { ctrlKey: true });

    await flushDomUpdates();
    await flushDomUpdates();

    expect(stats.requests).toBe(1);
    expect(el.hasAttribute('data-translator-error')).toBe(false);
    expect(el.textContent).toBe('你好世界示例');
  });

  test('先悬停、再按 Ctrl（keydown 兜底）同样触发重试', async () => {
    const stats = installTranslationStub();
    const el = paragraph('p2');
    markAsFailed(el);

    setupCtrlHover();
    // 姿势 2：鼠标先停在段落上（此时未按快捷键，mouseover 只记录 lastHoverTarget）
    fireEvent(el, 'mouseover');
    expect(stats.requests).toBe(0);

    // 再按下快捷键 → keydown 用 lastHoverTarget 兜底
    fireEvent(document, 'keydown', { key: 'Control' });

    await flushDomUpdates();
    await flushDomUpdates();

    expect(stats.requests).toBe(1);
    expect(el.hasAttribute('data-translator-error')).toBe(false);
  });

  test('已翻译段落的手势仍然是显示切换、不产生新请求', async () => {
    const stats = installTranslationStub();
    const el = paragraph('p1');
    state.elementMap.set(el, {
      originalHTML: el.innerHTML,
      translatedText: '既有译文',
      status: 'translated',
      showingOriginal: false,
      originalNodes: Array.from(el.childNodes) as ChildNode[],
      renderedNodes: Array.from(el.childNodes) as ChildNode[],
    });

    setupCtrlHover();
    fireEvent(el, 'mouseover', { ctrlKey: true });

    await flushDomUpdates();
    // 切换显示不该计费
    expect(stats.requests).toBe(0);
    expect(state.elementMap.get(el)?.showingOriginal).toBe(true);
  });
});
