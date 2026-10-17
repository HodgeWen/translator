import { collectBlocks } from '@/lib/block-detect';
import { state, mutationIgnoredNodes } from './state';
import { restoreAll } from './style-apply';
import { translateSingleElement, scheduleAggregateFlush } from './translate';

// ─── Utilities ──────────────────────────────────────────────────────────

export function getTranslatableElements(root: ParentNode = document): HTMLElement[] {
  return collectBlocks(root);
}

// ─── Cleanup ────────────────────────────────────────────────────────────

// 节点（或其子树）离开 DOM 时主动从 elementMap 清理对应 entry。
// 使用 isConnected 检查代替 root.contains() 遍历，将复杂度从 O(roots × elementMap)
// 降为 O(elementMap)，每个 entry 仅做常量时间检查。
function cleanupDisconnectedEntries(): void {
  const victims: HTMLElement[] = [];
  state.elementMap.forEach((entry, key) => {
    const keyConnected = key.isConnected;
    const cloneConnected = entry.cloneEl?.isConnected ?? false;

    if (keyConnected || cloneConnected) return;

    if (mutationIgnoredNodes.has(key)) {
      mutationIgnoredNodes.delete(key);
      return;
    }
    if (entry.cloneEl && mutationIgnoredNodes.has(entry.cloneEl)) {
      mutationIgnoredNodes.delete(entry.cloneEl);
      return;
    }
    victims.push(key);
  });
  for (const el of victims) {
    state.elementMap.delete(el);
    state.observer?.unobserve(el);
    state.pendingAggregateElements.delete(el);
  }

  // shadow host 离开 DOM：对应 shadow root 的观察随之失效，清出注册表，
  // 防止对已断开子树的条目滞留（迭代中删除当前项对 Set 是安全的）。
  for (const shadow of observedShadowRoots) {
    if (!shadow.host.isConnected) observedShadowRoots.delete(shadow);
  }
}

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
      if (state.elementMap.has(el)) return;

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
  const allElements = Array.from(scope.querySelectorAll('*')) as HTMLElement[];
  for (const el of allElements) {
    const shadow = el.shadowRoot;
    if (shadow && !observedShadowRoots.has(shadow)) {
      observedShadowRoots.add(shadow);
      mutationObserver.observe(shadow, { childList: true, subtree: true, characterData: true });
    }
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

  // 祖先去重：按 DOM 深度排序（浅→深），逐个检查是否已被已接受的根包含。
  // 复杂度 O(n log n) 排序 + O(n × accepted.size) 遍历，accepted 通常很小。
  nodes.sort((a, b) => {
    let da = 0, db = 0;
    let p: Node | null = a;
    while (p) { da++; p = p.parentNode; }
    p = b;
    while (p) { db++; p = p.parentNode; }
    return da - db;
  });

  const roots: HTMLElement[] = [];
  for (const n of nodes) {
    let contained = false;
    for (const r of roots) {
      if (r.contains(n)) { contained = true; break; }
    }
    if (!contained) roots.push(n);
  }

  const newElements: HTMLElement[] = [];
  for (const root of roots) {
    if (!root.isConnected) continue;
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

    // 添加路径：仅入队 + 调度 flush，避免对每条 mutation 同步跑
    // querySelectorAll(BLOCK_SELECTOR) + getComputedStyle 兜底。
    // 原地文本变更路径（characterData）：按「添加路径」入队其 parentElement，
    // 复用同一 200ms 防抖 flush 重新收集（虚拟列表复用、实时更新场景）。
    // 已翻译/已占位元素（data-translator-processed / data-translator-clone）
    // 由 flush 内 collectBlocks → hasExcludedAncestor 拦截，已入 elementMap 的
    // 元素也不会被重复 observe，不重复发请求。
    let added = false;
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.isConnected) {
          pendingMutationNodes.add(node);
          added = true;
        }
      });
      if (m.type === 'characterData') {
        const parent = m.target.parentElement;
        if (parent) {
          pendingMutationNodes.add(parent);
          added = true;
        }
      }
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
