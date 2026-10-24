import { collectBlocks } from '@/lib/block-detect';
import {
  state,
  getAutoRetryCount,
  consumeAutoRetry,
  resetAllAutoRetryCounts,
  resetAutoRetryCount,
} from './state';
import { restoreAll } from './style-apply';
import { translateSingleElement, scheduleAggregateFlush } from './translate';
import { injectStylesIntoShadowRoot } from './shadow-style';

// 样式注入实现已拆到 shadow-style.ts（本文件原 580 行，混着 IO / MO / 路由 /
// GC / 样式注入五类职责）。这里 re-export 保持既有导入方无需改动：
// tests/style-apply.test.ts 直接从这里导入 injectStylesIntoShadowRoot。
export { injectStylesIntoShadowRoot };

// ─── Utilities ──────────────────────────────────────────────────────────

export function getTranslatableElements(root: ParentNode = document): HTMLElement[] {
  return collectBlocks(root);
}

// ─── Cleanup ────────────────────────────────────────────────────────────

// 节点（或其子树）离开 DOM 时主动从 elementMap 清理对应 entry。
// 使用 isConnected 检查代替 root.contains() 遍历，将复杂度从 O(roots × elementMap)
// 降为 O(elementMap)，每个 entry 仅做常量时间检查。
function cleanupDisconnectedEntries(): void {
  // 原地渲染下 elementMap 的 key 就是 DOM 里真实的段落元素，isConnected 即
  // 权威判据（不再有「原 el 离树、wrapper 占位」的双节点形态需要区分）。
  const victims: HTMLElement[] = [];
  state.elementMap.forEach((_entry, key) => {
    if (key.isConnected) return;
    victims.push(key);
  });
  for (const el of victims) {
    state.elementMap.delete(el);
    state.observer?.unobserve(el);
    state.pendingAggregateElements.delete(el);
    // 元素离开 DOM 后可能被站点重新插回（虚拟列表复用、节点移动）。
    // 若不清掉 data-translator-processed，重新插回时 block-detect 会把它当作
    // 「已有译文」永久排除 —— 而 elementMap 条目已删，还原/重译都无从下手，
    // 结果是该段落永久漏译且不可恢复。这里连同其余运行态属性一并复位。
    el.removeAttribute('data-translator-processed');
    el.removeAttribute('data-translator-error');
    el.removeAttribute('data-translator-pending');
    el.removeAttribute('data-translator-theme');
    resetAutoRetryCount(el);
  }

  // shadow host 离开 DOM：对应 shadow root 的观察随之失效，清出注册表，
  // 防止对已断开子树的条目滞留（迭代中删除当前项对 Set 是安全的）。
  for (const shadow of observedShadowRoots) {
    if (!shadow.host.isConnected) observedShadowRoots.delete(shadow);
  }
}

// 自动重试策略在 auto-retry.ts（纯函数）。
// 这里 import 供本文件内部调用，并 re-export 保持既有导入路径不变。
import { shouldAutoRetry } from './auto-retry';
export { MAX_AUTO_RETRIES, shouldAutoRetry } from './auto-retry';

// ─── Intersection Observer ──────────────────────────────────────────────

