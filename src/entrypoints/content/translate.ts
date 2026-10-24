import type { TranslationResponse } from '@/types';
import { encodeInline, hasTranslatableText } from '@/lib/inline-placeholder';
import { encodeBatch, decodeBatch } from '@/lib/batch-protocol';
import { sendBgMessage } from '@/lib/messaging';
import { shouldSkipByLanguage } from '@/lib/lang-detect';
import { state, resetAutoRetryCount } from './state';
import { shouldRetryManually } from './retry';
import { applyTranslation } from './style-apply';

function clearElementPending(el: HTMLElement): void {
  el.removeAttribute('data-translator-pending');
  el.removeAttribute('data-translator-theme');
}

// ─── Single Element Translation ─────────────────────────────────────────

function markElementIdle(el: HTMLElement): void {
  state.elementMap.set(el, {
    translatedText: '',
    status: 'idle',
    showingOriginal: false,
  });
}

// 自身 lang 属性与最近 [lang] 祖先分别取值传入跳过判定：自身属性直接决定元素语言，
// 祖先只是页面环境（站点 UI 本地化时正文可能是外语），二者判定语义不同。
function getAncestorLang(el: HTMLElement): string | null {
  return el.parentElement?.closest('[lang]')?.getAttribute('lang') ?? null;
}

// 目标语言跳过：已是目标语言的元素标记 idle（进 elementMap，避免重复判定），
// 不发 TRANSLATE 消息、不加 loading 态。
function skipIfTargetLanguage(el: HTMLElement, text: string): boolean {
  const ownLang = el.getAttribute('lang');
  const ancestorLang = getAncestorLang(el);
  if (!shouldSkipByLanguage(ownLang, ancestorLang, text, state.targetLang)) return false;
  markElementIdle(el);
  return true;
}

export async function translateSingleElement(el: HTMLElement, force = false, skipActiveCheck = false): Promise<void> {
  if (!force && state.elementMap.has(el)) return;
  if (el.hasAttribute('data-translator-pending')) return;

  // 手动重试（Ctrl+悬浮 / 聚合兜底）用 force 绕过「已存在条目」检查，但
  // `applyTranslation` 内部还有一道 `elementMap.has(el)` 的幂等守卫：若不先
  // 清掉失败 / idle 的旧快照，请求会照常发出（照常计费）而译文永远不渲染。
  // 只清非 translated 条目 —— 已翻译段落的切换由 Ctrl+悬浮的 toggle 路径处理。
  if (force) {
    const existing = state.elementMap.get(el);
    if (existing && existing.status !== 'translated') {
      state.elementMap.delete(el);
    }
  }

  const rawText = el.textContent?.trim();
  if (!rawText || rawText.length < 5) return;

  // 只有占位符、没有可翻译字面文本的容器不发请求：编码后只剩 `#1# #2#`，
  // 模型无事可做（白白计费），渲染时还会按占位符顺序重建整棵子树、丢失原节点
  // 位置语义（详见 hasTranslatableText 注释）。Ctrl+悬停等绕过 collectBlocks
  // 的入口在这里统一兜住。
  if (!hasTranslatableText(el)) return;

  if (skipIfTargetLanguage(el, rawText)) return;

  el.setAttribute('data-translator-pending', 'true');
  el.setAttribute('data-translator-theme', state.translationLoadingTheme);

  try {
    // 整段翻译：所有显示模式统一走 encodeInline / decodeInline（`<sN>` / `#N#`
    // 占位符）。original / clean 历史上按 Text 节点粒度拆条发送，导致
    // `<p>Hello <b>world</b></p>` 被拆成两条独立翻译、跨节点语序与指代断裂
    // （默认模式质量明显低于双语模式的机制原因）；这里统一为整段一次请求。
    // encodeInline
    const { placeholderText, fragments, styleTemplates } = encodeInline(el);
    if (!placeholderText) {
      clearElementPending(el);
      return;
    }

    // 全局在飞请求上限：闸门放在真正发请求的叶子节点上（见 withRequestSlot 注释）
    const result = await withRequestSlot(() => sendBgMessage<TranslationResponse>({
      type: 'TRANSLATE',
      payload: {
        text: placeholderText,
        targetLang: state.targetLang,
        hasPlaceholders: fragments.length > 0 || styleTemplates.length > 0,
      },
    }));

    clearElementPending(el);
    // 如果用户已在翻译完成前按快捷键关闭翻译，则不再应用结果
    // skipActiveCheck: Ctrl+Hover 独立翻译时 state.isActive 始终为 false，需跳过此检查
    if (!skipActiveCheck && !state.isActive) {
      // 标记为已处理，避免用户再次启动翻译时重复请求
      markElementIdle(el);
      return;
    }
    applyTranslation(el, { kind: 'inline', translatedText: result.text, placeholderText, fragments, styleTemplates });
  } catch (err) {
    console.warn('[Translator] translateSingleElement failed:', err);
    clearElementPending(el);
    el.setAttribute('data-translator-error', 'true');
    state.elementMap.set(el, {
      translatedText: '',
      status: 'error',
      showingOriginal: false,
      errorAt: performance.now(),
    });
  }
}

