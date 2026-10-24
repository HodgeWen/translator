import type { ElementState } from './state';
import { state, resetAutoRetryCount } from './state';
import { snapshotChildren, restoreChildren } from './original-nodes';
import type { InlineEncodedBlock } from '@/lib/inline-placeholder';
import { decodeInline } from '@/lib/inline-placeholder';

export type TranslationRender = {
  kind: 'inline';
  translatedText: string;
} & InlineEncodedBlock;

// ─── DOM Update Chunking Scheduler ──────────────────────────────────────
//
// 分片策略：按「每帧时间预算」而不是「每帧固定条数」。
//
// 为什么不再用固定 CHUNK_SIZE=4：单次原地渲染（decodeInline + replaceChildren）
// 在真实 Chromium 实测仅约 0.004ms，一帧 16ms 预算本可写入上千段；固定 4 条
// 意味着 480 段要排 120 帧 ≈ 2 秒才渲染完（实测 1975ms / 120 帧），期间用户
// 看到的是一段一段慢慢冒出来的译文，长页面尤其明显。改为时间预算后同一场景
// 实测 44ms / 3 帧完成，且单帧仍受 MAX_UPDATES_PER_FRAME 与预算双重约束，
// 不会因为个别超长段落把一帧拖到几十毫秒。
//
// 队列用「读游标 + 排空时重置」代替 Array#shift：shift 每次都要搬移整个数组，
// 480 条队列就是 O(n²) 的搬移；游标方案是 O(n)。
const domUpdateQueue: Array<() => void> = [];
let domUpdateHead = 0;
let isUpdatingDOM = false;
/** 单帧时间预算（ms）：留足余量给浏览器合成与页面自身的 rAF 回调 */
const DOM_UPDATE_BUDGET_MS = 8;
/** 单帧条数硬上限：防止「单条极快」时一帧吞掉整条队列导致长任务 */
const MAX_UPDATES_PER_FRAME = 200;

export function scheduleDOMUpdate(updateFn: () => void): void {
  domUpdateQueue.push(updateFn);
  if (!isUpdatingDOM) {
    isUpdatingDOM = true;
    requestAnimationFrame(processDOMUpdateQueue);
  }
}

function processDOMUpdateQueue(): void {
  const frameStart = performance.now();
  let processed = 0;
  while (domUpdateHead < domUpdateQueue.length && processed < MAX_UPDATES_PER_FRAME) {
    const update = domUpdateQueue[domUpdateHead++];
    try {
      update();
    } catch (err) {
      console.error('[Translator] DOM update failed:', err);
    }
    processed++;
    if (performance.now() - frameStart >= DOM_UPDATE_BUDGET_MS) break;
  }

  if (domUpdateHead < domUpdateQueue.length) {
    requestAnimationFrame(processDOMUpdateQueue);
    return;
  }
  // 队列排空：清空已处理项并复位游标，避免数组无限增长
  domUpdateQueue.length = 0;
  domUpdateHead = 0;
  isUpdatingDOM = false;
}

// ─── Utilities ──────────────────────────────────────────────────────────

// 块级标签集合：用于 bilingual 选择 block / inline 展示形式。
// 直接按 tagName 判定而非 getComputedStyle，避免站点 display 被 inline 化（如
// Tailwind `block` reset、各种 normalize）后误判，也免去同步 reflow 成本。
const BLOCK_TAGS = new Set([
  'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'DIV', 'ARTICLE', 'SECTION', 'FIGCAPTION',
  'DT', 'DD', 'CAPTION', 'TD', 'TH',
]);

function isBlockElement(el: HTMLElement): boolean {
  return BLOCK_TAGS.has(el.tagName);
}

