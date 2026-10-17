// 「保存原节点 → 还原」的可测 helper。
//
// 通过最小结构接口注入容器：生产环境传真实 DOM 元素（HTMLElement 对
// ChildNode 天然满足 NodeContainer），单测传内存假对象即可，不引入
// jsdom / happy-dom。
//
// 不用 DocumentFragment 承载原节点：fragment 被 appendChild 进 DOM 时会把
// 子节点移走、自身变空，之后仍持有它则还原时只能拿到空集合（bilingual
// 停止翻译把段落清空的存量根因）。这里一律以节点引用数组保存，引用不随
// 节点移动而失效。

/** 最小容器接口：真实 HTMLElement 结构性满足，测试可注入内存实现 */
export interface NodeContainer<N> {
  readonly childNodes: ArrayLike<N>;
  readonly firstChild: N | null;
  removeChild(child: N): N;
  appendChild(node: N): N;
}

/** 快照容器当前子节点引用（不移动节点，原节点原地保留） */
export function snapshotChildren<N>(el: { readonly childNodes: ArrayLike<N> }): N[] {
  return Array.from(el.childNodes);
}

/** 摘除容器全部子节点（原节点离树，由返回的数组持有引用） */
export function detachChildren<N>(el: NodeContainer<N>): N[] {
  const nodes = snapshotChildren(el);
  for (const node of nodes) el.removeChild(node);
  return nodes;
}

/**
 * 清空容器后按保存时的顺序放回原节点引用，翻译渲染节点随之被清除。
 * 幂等：数组始终持有原节点引用，重复调用不报错、不重复插入、不清空。
 */
export function restoreChildren<N>(el: NodeContainer<N>, nodes: readonly N[]): void {
  while (el.firstChild) el.removeChild(el.firstChild);
  for (const node of nodes) el.appendChild(node);
}