// ─── Manual Retry (user-initiated) ──────────────────────────────────────
//
// 失败段落的唯一出路是「用户显式手势」：Ctrl+悬浮重试单段、Alt+W / popup
// 「翻译此页」切回译文时重排全页失败段落。自动重试（observer.ts）有 15s 冷却
// 与 MAX_RETRIES 次数上限，上限耗尽后失败段落会永久卡住 —— 手动入口必须绕过
// 这两道闸门，否则用户报障的「红虚线再也消不掉」无解（见 retry.ts 的分工说明）。
//
// 判定统一走 shouldRetryManually：pending 段落已在飞、重复发只是重复计费；
// translated 段落由显示切换路径处理，强制重译会撞上 applyTranslation 的幂等
// 守卫（请求照发、译文不渲染）。因此重试入口对非失败段落一律 no-op，
// 这也是「切回译文」不会在每次 toggle 时放大计费的关键。

/**
 * 手动重试单个失败段落。
 *
 * 调用方必须先确认这是用户手势（Ctrl+悬浮命中 / 切回译文），本函数只负责
 * 按失败语义执行：清零自动重试预算 → 摘掉红虚线 → 走 force 路径重新请求。
 *
 * 为什么先清 data-translator-error 而不是等成功后再清：请求期间段落处于
 * pending 态，若红虚线还在，用户会以为重试没生效（正是报障的观感）；
 * 失败则 catch 分支会重新打上该属性，成功则由 applyTranslation 兜底清除。
 *
 * @param skipActiveCheck Ctrl+悬浮时整页翻译未激活（state.isActive 为 false），
 *   必须跳过「用户已停止翻译则丢弃结果」的检查，否则悬停重试的结果永远不渲染。
 *   切回译文路径保持 false：用户此时随时可能按「停止翻译」，迟到的结果不应写回。
 */
export function retryFailedElement(el: HTMLElement, skipActiveCheck = false): Promise<void> {
  const existing = state.elementMap.get(el);
  if (!shouldRetryManually(existing?.status, el.hasAttribute('data-translator-error'))) {
    return Promise.resolve();
  }
  // 属性态与条目态可能短暂不一致（聚合路径先打 pending 属性、成功后才写条目）。
  // 这种情况下必须先让在飞请求跑完：清掉红虚线只会让用户看不到任何失败痕迹，
  // 而 translateSingleElement 会因 pending 属性直接早退，等于「重试点了但没重试」。
  if (el.hasAttribute('data-translator-pending')) return Promise.resolve();
  // 手动重试必须恢复完整预算：否则下一次自动重试仍被上一次耗尽的计数挡住
  resetAutoRetryCount(el);
  el.removeAttribute('data-translator-error');
  return translateSingleElement(el, true, skipActiveCheck);
}

/**
 * 重排全页失败段落（切回译文时调用）。
 *
 * 只收 status === 'error'（或仍带红虚线）的条目：已翻译段落切回译文是纯 DOM
 * 显示切换，不发请求；本函数因此不会把「一次 Alt+W」变成整页重新计费。
 * 并发用与聚合路径同一套 limitConcurrency + maxConcurrentRequests，
 * 避免长页面积压几十个失败段落时一次性打爆后台限流。
 */
export async function retryFailedElements(): Promise<void> {
  const targets: HTMLElement[] = [];
  state.elementMap.forEach((entry, el) => {
    if (!shouldRetryManually(entry.status, el.hasAttribute('data-translator-error'))) return;
    // 离树条目由 observer 的 cleanup 负责；在飞段落由 pending 属性挡住
    if (!el.isConnected) return;
    if (el.hasAttribute('data-translator-pending')) return;
    targets.push(el);
  });
  if (targets.length === 0) return;

  const tasks = targets.map(el => () => retryFailedElement(el));
  await limitConcurrency(tasks, state.aggregate.maxConcurrentRequests);
}