// ─── 原地渲染契约 ───────────────────────────────────────────────────────
//
// 三种「替换型」显示模式（original / clean / underline）一律**原地渲染**：
// 原 el 节点本身永远留在 DOM 树中，只把它的**子节点**换成译文渲染节点。
//
// 为什么不再用 `cloneNode + replaceWith` 造 wrapper 占位（历史实现）：
//   - 原节点一旦离树，其上的 addEventListener、React/Vue 合成事件委托、
//     自定义元素（Web Components）升级状态全部失效 —— 翻译后站点交互
//     （展开 / 点赞 / 折叠 / 下拉菜单）失灵，这是最影响体感的问题。
//   - clone 必须删掉 id 才能避免 id 冲突，代价是锚点跳转、`label[for]`、
//     `aria-labelledby` 全部断链。
// 原地渲染天然规避两者：元素没换，`:nth-child` / 兄弟选择器仍然命中，
// id 保留，元素级监听器保留。
//
// 原节点引用以**数组**保存（`snapshotChildren`），不用 DocumentFragment：
// fragment 被 append 进 DOM 后会移空自身，还原时只能拿到空集合 —— 这是
// 仓库里已记录过的历史 bug 根因。
//
// 保留同标签的设计意图（为什么不用 `all: revert`）：译文写回原 el 内部，
// 天然继承站点为该标签定义的样式（blockquote 左边框、列表标记、标题字号），
// 不需要清洗，也不会把站点视觉指示抹掉。bilingual / underline 注入的是
// 新增 span，才需要 `all: revert`（见 styles.css）。

/** 原地替换子节点：先清空再按序放入，节点引用保持不变 */
function replaceChildrenWith(el: HTMLElement, nodes: readonly ChildNode[]): void {
  el.replaceChildren(...nodes);
}

// 只标 data-translator-processed：原地渲染下元素本身没换，译文与原文都落在
// 同一元素上、继承同一份站点 CSS，不需要额外的「视图」属性来区分样式。
function markTranslated(el: HTMLElement): void {
  el.setAttribute('data-translator-processed', 'true');
}

// ─── Style Application ──────────────────────────────────────────────────

// original / clean 模式：原地渲染。原 el 保留在 DOM 槽位、保留 id 与监听器，
// 只把子节点换成译文；原节点引用存入 ElementState.originalNodes 供还原 / 切换。
function applyReplaceStyle(
  el: HTMLElement,
  translatedText: string,
  fragments: DocumentFragment[],
  styleTemplates: Element[],
): void {
  // 不保存 el.innerHTML：它只是 originalNodes 的字符串副本，仓库里没有任何读取方
  // （还原/切换一律走节点引用数组）。保存它等于给每个已翻译段落多留一份完整 HTML。
  // 快照原节点引用后，replaceChildren 会把它们移出 el（引用由数组持有）
  const originalNodes = snapshotChildren<ChildNode>(el);

  const fragment = decodeInline(translatedText, fragments, styleTemplates);
  replaceChildrenWith(el, Array.from(fragment.childNodes) as ChildNode[]);
  const renderedNodes = snapshotChildren<ChildNode>(el);

  markTranslated(el);

  state.elementMap.set(el, {
    originalNodes,
    renderedNodes,
    translatedText,
    status: 'translated',
    showingOriginal: false,
  });
}

// 还原子节点。只有真正渲染过译文的条目才有 originalNodes（apply*Style 写入）；
// pending / idle / error 条目从未改动过 DOM，这里必须直接跳过 ——
// 用 `el.innerHTML = originalHTML` 兜底会重新解析并替换子节点，
// 白白销毁原节点的监听器与自定义元素状态（原地渲染要避免的正是这件事）。
function restoreChildNodes(el: HTMLElement, elState: ElementState): void {
  if (!elState.originalNodes) return;
  restoreChildren(el, elState.originalNodes);
}

