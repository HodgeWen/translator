import type { TranslationResponse } from '@/types';
import { encodeInline } from '@/lib/inline-placeholder';
import { encodeBatch, decodeBatch } from '@/lib/batch-protocol';
import { sendBgMessage } from '@/lib/messaging';
import { detectAndCheckSkip } from '@/lib/translate-via-bg';
import { state } from './state';
import { applyTranslation } from './style-apply';

// ─── Single Element Translation ─────────────────────────────────────────

function markElementIdle(el: HTMLElement): void {
  state.elementMap.set(el, {
    originalHTML: el.innerHTML,
    translatedText: '',
    status: 'idle',
    showingOriginal: false,
  });
}

export async function translateSingleElement(el: HTMLElement, force = false, skipActiveCheck = false): Promise<void> {
  if (!force && state.elementMap.has(el)) return;
  if (el.hasAttribute('data-translator-pending')) return;

  const rawText = el.textContent?.trim();
  if (!rawText || rawText.length < 5) return;

  el.setAttribute('data-translator-pending', 'true');

  try {
    const { skip, detectedLang } = await detectAndCheckSkip(rawText, state.nativeLanguage);
    if (skip) {
      el.removeAttribute('data-translator-pending');
      markElementIdle(el);
      return;
    }

    // encodeInline 在语言检测之后执行，避免跳过翻译时浪费 DOM clone 开销
    const { placeholderText, fragments } = encodeInline(el);
    if (!placeholderText) {
      el.removeAttribute('data-translator-pending');
      return;
    }

    const result = await sendBgMessage<TranslationResponse>({
      type: 'TRANSLATE',
      payload: {
        text: placeholderText,
        sourceLang: detectedLang || undefined,
        targetLang: state.targetLang,
        hasPlaceholders: fragments.length > 0,
      },
    });

    el.removeAttribute('data-translator-pending');
    // 如果用户已在翻译完成前按快捷键关闭翻译，则不再应用结果
    // skipActiveCheck: Ctrl+Hover 独立翻译时 state.isActive 始终为 false，需跳过此检查
    if (!skipActiveCheck && !state.isActive) {
      // 标记为已处理，避免用户再次启动翻译时重复请求
      markElementIdle(el);
      return;
    }
    applyTranslation(el, result.text, fragments);
  } catch (err) {
    console.warn('[Translator] translateSingleElement failed:', err);
    el.removeAttribute('data-translator-pending');
    el.setAttribute('data-translator-error', 'true');
    state.elementMap.set(el, {
      originalHTML: el.innerHTML,
      translatedText: '',
      status: 'error',
      showingOriginal: false,
    });
  }
}

// ─── Concurrency Limiter ────────────────────────────────────────────────

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

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
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
  const validElements: HTMLElement[] = [];

  // Detect language once on a representative sample, apply to entire batch.
  let batchDetectedLang: string | null = null;
  const sampleEl = batch.find(el => (el.textContent?.trim()?.length ?? 0) >= 5);
  if (sampleEl) {
    const { skip, detectedLang } = await detectAndCheckSkip(
      sampleEl.textContent!.trim(),
      state.nativeLanguage
    );
    if (skip) {
      for (const el of batch) markElementIdle(el);
      return;
    }
    batchDetectedLang = detectedLang;
  }

  for (const el of batch) {
    const rawText = el.textContent?.trim();
    if (!rawText || rawText.length < 5) continue;

    const encoded = encodeInline(el);
    if (!encoded.placeholderText) continue;
    placeholderTexts.push(encoded.placeholderText);
    fragmentsList.push(encoded.fragments);
    validElements.push(el);
  }

  if (validElements.length === 0) return;

  const expected = validElements.length;
  validElements.forEach(el => el.setAttribute('data-translator-pending', 'true'));

  const clearPending = () => {
    validElements.forEach(el => el.removeAttribute('data-translator-pending'));
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

    const result = await sendBgMessage<TranslationResponse>({
      type: 'TRANSLATE',
      payload: {
        text: combinedText,
        sourceLang: batchDetectedLang || undefined,
        targetLang: state.targetLang,
        isAggregate: true,
        hasPlaceholders: fragmentsList.some(f => f.length > 0),
      },
    });

    const { translations, missing } = decodeBatch(result.text, expected);

    const protocolFailed =
      translations.size === 0 || missing.length >= Math.ceil(expected / 2);

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
      el.removeAttribute('data-translator-pending');
      const translated = translations.get(index + 1);
      if (translated) {
        applyTranslation(el, translated, fragmentsList[index]);
      } else {
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

async function flushAggregateQueue(): Promise<void> {
  if (state.pendingAggregateElements.size === 0) return;

  const elements = Array.from(state.pendingAggregateElements);
  state.pendingAggregateElements.clear();

  // Filter out already translated or pending elements
  const eligible = elements.filter(el => {
    if (state.elementMap.has(el)) return false;
    if (el.hasAttribute('data-translator-pending')) return false;
    return true;
  });

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
    flushAggregateQueue();
  }, 300);
}