// ─── Concurrency Limiter ────────────────────────────────────────────────
//
// 两层并发控制，各自解决不同问题：
//
// 1. `limitConcurrency(tasks, limit)` —— 任务组内的并发度（原有的 worker 池）。
// 2. `withRequestSlot(fn)` —— **全局**在飞请求上限，闸门放在真正发请求的叶子节点
//    （sendBgMessage 调用处）上。
//
// 为什么全局闸门必须放在叶子上，而不是包住任务组：
// 本文件存在嵌套结构 —— flushAggregateQueue 限流「批次」，批次失败回落时
// fullFallback / retryElements 又限流「单段」。如果全局信号量包住任务组，
// 外层任务持有名额后再等待内层任务拿名额，内层永远等不到 → 死锁（实测：
// 把闸门包在任务组上，limit=3 时 4 个批次各回落 3 段，脚本直接挂死）。
//
// 而只包住任务组、不加全局闸门，则两层各自跑满上限，实际并发是 limit²：
// 复刻实测 limit=3 时峰值在飞 9 个，是用户配置的 3 倍，模型 API 侧限流与计费
// 预算都会被打穿。
//
// 叶子闸门同时满足两个约束：嵌套结构里没有「持有名额等名额」的路径（不会死锁），
// 且所有真实请求共享同一个计数器（并发严格 ≤ limit）。

/** 当前允许的最大并发请求数（取自 state，设置变更后下一次获取即生效） */
function concurrencyLimit(): number {
  return Math.max(1, state.aggregate.maxConcurrentRequests);
}

let activeRequests = 0;
const waiters: Array<() => void> = [];

/** 取得一个全局请求名额（无空位时排队，FIFO） */
function acquireRequestSlot(): Promise<void> {
  if (activeRequests < concurrencyLimit()) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise<void>(resolve => {
    // 名额由释放方直接转交，activeRequests 保持不变
    waiters.push(resolve);
  });
}

function releaseRequestSlot(): void {
  const next = waiters.shift();
  if (next) {
    next();
    return;
  }
  activeRequests--;
}

/**
 * 在全局并发上限内执行一次真实请求。
 *
 * 只用于包住 `sendBgMessage` 这类叶子调用，不要包住「任务组」—— 嵌套的任务组
 * 会各自持有名额再互相等待，形成死锁（见上方注释）。
 */
async function withRequestSlot<T>(request: () => Promise<T>): Promise<T> {
  await acquireRequestSlot();
  try {
    return await request();
  } finally {
    releaseRequestSlot();
  }
}