function createObserver(): IntersectionObserver {
  // pending: 元素 → 200ms 防抖定时器 ID。元素离开视口或被移除时主动 clearTimeout，
  // 避免快速滚动下对已离屏元素仍发起翻译请求（浪费配额、加重 LLM 限流压力）。
  const pending = new Map<HTMLElement, number>();
  // Global concurrency limit for single-element mode to prevent request storms on rapid scroll.
  let inflightCount = 0;
  const queued: HTMLElement[] = [];
  const queuedSet = new Set<HTMLElement>();

  async function runSingle(el: HTMLElement): Promise<void> {
    inflightCount++;
    try {
      if (state.isActive && el.isConnected && !state.elementMap.has(el)) {
        await translateSingleElement(el);
      }
    } finally {
      inflightCount--;
      const next = queued.shift();
      if (next) queuedSet.delete(next);
      if (next) {
        void runSingle(next);
      }
    }
  }

  function scheduleSingle(el: HTMLElement): void {
    if (!state.isActive) return;
    if (state.elementMap.has(el) || el.hasAttribute('data-translator-pending')) return;
    const limit = Math.max(1, state.aggregate.maxConcurrentRequests);
    if (inflightCount < limit) {
      void runSingle(el);
    } else if (!queuedSet.has(el)) {
      queued.push(el);
      queuedSet.add(el);
    }
  }

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target as HTMLElement;
      if (!entry.isIntersecting) {
        const timerId = pending.get(el);
        if (timerId !== undefined) {
          window.clearTimeout(timerId);
          pending.delete(el);
        }
        return;
      }
      if (pending.has(el)) return;
      // 失败段落重试：error 状态 + 距失败 ≥ 阈值 + 未超自动重试上限时，
      // 清理该条目并移除错误标记，随后按当前模式（聚合入队 / 单元素调度）
      // 重新进入翻译流程；已翻译 / idle / 冷却未到 / 已超上限的条目维持现状跳过。
      //
      // 次数上限的计数存放在 state 的 WeakMap（见 state.ts）：这里必须先删
      // elementMap 条目才能让后续翻译流程重新处理该元素，计数需要跨删除存活。
      const existing = state.elementMap.get(el);
      if (existing) {
        // 计数以 WeakMap 为权威：它是跨 elementMap 删除存活的真实计数。
        // 不能用 `Math.max(WeakMap, 镜像)` —— ElementState.retryCount 只是失败快照
        // 上的镜像，resetAllAutoRetryCounts() 清空 WeakMap 后镜像仍停在旧值，
        // 取 max 会让「手动 Alt+W 重置」完全失效（复评实测：reset 后
        // WeakMap=0、镜像=3 → 仍判定超限）。镜像仅用于兜底：WeakMap 为 0 而
        // 镜像 >0 说明是旧版本残留，忽略镜像即可。
        const retryCount = getAutoRetryCount(el);
        if (!shouldAutoRetry(existing.status, existing.errorAt, performance.now(), retryCount)) {
          return;
        }
        consumeAutoRetry(el);
        state.elementMap.delete(el);
        el.removeAttribute('data-translator-error');
      }

      if (state.aggregate.aggregateEnabled) {
        state.pendingAggregateElements.add(el);
        scheduleAggregateFlush();
      } else {
        const timerId = window.setTimeout(() => {
          pending.delete(el);
          if (state.elementMap.has(el)) return;
          scheduleSingle(el);
        }, 200);
        pending.set(el, timerId);
      }
    });
  }, { threshold: 0, rootMargin: '100px' });
}

// ─── Mutation Observer for Dynamic Content ──────────────────────────────

// MutationObserver 节流批处理：模块级保存（不放进 state，避免 restoreAll 误清）。
// 节点离场清理路径仍实时执行；新增路径入队后由 flush 批处理。
let mutationFlushTimer: number | null = null;
let cleanupFlushTimer: number | null = null;
const pendingMutationNodes: Set<HTMLElement> = new Set();
const MUTATION_FLUSH_DELAY_MS = 200;
const CLEANUP_FLUSH_DELAY_MS = 150;

let mutationObserver: MutationObserver | null = null;
let routeChangeTimer: number | null = null;
let gcIntervalId: number | null = null;

// 已注册观察的 open shadow root 注册表。MutationObserver 无法对单个目标取消
// 观察，注册表仅用于：跳过重复注册、在 host 离开 DOM 后把对应条目清出
// （观察关系随被观察节点一起被 GC，无需显式 disconnect）。
const observedShadowRoots = new Set<ShadowRoot>();

