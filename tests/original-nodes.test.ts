import { describe, expect, test } from 'bun:test';
import {
  snapshotChildren,
  detachChildren,
  restoreChildren,
  type NodeContainer,
} from '../src/entrypoints/content/original-nodes';

// 内存假节点/容器：满足 NodeContainer 最小接口，模拟真实 DOM 的
// appendChild / removeChild 移动语义，不引入 jsdom / happy-dom
class FakeNode {
  parentNode: FakeNode | null = null;
  constructor(readonly label: string) {}
}

class FakeContainer implements NodeContainer<FakeNode> {
  private readonly kids: FakeNode[] = [];
  get childNodes(): FakeNode[] {
    return this.kids;
  }
  get firstChild(): FakeNode | null {
    return this.kids[0] ?? null;
  }
  appendChild(node: FakeNode): FakeNode {
    // 模拟 DOM：append 已在容器内的节点等于移动，不产生重复
    const idx = this.kids.indexOf(node);
    if (idx >= 0) this.kids.splice(idx, 1);
    node.parentNode = this;
    this.kids.push(node);
    return node;
  }
  removeChild(child: FakeNode): FakeNode {
    const idx = this.kids.indexOf(child);
    if (idx >= 0) this.kids.splice(idx, 1);
    child.parentNode = null;
    return child;
  }
}

function setupOriginals(): { el: FakeContainer; a: FakeNode; b: FakeNode; em: FakeNode } {
  const el = new FakeContainer();
  const a = new FakeNode('text-a');
  const b = new FakeNode('text-b');
  const em = new FakeNode('em-inline');
  el.appendChild(a);
  el.appendChild(b);
  el.appendChild(em);
  return { el, a, b, em };
}

function labels(el: FakeContainer): string[] {
  return Array.from(el.childNodes, n => n.label);
}

describe('snapshotChildren 快照原节点', () => {
  test('按序返回子节点引用且不移动节点', () => {
    const { el } = setupOriginals();
    const saved = snapshotChildren(el);
    expect(saved.map(n => n.label)).toEqual(['text-a', 'text-b', 'em-inline']);
    // 快照后原节点原地保留（bilingual 应用前半段语义）
    expect(el.childNodes.length).toBe(3);
  });
});

describe('bilingual 应用 → 还原（回归：存量缺陷）', () => {
  test('还原得到真正的原节点，双语渲染节点被清除', () => {
    const { el, a, b, em } = setupOriginals();
    const saved = snapshotChildren(el);

    // 模拟 applyBilingualStyle：原节点之后追加 br + bilingual span 渲染节点
    el.appendChild(new FakeNode('br'));
    el.appendChild(new FakeNode('bilingual-span'));
    expect(labels(el)).toEqual(['text-a', 'text-b', 'em-inline', 'br', 'bilingual-span']);

    // 模拟停止翻译还原
    restoreChildren(el, saved);
    expect(labels(el)).toEqual(['text-a', 'text-b', 'em-inline']);
    expect(el.childNodes[0]).toBe(a);
    expect(el.childNodes[1]).toBe(b);
    expect(el.childNodes[2]).toBe(em);
  });

  test('嵌套行内节点引用保真（还原的是同一节点对象，样式随之保留）', () => {
    const { el, em } = setupOriginals();
    const saved = snapshotChildren(el);
    el.appendChild(new FakeNode('bilingual-span'));
    restoreChildren(el, saved);
    expect(el.childNodes).toContain(em);
    expect(em.label).toBe('em-inline');
  });
});

describe('重复还原幂等', () => {
  test('第二次还原不报错、不重复插入、不清空', () => {
    const { el } = setupOriginals();
    const saved = snapshotChildren(el);
    el.appendChild(new FakeNode('br'));
    el.appendChild(new FakeNode('bilingual-span'));

    restoreChildren(el, saved);
    restoreChildren(el, saved);
    restoreChildren(el, saved);
    expect(labels(el)).toEqual(['text-a', 'text-b', 'em-inline']);
  });
});

describe('underline 既有保存路径不回归', () => {
  test('detach 后容器清空，wrapper 接管；还原后原节点完整回归、wrapper 清除', () => {
    const { el } = setupOriginals();
    const saved = detachChildren(el);
    expect(el.firstChild).toBeNull();

    const wrapper = new FakeNode('underline-wrapper');
    el.appendChild(wrapper);
    expect(labels(el)).toEqual(['underline-wrapper']);

    restoreChildren(el, saved);
    expect(labels(el)).toEqual(['text-a', 'text-b', 'em-inline']);
  });

  test('多轮 译文↔原文 切换后原节点不丢（数组引用不随移动失效）', () => {
    const { el } = setupOriginals();
    const saved = detachChildren(el);
    const wrapper = new FakeNode('underline-wrapper');
    el.appendChild(wrapper);

    // 译文 → 原文
    restoreChildren(el, saved);
    expect(labels(el)).toEqual(['text-a', 'text-b', 'em-inline']);

    // 原文 → 译文：清空容器、只留 wrapper（原节点离树但数组仍持有引用）
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(wrapper);

    // 再切回原文：仍完整还原（旧 fragment 实现在此会 append 空 fragment 清空段落）
    restoreChildren(el, saved);
    expect(labels(el)).toEqual(['text-a', 'text-b', 'em-inline']);
  });
});