/** 任务组内并发度（组内最多 limit 个同时进行；全局上限由 withRequestSlot 保证） */
async function limitConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<(T | undefined)[]> {
  const results: (T | undefined)[] = new Array(tasks.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = await tasks[i]();
      } catch (err) {
        console.warn('[Translator] limitConcurrency task failed:', err);
      }
    }
  }

  const workers = Array.from({ length: Math.min(Math.max(1, limit), tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ─── Aggregate Translation ──────────────────────────────────────────────

function createBatches(elements: HTMLElement[]): HTMLElement[][] {
  const batches: HTMLElement[][] = [];
  let currentBatch: HTMLElement[] = [];
  let currentLength = 0;

  for (const el of elements) {
    const text = el.textContent?.trim() || '';
    if (!text) continue;

    const wouldExceedParagraphs = currentBatch.length >= state.aggregate.maxParagraphsPerRequest;
    const wouldExceedLength = currentLength + text.length > state.aggregate.maxTextLengthPerRequest;

    if (wouldExceedParagraphs || wouldExceedLength) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }
      currentBatch = [el];
      currentLength = text.length;
    } else {
      currentBatch.push(el);
      currentLength += text.length;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

async function translateBatchWithFallback(batch: HTMLElement[]): Promise<void> {
  const placeholderTexts: string[] = [];
  const fragmentsList: DocumentFragment[][] = [];
  const styleTemplatesList: Element[][] = [];
  const validElements: HTMLElement[] = [];

  for (const el of batch) {
    const rawText = el.textContent?.trim();
    if (!rawText || rawText.length < 5) continue;
    // 与单段路径同一判定：只剩占位符的容器不进批量请求
    if (!hasTranslatableText(el)) continue;

    const encoded = encodeInline(el);
    if (!encoded.placeholderText) continue;
    placeholderTexts.push(encoded.placeholderText);
    fragmentsList.push(encoded.fragments);
    styleTemplatesList.push(encoded.styleTemplates);
    validElements.push(el);
  }

  if (validElements.length === 0) return;

  const expected = validElements.length;
  validElements.forEach(el => {
    el.setAttribute('data-translator-pending', 'true');
    el.setAttribute('data-translator-theme', state.translationLoadingTheme);
  });

  const clearPending = () => {
    validElements.forEach(el => {
      el.removeAttribute('data-translator-pending');
      el.removeAttribute('data-translator-theme');
    });
  };

  const fullFallback = async () => {
    clearPending();
    const tasks = validElements.map(el => () => translateSingleElement(el, true));
    await limitConcurrency(tasks, state.aggregate.maxConcurrentRequests);
  };

  try {
    const combinedText = encodeBatch(
      placeholderTexts.map((text, idx) => ({ id: idx + 1, text }))
    );

    // 同上：整批请求同样占一个全局名额
    const result = await withRequestSlot(() => sendBgMessage<TranslationResponse>({
      type: 'TRANSLATE',
      payload: {
        text: combinedText,
        targetLang: state.targetLang,
        isAggregate: true,
        hasPlaceholders: fragmentsList.some(f => f.length > 0) || styleTemplatesList.some(s => s.length > 0),
      },
    }));

    const { translations, missing, suspicious } = decodeBatch(result.text, expected);

    // 协议不可信（重复 id / id 乱序）时宁可整批回落逐段翻译：
    // 这类输入无法区分「模型串段」与「正文行首恰好是 <<<N>>>」，继续应用会把
    // 别段译文写进当前段落，错位译文比没有译文更糟。
    const protocolFailed =
      suspicious || translations.size === 0 || missing.length >= Math.ceil(expected / 2);

    if (protocolFailed) {
      await fullFallback();
      return;
    }

    // 如果用户已在翻译完成前按快捷键关闭翻译，则不再应用结果
    if (!state.isActive) {
      clearPending();
      for (const el of validElements) {
        markElementIdle(el);
      }
      return;
    }

    const retryElements: HTMLElement[] = [];
    validElements.forEach((el, index) => {
      const translated = translations.get(index + 1);
      if (translated) {
        // 成功翻译：让 applyTranslation 在分片更新的同一帧中应用渲染并移除 pending 属性
        applyTranslation(el, {
          kind: 'inline',
          translatedText: translated,
          placeholderText: placeholderTexts[index],
          fragments: fragmentsList[index],
          styleTemplates: styleTemplatesList[index],
        });
      } else {
        // 未能翻译（将重试）：同步清空 pending 属性以供下一次翻译
        el.removeAttribute('data-translator-pending');
        el.removeAttribute('data-translator-theme');
        retryElements.push(el);
      }
    });

    if (retryElements.length > 0) {
      const tasks = retryElements.map(el => () => translateSingleElement(el, true));
      await limitConcurrency(tasks, state.aggregate.maxConcurrentRequests);
    }
  } catch (err) {
    console.warn('[Translator] aggregate translation failed, falling back to per-element:', err);
    await fullFallback();
  }
}

// ─── 聚合队列：单飞闸门 ─────────────────────────────────────────────────
//
// limitConcurrency 的并发上限是**每次调用**局部的。flushAggregateQueue 是异步的：
// 第一批请求还没回来时，滚动又会入队新元素并在 300ms 后触发第二次 flush，两次
// flush 各自跑满 maxConcurrentRequests → 全局在飞数翻倍。
//
// 实测（复刻本文件逻辑，limit=3、两批各 6 个任务）：并发两次 flush 后峰值在飞
// 6 个，超限 3 个。对模型 API 而言，用户设的「并发上限」形同虚设，长页面滚动时
// 容易直接撞限流 / 超额计费。
//
// 修法：用单飞闸门串行化 flush。第二次触发不再并发开新池，而是标记「还有活」，
// 等当前 flush 结束后立刻再跑一轮 —— 元素不会被丢弃（下一轮从
// pendingAggregateElements 取走），只是把并发池收回到用户配置的上限。
let aggregateFlushRunning = false;
let aggregateFlushAgain = false;

async function flushAggregateQueue(): Promise<void> {
  if (aggregateFlushRunning) {
    // 已有 flush 在飞：只记录「结束后再跑一轮」，不并发开新池
    aggregateFlushAgain = true;
    return;
  }
  aggregateFlushRunning = true;
  try {
    do {
      aggregateFlushAgain = false;
      await runAggregateFlushPass();
    } while (aggregateFlushAgain);
  } finally {
    aggregateFlushRunning = false;
  }
}

async function runAggregateFlushPass(): Promise<void> {
  if (state.pendingAggregateElements.size === 0) return;

  const elements = Array.from(state.pendingAggregateElements);
  state.pendingAggregateElements.clear();

  // Filter out already translated or pending elements；目标语言命中的元素标记 idle 后排除
  const eligible: HTMLElement[] = [];
  for (const el of elements) {
    if (state.elementMap.has(el)) continue;
    if (el.hasAttribute('data-translator-pending')) continue;
    if (skipIfTargetLanguage(el, el.textContent?.trim() || '')) continue;
    eligible.push(el);
  }

  if (eligible.length === 0) return;

  const batches = createBatches(eligible);
  const tasks = batches.map(batch => () => translateBatchWithFallback(batch));

  await limitConcurrency(tasks, state.aggregate.maxConcurrentRequests);
}

export function scheduleAggregateFlush(): void {
  if (state.aggregateDebounceTimer) {
    window.clearTimeout(state.aggregateDebounceTimer);
  }
  state.aggregateDebounceTimer = window.setTimeout(() => {
    state.aggregateDebounceTimer = null;
    void flushAggregateQueue();
  }, 300);
}
