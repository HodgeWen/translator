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
// elementMap 强引用 HTMLElement，缺少这条主动回收路径时长会话单 Tab 会持续累积。
//
// 关键约束：
//   - bilingual / underline 模式：elementMap 的 key 是原 el，仍在 DOM 树内；
//     站点移除节点时 removedNodes 直接包含 key，命中 `inByKey` 路径。
//   - original / clean 模式：key（原 el）已离开 DOM，DOM 槽位由 cloneEl(wrapper) 占据。
//     站点移除的 root 包含的是 wrapper 而非原 el，必须额外检查 `cloneEl`。
//
// 在 detached subtree 上 `Node.contains` 仍正确判定父子关系。
export function cleanupRemovedSubtrees(roots: HTMLElement[]): void {
  const victims: HTMLElement[] = [];
  state.elementMap.forEach((entry, key) => {
    let hit = false;
    let hitByKey = false;
    let hitByClone = false;
    for (const root of roots) {
      if (key === root || root.contains(key)) {
        hit = true;
        hitByKey = true;
        break;
      }
      if (entry.cloneEl !== undefined && (entry.cloneEl === root || root.contains(entry.cloneEl))) {
        hit = true;
        hitByClone = true;
        break;
      }
    }
    if (!hit) return;

    if (hitByKey && mutationIgnoredNodes.has(key)) {
      mutationIgnoredNodes.delete(key);
      return;
    }
    if (hitByClone && entry.cloneEl && mutationIgnoredNodes.has(entry.cloneEl)) {
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
  const pending = new Set<HTMLElement>();

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target as HTMLElement;
      if (!entry.isIntersecting) {
        pending.delete(el);
        return;
      }
      if (pending.has(el)) return;
      if (state.elementMap.has(el)) return;

      if (state.aggregate.aggregateEnabled) {
        state.pendingAggregateElements.add(el);
        scheduleAggregateFlush();
      } else {
        pending.add(el);
        window.setTimeout(() => {
          pending.delete(el);
          if (state.elementMap.has(el)) return;
          if (el.isConnected) {
            translateSingleElement(el);
          }
        }, 200);
      }
    });
  }, { threshold: 0, rootMargin: '100px' });
}

// ─── Mutation Observer for Dynamic Content ──────────────────────────────

// MutationObserver 节流批处理：模块级保存（不放进 state，避免 restoreAll 误清）。
// 节点离场清理路径仍实时执行；新增路径入队后由 flush 批处理。
let mutationFlushTimer: number | null = null;
const pendingMutationNodes: Set<HTMLElement> = new Set();
const MUTATION_FLUSH_DELAY_MS = 200;

let mutationObserver: MutationObserver | null = null;
let routeChangeTimer: number | null = null;

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

  // 祖先去重：若 A 包含 B 且都在集合里，仅扫描 A。
  // 复杂度 O(n²)，单次 flush 节点数实测 < 500，可接受；
  // 若日后量级超出，改为按 DOM 深度排序 + Set 标记。
  const roots = nodes.filter(
    (n) => !nodes.some((m) => m !== n && m.contains(n))
  );

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
  mutationObserver = new MutationObserver((mutations) => {
    if (!state.isActive || !state.observer) return;

    // 移除路径：先收集所有被移除节点，再对 elementMap 做一次遍历完成清理，
    // 避免 O(mutations × elementMap) 的重复扫描。GC 仍然实时，泄漏窗口极小。
    const removedRoots: HTMLElement[] = [];
    for (const m of mutations) {
      m.removedNodes.forEach((node) => {
        if (node instanceof HTMLElement) removedRoots.push(node);
      });
    }
    if (removedRoots.length > 0) {
      cleanupRemovedSubtrees(removedRoots);
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
  const elements = getTranslatableElements();
  if (!state.observer) {
    state.observer = createObserver();
  }

  elements.forEach((el) => {
    state.observer!.observe(el);
  });

  // If aggregate is enabled, also immediately flush any elements already in viewport
  if (state.aggregate.aggregateEnabled) {
    const visibleElements = elements.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    visibleElements.forEach(el => state.pendingAggregateElements.add(el));
    scheduleAggregateFlush();
  }
}

export function stopTranslation(): void {
  state.observer?.disconnect();
  state.observer = null;
  mutationObserver?.disconnect();
  mutationObserver = null;
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
  if (routeChangeTimer !== null) {
    window.clearTimeout(routeChangeTimer);
    routeChangeTimer = null;
  }
}

// ─── SPA Route Change Detection ─────────────────────────────────────────

function handleRouteChange(): void {
  if (state.isActive) {
    stopTranslation();
    if (routeChangeTimer !== null) {
      window.clearTimeout(routeChangeTimer);
    }
    routeChangeTimer = window.setTimeout(() => {
      routeChangeTimer = null;
      if (state.isActive) {
        startTranslation();
      }
    }, 500);
  }
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
