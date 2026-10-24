import type { ProviderConfig } from '@/types';
import { applyProviderSampling } from './http';

// 提示词渲染与文本翻译请求体构造。文本链路（api.ts）按格式开关把规则段落拼到
// system prompt 上；识图链路（api/vision.ts）走独立的整图直译提示词，不复用这里。

const PLACEHOLDER_RULE = `\n\nThe text may contain numeric placeholders in the form of #1#, #2#, #3# ... (single "#" on each side). You MUST preserve every placeholder exactly as-is in your output: do not add, remove, modify, reorder, or translate any of them. Treat them as opaque tokens that stand in for inline HTML fragments.`;

const HTML_PROTECTION_RULE = `\n\nThe text may contain HTML tags, code snippets, and format placeholders. Follow these rules:
- Preserve all HTML tags, placeholders, format symbols, and whitespace exactly as they appear. Only translate the inner text content.
- Do NOT translate content inside <code>, <pre>, <samp>, <kbd>, <var> tags, text enclosed in backticks (\`code\`), file paths, URLs, variable names, or placeholders like {1}, {{1}}, [1], [[1]].`;

export function renderPrompt(
  template: string,
  targetLang: string,
  isAggregate: boolean,
  hasPlaceholders: boolean,
  extraPrompt?: string
): string {
  let prompt = template
    .replace(/\{\{targetLang\}\}/g, targetLang);

  if (isAggregate || hasPlaceholders) {
    prompt += HTML_PROTECTION_RULE;
  }

  if (hasPlaceholders) {
    prompt += PLACEHOLDER_RULE;
  }

  if (isAggregate) {
    prompt += `\n\nThe input contains multiple paragraphs. Each paragraph is preceded by a marker of the form "<<<N>>>" on its own line, where N is a positive integer (1, 2, 3, ...). You MUST follow this protocol exactly:
1. Translate the content of each paragraph into ${targetLang}.
2. Output every translated paragraph preceded by the SAME "<<<N>>>" marker on its own line, in the SAME order as the input.
3. Do not merge paragraphs, do not skip paragraphs, and do not introduce extra paragraphs or markers that were not in the input.
4. Treat "<<<N>>>" as opaque tokens: never translate, localize, reformat, or alter the digits/symbols inside them.`;
    if (hasPlaceholders) {
      prompt += `\n5. Preserve every "#N#" inline placeholder inside paragraphs verbatim, exactly as instructed above.
6. Do not add any commentary, headings, or text outside the marker/paragraph structure.`;
    } else {
      prompt += `\n5. Do not add any commentary, headings, or text outside the marker/paragraph structure.`;
    }
  }

  if (extraPrompt) {
    prompt += `\n\n${extraPrompt}`;
  }

  return prompt;
}

export function buildBody(
  modelId: string,
  text: string,
  targetLang: string,
  extraBody: Record<string, unknown>,
  promptTemplate: string,
  isAggregate: boolean,
  hasPlaceholders: boolean,
  provider: ProviderConfig,
  extraPrompt?: string
): Record<string, unknown> {
  const systemPrompt = renderPrompt(promptTemplate, targetLang, isAggregate, hasPlaceholders, extraPrompt);

  const body: Record<string, unknown> = {
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    ...extraBody,
  };

  applyProviderSampling(body, provider);

  return body;
}
