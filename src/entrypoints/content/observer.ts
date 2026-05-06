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
    let added = false;
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.isConnected) {
          pendingMutationNodes.add(node);
          added = true;
        }
      });
    }
    if (added) scheduleMutationFlush();
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });
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

export function setupSPADetection(): void {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    window.dispatchEvent(new Event('translator-pushstate'));
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event('translator-replacestate'));
  };

  window.addEventListener('popstate', handleRouteChange);
  window.addEventListener('translator-pushstate', handleRouteChange);
  window.addEventListener('translator-replacestate', handleRouteChange);
}