function applyBilingualStyle(el: HTMLElement, translatedText: string, fragments: DocumentFragment[], styleTemplates: Element[]): void {
  // 快照子节点引用，原节点原地保留在 el 中。不得保存 append 后会被移空的
  // DocumentFragment（旧实现导致停止翻译时 append 空 fragment、段落被清空）
  const originalNodes = snapshotChildren(el);
  const br = document.createElement('br');
  br.setAttribute('data-translator-br', 'true');

  const span = document.createElement('span');
  span.setAttribute('data-translator-bilingual', 'true');
  span.dataset.display = isBlockElement(el) ? 'block' : 'inline';
  span.appendChild(decodeInline(translatedText, fragments, styleTemplates));

  el.appendChild(br);
  el.appendChild(span);
  // bilingual 不交换子节点，两种视图共存（toggle 只改 display），
  // processed 始终保留以阻止重复收集。
  el.setAttribute('data-translator-processed', 'true');

  state.elementMap.set(el, { originalNodes, translatedText, status: 'translated', showingOriginal: false });
}

function applyUnderlineStyle(el: HTMLElement, translatedText: string, fragments: DocumentFragment[], styleTemplates: Element[]): void {
  const originalText = el.textContent?.trim() ?? '';
  // 原地渲染：快照原节点（随后被 replaceChildren 移出 el），译文 wrapper 接管内容
  const originalNodes = snapshotChildren<ChildNode>(el);

  const wrapper = document.createElement('span');
  wrapper.setAttribute('data-translator-underline', 'true');
  wrapper.title = originalText;
  wrapper.appendChild(decodeInline(translatedText, fragments, styleTemplates));

  replaceChildrenWith(el, [wrapper]);
  markTranslated(el);

  state.elementMap.set(el, {
    originalNodes,
    renderedNodes: [wrapper],
    translatedText,
    status: 'translated',
    showingOriginal: false,
  });
}

export function applyTranslation(el: HTMLElement, render: TranslationRender): void {
  if (state.elementMap.has(el)) return;

  // 同步占位，锁定元素，防止重入
  state.elementMap.set(el, {
    translatedText: render.translatedText,
    status: 'pending',
    showingOriginal: false,
  });

  scheduleDOMUpdate(() => {
    // 节点可能在异步调度的间隔中已经离开 DOM 树，这里做安全拦截
    if (!el.isConnected) {
      state.elementMap.delete(el);
      return;
    }
    // 调度期间用户可能已经「停止翻译」（restoreAll 同步清空 elementMap 并排队
    // 还原）。此时本回调的占位条目已不存在，若继续渲染会把刚还原的段落重新
    // 改成译文 —— 只认自己写入的那条 pending 占位。
    if (state.elementMap.get(el)?.status !== 'pending') return;

    // 清除翻译中状态。data-translator-error 必须一并清除：手动重试成功时
    // 段落已不是失败态，若红虚线残留，用户会看到「译文出来了但红色虚线还在」，
    // 与报障的「红虚线永远消不掉」是同一观感问题。自动重试路径在调用本函数
    // 前也会移除该属性，这里作为所有成功路径的统一兜底。
    el.removeAttribute('data-translator-pending');
    el.removeAttribute('data-translator-theme');
    el.removeAttribute('data-translator-error');

    switch (state.displayStyle) {
      case 'original':
      case 'clean':
        applyReplaceStyle(el, render.translatedText, render.fragments, render.styleTemplates);
        break;
      case 'bilingual':
        applyBilingualStyle(el, render.translatedText, render.fragments, render.styleTemplates);
        break;
      case 'underline':
        applyUnderlineStyle(el, render.translatedText, render.fragments, render.styleTemplates);
        break;
    }

    // 翻译成功即清零自动重试计数：SPA 虚拟列表会复用同一节点承载新段落，
    // 新段落应重新拥有完整的重试预算。
    resetAutoRetryCount(el);

    // 若用户处于「全页显示原文」模式（Alt+W 切换过的），新翻译完成的段落也应立即切到原文显示
    if (state.displayMode === 'original') {
      toggleElementDisplay(el);
    }
  });
}