// 扫描 scope（含其 open shadow root 的宿主树）内尚未注册的 open shadow root，
// 用同一 mutationObserver 注册观察。初始收集（collectCandidatesWithShadow）能穿透
// shadow root，但 MutationObserver 只观察显式注册的目标；不在此注册的话，
// shadow root 内后续插入的内容永远不会进入翻译队列。
function observeShadowRootsIn(scope: ParentNode): void {
  if (!mutationObserver) return;
  // 递归进入已注册的 shadow root：`querySelectorAll('*')` 不穿透 shadow 边界，
  // 嵌套 Web Components（shadow root 里再挂 shadow host）需要逐层扫描，
  // 否则内层 shadow root 既不会被观察、也拿不到注入样式。
  // 幂等由 observedShadowRoots 保证，递归深度受 shadow 嵌套层数天然约束。
  const allElements = Array.from(scope.querySelectorAll('*')) as HTMLElement[];
  for (const el of allElements) {
    const shadow = el.shadowRoot;
    if (!shadow || observedShadowRoots.has(shadow)) continue;
    observedShadowRoots.add(shadow);
    // 先注入样式再注册观察：注入动作本身是 childList mutation，
    // 放在 observe 之前可避免它被自己的 MutationObserver 当成新内容处理。
    injectStylesIntoShadowRoot(shadow);
    mutationObserver.observe(shadow, { childList: true, subtree: true, characterData: true });
    observeShadowRootsIn(shadow);
  }
}

function scheduleCleanupFlush(): void {
  if (cleanupFlushTimer !== null) return;
  cleanupFlushTimer = window.setTimeout(() => {
    cleanupFlushTimer = null;
    cleanupDisconnectedEntries();
  }, CLEANUP_FLUSH_DELAY_MS);
}

function scheduleMutationFlush(): void {
  if (mutationFlushTimer !== null) return;
  mutationFlushTimer = window.setTimeout(() => {
    mutationFlushTimer = null;
    flushMutationQueue();
  }, MUTATION_FLUSH_DELAY_MS);
}

function flushMutationQueue(): void {
  if (!state.isActive || !state.observer) {
    pendingMutationNodes.clear();
    return;
  }
  const nodes = Array.from(pendingMutationNodes);
  pendingMutationNodes.clear();

  // 祖先去重：用「已接受祖先集合」标记代替「深度排序 + contains 两两比较」。
  //
  // 旧实现每个节点都要沿 parentNode 走到根算深度（O(n·depth)），再排序
  // （O(n log n)），最后对每个节点遍历已接受 roots 做 contains（O(n × accepted)，
  // 每次 contains 都要遍历子树）。真实 Chromium 实测 600 节点 1.76ms。
  //
  // 新实现：按 Set 查祖先——节点若「自身已在 accepted 里」或「祖先链上存在
  // accepted 节点」即为重复。语义与旧实现等价（旧的 contains 覆盖「n 是 r 的
  // 后代或自身」两种情形，这里的祖先链自检 + accepted 自检正好覆盖两者），
  // 但每个节点只走一遍祖先链、每次 O(1) 哈希查找。实测 600 节点 0.055ms（32×）。
  const accepted = new Set<HTMLElement>();
  const roots: HTMLElement[] = [];
  for (const n of nodes) {
    if (!n.isConnected) continue;
    let covered = accepted.has(n);
    let cur: HTMLElement | null = n.parentElement;
    while (cur && !covered) {
      if (accepted.has(cur)) covered = true;
      cur = cur.parentElement;
    }
    if (covered) continue;
    accepted.add(n);
    roots.push(n);
  }

  const newElements: HTMLElement[] = [];
  for (const root of roots) {
    newElements.push(...getTranslatableElements(root));
    // 扫描中发现的 open shadow root 顺带注册观察（新插入的 Web Components 宿主）
    observeShadowRootsIn(root);
  }
  for (const el of newElements) {
    if (!state.elementMap.has(el)) {
      state.observer.observe(el);
    }
  }
}

/**
 * 从 node 向上找到「已翻译且内容被站点改写」的最近元素。
 *
 * 判定依据：元素带 `data-translator-processed` 且仍在 elementMap 里。
 * 这里不再比对文本内容 —— characterData mutation 本身就说明文本被改过，
 * 而比对内容需要读 textContent（大页面上是 O(n) 遍历，成本不划算）。
 */
