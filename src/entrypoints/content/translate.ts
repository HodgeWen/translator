import type { TranslationResponse } from '@/types';
import { encodeInline } from '@/lib/inline-placeholder';
import { encodeBatch, decodeBatch } from '@/lib/batch-protocol';
import type { TextNodeTemplate } from '@/lib/dom-text-replace';
import { assignTextNodeIds, createTextNodeTemplate } from '@/lib/dom-text-replace';
import { sendBgMessage } from '@/lib/messaging';
import { shouldSkipByLanguage } from '@/lib/lang-detect';
import { state } from './state';
import { applyTranslation } from './style-apply';

const TEXT_NODE_TRANSLATION_PROMPT = `Additional instruction: Each marked item represents one DOM text node. Translate the text inside each item, using nearby marked items as context when helpful. Keep every marker exactly as requested, and do not merge, split, remove, or add marked items.`;

interface TextNodeBatchEntry {
  el: HTMLElement;
  template: TextNodeTemplate;
}

function usesTextNodeReplacement(): boolean {
  return state.displayStyle === 'original' || state.displayStyle === 'clean';
}

function clearElementPending(el: HTMLElement): void {
  el.removeAttribute('data-translator-pending');
  el.removeAttribute('data-translator-theme');
}

function assignTemplateItems(template: TextNodeTemplate, startId: number): { items: Array<{ id: number; text: string }>; nextId: number } {
  const items = assignTextNodeIds(template, startId);
  return { items, nextId: startId + items.length };
}

// ─── Single Element Translation ─────────────────────────────────────────

function markElementIdle(el: HTMLElement): void {
  state.elementMap.set(el, {
    originalHTML: el.innerHTML,
    translatedText: '',
    status: 'idle',
    showingOriginal: false,
  });
}

// 取元素自身 lang 属性，缺失时沿最近 [lang] 祖先取值（closest 从自身开始匹配）。
function getEffectiveLang(el: HTMLElement): string | null {
  const tagged: Element | null = el.closest('[lang]');
  return tagged?.getAttribute('lang') ?? null;
}

// 目标语言跳过：已是目标语言的元素标记 idle（进 elementMap，避免重复判定），
// 不发 TRANSLATE 消息、不加 loading 态。
function skipIfTargetLanguage(el: HTMLElement, text: string): boolean {
  if (!shouldSkipByLanguage(getEffectiveLang(el), text, state.targetLang)) return false;
  markElementIdle(el);
  return true;
}

export async function translateSingleElement(el: HTMLElement, force = false, skipActiveCheck = false): Promise<void> {
  if (!force && state.elementMap.has(el)) return;
  if (el.hasAttribute('data-translator-pending')) return;

  const rawText = el.textContent?.trim();
  if (!rawText || rawText.length < 5) return;

  if (skipIfTargetLanguage(el, rawText)) return;

  el.setAttribute('data-translator-pending', 'true');
  el.setAttribute('data-translator-theme', state.translationLoadingTheme);

  try {
    if (usesTextNodeReplacement()) {
      const template = createTextNodeTemplate(el);
      if (!template) {
        clearElementPending(el);
        return;
      }

      const { items } = assignTemplateItems(template, 1);
      const result = await sendBgMessage<TranslationResponse>({
        type: 'TRANSLATE',
        payload: {
          text: encodeBatch(items),
          targetLang: state.targetLang,
          isAggregate: true,
          extraPrompt: TEXT_NODE_TRANSLATION_PROMPT,
        },
      });

      const { translations } = decodeBatch(result.text, template.segments.length);
      if (translations.size === 0) {
        throw new Error('Text node translation protocol returned no segments');
      }

      clearElementPending(el);
      if (!skipActiveCheck && !state.isActive) {
        markElementIdle(el);
        return;
      }

      applyTranslation(el, {
        kind: 'textNodes',
        translatedText: result.text,
        template,
        translations,
      });
      return;
    }

    // encodeInline
    const { placeholderText, fragments, styleTemplates } = encodeInline(el);
    if (!placeholderText) {
      clearElementPending(el);
      return;
    }

    const result = await sendBgMessage<TranslationResponse>({
      type: 'TRANSLATE',
      payload: {
        text: placeholderText,
        targetLang: state.targetLang,
        hasPlaceholders: fragments.length > 0 || styleTemplates.length > 0,
      },
    });

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
  const styleTemplatesList: Element[][] = [];
  const validElements: HTMLElement[] = [];

  if (usesTextNodeReplacement()) {
    await translateTextNodeBatchWithFallback(batch);
    return;
  }

  for (const el of batch) {
    const rawText = el.textContent?.trim();
    if (!rawText || rawText.length < 5) continue;

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

    const result = await sendBgMessage<TranslationResponse>({
      type: 'TRANSLATE',
      payload: {
        text: combinedText,
        targetLang: state.targetLang,
        isAggregate: true,
        hasPlaceholders: fragmentsList.some(f => f.length > 0) || styleTemplatesList.some(s => s.length > 0),
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

async function translateTextNodeBatchWithFallback(batch: HTMLElement[]): Promise<void> {
  const entries: TextNodeBatchEntry[] = [];
  const items: Array<{ id: number; text: string }> = [];
  let nextId = 1;

  for (const el of batch) {
    const rawText = el.textContent?.trim();
    if (!rawText || rawText.length < 5) continue;

    const template = createTextNodeTemplate(el);
    if (!template) continue;

    const assigned = assignTemplateItems(template, nextId);
    nextId = assigned.nextId;
    items.push(...assigned.items);
    entries.push({ el, template });
  }

  if (entries.length === 0 || items.length === 0) return;

  const validElements = entries.map(entry => entry.el);
  validElements.forEach(el => {
    el.setAttribute('data-translator-pending', 'true');
    el.setAttribute('data-translator-theme', state.translationLoadingTheme);
  });

  const clearPending = () => {
    validElements.forEach(clearElementPending);
  };

  const fullFallback = async () => {
    clearPending();
    const tasks = validElements.map(el => () => translateSingleElement(el, true));
    await limitConcurrency(tasks, state.aggregate.maxConcurrentRequests);
  };

  try {
    const result = await sendBgMessage<TranslationResponse>({
      type: 'TRANSLATE',
      payload: {
        text: encodeBatch(items),
        targetLang: state.targetLang,
        isAggregate: true,
        extraPrompt: TEXT_NODE_TRANSLATION_PROMPT,
      },
    });

    const { translations } = decodeBatch(result.text, items.length);
    if (translations.size === 0) {
      await fullFallback();
      return;
    }

    if (!state.isActive) {
      clearPending();
      for (const el of validElements) {
        markElementIdle(el);
      }
      return;
    }

    const retryElements: HTMLElement[] = [];
    for (const entry of entries) {
      const hasAnyTranslation = entry.template.segments.some(segment => (
        segment.id !== null && translations.has(segment.id)
      ));

      if (hasAnyTranslation) {
        applyTranslation(entry.el, {
          kind: 'textNodes',
          translatedText: result.text,
          template: entry.template,
          translations,
        });
      } else {
        clearElementPending(entry.el);
        retryElements.push(entry.el);
      }
    }

    if (retryElements.length > 0) {
      const tasks = retryElements.map(el => () => translateSingleElement(el, true));
      await limitConcurrency(tasks, state.aggregate.maxConcurrentRequests);
    }
  } catch (err) {
    console.warn('[Translator] aggregate text-node translation failed, falling back to per-element:', err);
    await fullFallback();
  }
}

async function flushAggregateQueue(): Promise<void> {
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
    flushAggregateQueue();
  }, 300);
}