export function toggleElementDisplay(el: HTMLElement): void {
  const elState = state.elementMap.get(el);
  if (!elState) return;
  // 只有已完成翻译的段落可切换。pending / error 条目只有占位快照
  // （originalNodes / renderedNodes 尚未写入），切换会把段落清空 ——
  // 旧的 wrapper 实现靠「cloneEl 不存在就 break」隐式达到同样效果。
  if (elState.status !== 'translated') return;

  // 目标态：当前显示原文 → 切到译文；反之切到原文
  const showOriginal = !elState.showingOriginal;

  switch (state.displayStyle) {
    case 'original':
    case 'clean':
    case 'underline': {
      // 原地渲染：el 节点本身始终在 DOM 中，只交换子节点。
      // 交换用原节点 / 译文渲染节点的**引用数组**，节点对象不重建，
      // 因此反复切换不会累积节点、也不会丢失原节点。
      if (showOriginal) {
        restoreChildNodes(el, elState);
      } else if (elState.renderedNodes) {
        // 防御：translated 条目必然有 renderedNodes；缺失时不写入空数组，
        // 否则会把段落清空（宁可保持原文，也不能让内容消失）。
        replaceChildrenWith(el, elState.renderedNodes);
      } else {
        return;
      }
      break;
    }
    case 'bilingual': {
      const br = el.querySelector('[data-translator-br]') as HTMLElement | null;
      const biling = el.querySelector('[data-translator-bilingual]') as HTMLElement | null;
      if (showOriginal) {
        // 切到原文：隐藏双语附加段
        if (br) br.style.display = 'none';
        if (biling) biling.style.display = 'none';
      } else {
        // 切到译文：恢复可见
        if (br) br.style.display = '';
        if (biling) biling.style.display = '';
      }
      break;
    }
  }

  elState.showingOriginal = showOriginal;
}

export function restoreAll(): void {
  // 同步收集所有要还原的状态快照并清除 elementMap，使状态立即恢复到未翻译状态，
  // 防止状态冲突。直接 forEach 取值：旧实现先 Array.from(keys) 再对每个 key 做一次
  // elementMap.get，等于多一遍 O(n) 哈希查找 + 一次数组分配。
  const snapshots: Array<{ el: HTMLElement; elState: ElementState }> = [];
  state.elementMap.forEach((elState, el) => {
    snapshots.push({ el, elState });
  });

  state.elementMap.clear();

  // 异步帧分片进行真实的 DOM 还原动作（每帧预算见 DOM_UPDATE_BUDGET_MS）
  for (const item of snapshots) {
    scheduleDOMUpdate(() => {
      const { el, elState } = item;
      // 三种模式统一：把原节点放回 el（原地渲染下 el 从未离树，
      // 无需再做 wrapper → el 的节点替换）
      restoreChildNodes(el, elState);
      el.removeAttribute('data-translator-processed');
      el.removeAttribute('data-translator-error');
      el.removeAttribute('data-translator-pending');
      el.removeAttribute('data-translator-theme');
    });
  }
}

// 全页 toggle：把 elementMap 中所有「当前 showingOriginal 与目标态不一致」的段落
// 都切到目标态。成功翻译的段落（status === 'translated'）才有切换价值；
// 失败/pending 的段落跳过（其渲染节点可能不存在）。
// 为避免长页面阻塞主线程，使用 requestAnimationFrame 分片处理。
const TOGGLE_BATCH_SIZE = 50;
let toggleRunId = 0;

export function toggleAllDisplay(targetShowOriginal: boolean): void {
  const runId = ++toggleRunId;
  const targets: HTMLElement[] = [];
  state.elementMap.forEach((entry: ElementState, el: HTMLElement) => {
    if (entry.status !== 'translated') return;
    if (entry.showingOriginal === targetShowOriginal) return;
    targets.push(el);
  });

  let index = 0;
  function processBatch(): void {
    if (runId !== toggleRunId) return;
    const end = Math.min(index + TOGGLE_BATCH_SIZE, targets.length);
    for (; index < end; index++) {
      const el = targets[index];
      const entry = state.elementMap.get(el);
      if (entry?.status === 'translated' && entry.showingOriginal !== targetShowOriginal) {
        toggleElementDisplay(el);
      }
    }
    if (index < targets.length) {
      requestAnimationFrame(processBatch);
    }
  }
  processBatch();
}