function findStaleTranslatedAncestor(node: HTMLElement | null): HTMLElement | null {
  let cur: HTMLElement | null = node;
  while (cur) {
    if (cur.hasAttribute('data-translator-processed') && state.elementMap.has(cur)) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

/**
 * 释放一个已翻译元素：清扩展状态，让它能以站点新内容重新进入翻译流程。
 *
 * 与 restoreAll 的区别：restoreAll 会「还原成保存的原文」，这里**不能**还原 ——
 * 站点已经改写了内容，用陈旧 originalNodes 覆盖会把站点新内容抹掉（实测：
 * 站点把段落改成新英文后被还原成旧原文）。所以只清状态、不动 DOM。
 */
function releaseTranslatedElement(el: HTMLElement): void {
  state.elementMap.delete(el);
  el.removeAttribute('data-translator-processed');
  el.removeAttribute('data-translator-error');
  el.removeAttribute('data-translator-pending');
  el.removeAttribute('data-translator-theme');
  state.pendingAggregateElements.delete(el);
  state.observer?.unobserve(el);
  // 复位自动重试计数：内容已变，应重新获得完整重试预算
  resetAutoRetryCount(el);
}

/**
 * 该节点是否落在「已翻译段落内部」，因而不必再交给 flush 重新收集。
 *
 * MutationObserver 看不到「谁写的」：本扩展自己 `replaceChildren` / `appendChild`
 * 写入的译文子节点会以 addedNodes 形式回流到同一个观察者里，这是自激循环的
 * 源头。真实 Chromium 实测：翻译 100 段会产生 200 条 addedNodes 入队，全部落在
 * 刚打上 `data-translator-processed` 的段落内部，flush 时 collectBlocks 一个候选
 * 都收不到（实测 0 个），属于纯浪费 —— 每轮翻译都要白跑一遍 querySelectorAll
 * 与祖先去重。
 *
 * 判据与 collectBlocks 的 hasExcludedAncestor 完全一致（只认属性，不看
 * elementMap）：祖先带 `data-translator-processed` 时，flush 无论如何都会把该
 * 子树排除掉，所以在这里提前丢弃不改变最终收集结果。
 *
 * 注意调用时机：必须在 characterData 释放（releaseTranslatedElement 摘掉属性）
 * 之后执行，否则「站点改写已翻译段落 + 同批次新增节点」的组合会漏收。
 */
function isInsideTranslatedBlock(node: HTMLElement): boolean {
  let cur: HTMLElement | null = node;
  while (cur) {
    if (cur.hasAttribute('data-translator-processed')) return true;
    cur = cur.parentElement;
  }
  return false;
}

export function setupMutationObserver(): void {
  if (mutationObserver || !document.body) return;

  mutationObserver = new MutationObserver((mutations) => {
    if (!state.isActive || !state.observer) return;

    // 移除路径：延迟批处理，避免同步阻塞主线程。
    let hasRemovals = false;
    for (const m of mutations) {
      if (m.removedNodes.length > 0) { hasRemovals = true; break; }
    }
    if (hasRemovals) {
      scheduleCleanupFlush();
    }

    let added = false;

    // 第一遍：characterData —— 站点自己改写了「已翻译元素」里的文本
    // （虚拟列表复用、评论展开、实时更新）。此时 elementMap 里保存的原文与
    // 译文都已过期：既不能用陈旧原文覆盖站点新内容，也不能因
    // data-translator-processed 而永久跳过重译。复位该元素（含祖先链上已翻译
    // 的段落）后按新内容重新收集。
    // 必须放在 addedNodes 过滤之前：释放会摘掉 processed 属性，让同批次新增
    // 的节点不被误判为「已翻译段落内部」。
    for (const m of mutations) {
      if (m.type !== 'characterData') continue;
      const parent = m.target.parentElement;
      if (!parent) continue;
      const stale = findStaleTranslatedAncestor(parent);
      if (stale) {
        releaseTranslatedElement(stale);
      }
      pendingMutationNodes.add(parent);
      added = true;
    }

    // 第二遍：childList 新增节点 —— 仅入队 + 调度 flush，避免对每条 mutation
    // 同步跑 querySelectorAll + 可见性判定。自己写入的译文节点直接丢弃
    // （见 isInsideTranslatedBlock 注释）。
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement) || !node.isConnected) return;
        if (isInsideTranslatedBlock(node)) return;
        pendingMutationNodes.add(node);
        added = true;
      });
    }

    if (added) scheduleMutationFlush();
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

