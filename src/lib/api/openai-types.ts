import type { TokenUsage } from '@/types';

// OpenAI-compatible 响应的最小结构：文本链路（api.ts）、SSE 流式链路（sse-consumer.ts）
// 与识图链路（vision.ts）各自都声明过一份逐字相同的副本，usage 到 TokenUsage 的
// 三元组映射也重复了三处。集中到这里，避免三处类型漂移（曾出现一处补了
// source_language、另一处没补）。

interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string };
    delta?: { content?: string };
    text?: string;
  }>;
  response?: string;
  output?: string;
  result?: string;
  detected_language?: string;
  source_language?: string;
  usage?: OpenAIUsage;
}

/** usage 缺省时返回 undefined（不伪造 0，UI 据此区分「无用量数据」与「用量为 0」） */
export function toTokenUsage(raw?: OpenAIUsage): TokenUsage | undefined {
  if (!raw) return undefined;
  return {
    promptTokens: raw.prompt_tokens ?? 0,
    completionTokens: raw.completion_tokens ?? 0,
    totalTokens: raw.total_tokens ?? 0,
  };
}

/** 从响应体里按各家兼容实现的实际字段顺序取译文文本 */
export function extractTranslatedText(data: OpenAIChatResponse): string | null {
  return (
    data.choices?.[0]?.message?.content?.trim() ||
    data.choices?.[0]?.text?.trim() ||
    data.response?.trim() ||
    data.output?.trim() ||
    data.result?.trim() ||
    null
  );
}