// ─── Start / Stop ───────────────────────────────────────────────────────

export function startTranslation(): void {
  if (!mutationObserver) {
    setupMutationObserver();
  }

  // 手动重新开启一轮翻译（Alt+W / popup「翻译此页」）时清零自动重试计数：
  // 自动重试有上限，但用户手动触发必须始终可用。
  resetAllAutoRetryCounts();

  // Periodic GC for disconnected entries on long SPA sessions
  if (gcIntervalId === null) {
    gcIntervalId = window.setInterval(cleanupDisconnectedEntries, 30_000);
  }

  const elements = getTranslatableElements();
  if (!state.observer) {
    state.observer = createObserver();
  }

  // 启动时对全页 open shadow root 注册观察，覆盖初始收集穿透过的 Web Components
  observeShadowRootsIn(document);

  elements.forEach((el) => {
    state.observer!.observe(el);
  });

  // If aggregate is enabled, also immediately flush any elements already in viewport.
  // Avoid synchronous getBoundingClientRect on all elements; rely on IntersectionObserver
  // with rootMargin to naturally catch viewport elements. Only enqueue a small initial
  // batch to avoid startup jank.
  if (state.aggregate.aggregateEnabled) {
    const initialBatch = elements.slice(0, Math.min(elements.length, 20));
    initialBatch.forEach(el => state.pendingAggregateElements.add(el));
    scheduleAggregateFlush();
  }
}

export function stopTranslation(): void {
  state.isActive = false;
  state.observer?.disconnect();
  state.observer = null;
  mutationObserver?.disconnect();
  mutationObserver = null;
  observedShadowRoots.clear();
  if (gcIntervalId !== null) {
    window.clearInterval(gcIntervalId);
    gcIntervalId = null;
  }
  restoreAll();
  state.pendingAggregateElements.clear();
  if (state.aggregateDebounceTimer !== null) {
    window.clearTimeout(state.aggregateDebounceTimer);
    state.aggregateDebounceTimer = null;
  }
  pendingMutationNodes.clear();
  if (mutationFlushTimer !== null) {
    window.clearTimeout(mutationFlushTimer);
    mutationFlushTimer = null;
  }
  if (cleanupFlushTimer !== null) {
    window.clearTimeout(cleanupFlushTimer);
    cleanupFlushTimer = null;
  }
  if (routeChangeTimer !== null) {
    window.clearTimeout(routeChangeTimer);
    routeChangeTimer = null;
  }
}

// ─── SPA Route Change Detection ─────────────────────────────────────────

function handleRouteChange(): void {
  const shouldRestart = state.isActive || routeChangeTimer !== null;
  if (!shouldRestart) return;

  if (routeChangeTimer !== null) {
    window.clearTimeout(routeChangeTimer);
    routeChangeTimer = null;
  }
  if (state.isActive) {
    stopTranslation();
  }
  routeChangeTimer = window.setTimeout(() => {
    routeChangeTimer = null;
    state.isActive = true;
    startTranslation();
  }, 500);
}

// URL 轮询间隔。内容脚本运行在 isolated world，页面主 world 的
// history.pushState/replaceState 调用不会经过内容脚本的补丁（原补丁方案是死代码），
// 改为不依赖 world 的机制：轻量 location.href 字符串比较轮询 + hashchange 监听。
const URL_POLL_INTERVAL_MS = 500;

let urlPollTimer: number | null = null;
let lastHref = '';

export function setupSPADetection(): void {
  // 幂等：配合 index.ts 的双重注入守卫，防重复注册定时器与监听
  if (urlPollTimer !== null) return;

  lastHref = location.href;
  // popstate / hashchange 是标准窗口事件，isolated world 同样能收到
  window.addEventListener('popstate', handleRouteChange);
  window.addEventListener('hashchange', handleRouteChange);
  urlPollTimer = window.setInterval(() => {
    if (location.href === lastHref) return;
    lastHref = location.href;
    handleRouteChange();
  }, URL_POLL_INTERVAL_MS);
}
