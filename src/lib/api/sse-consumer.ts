interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface OpenAIChatResponse {
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

export function findSSEBoundary(buffer: string): { index: number; length: number } | null {
  const lf = buffer.indexOf('\n\n');
  const crlf = buffer.indexOf('\r\n\r\n');
  if (lf === -1 && crlf === -1) return null;
  if (lf === -1) return { index: crlf, length: 4 };
  if (crlf === -1) return { index: lf, length: 2 };
  return lf < crlf ? { index: lf, length: 2 } : { index: crlf, length: 4 };
}

// SSE 流式累积。注意：此处复用调用方传入的 timeout signal 作为"端到端"总超时；
// 这是 YAGNI 决策——长文本若触发超时，请在通用设置中调高 requestTimeout。
export async function consumeOpenAIStream(
  response: Response,
  signal: AbortSignal
): Promise<{ text: string; detectedLang?: string }> {
  if (!response.body) {
    throw new Error('Empty translation response');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let acc = '';
  let detectedLang: string | undefined;
  let done = false;

  const onAbort = () => {
    reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', onAbort);

  const processEvent = (rawEvent: string): void => {
    const lines = rawEvent.split(/\r?\n/);
    for (const line of lines) {
      if (!line || !line.startsWith('data:')) continue;
      const dataStr = line.slice(5).trim();
      if (dataStr === '[DONE]') {
        done = true;
        break;
      }
      try {
        const json = JSON.parse(dataStr) as OpenAIChatResponse;
        const deltaContent = json.choices?.[0]?.delta?.content;
        if (typeof deltaContent === 'string') acc += deltaContent;
        const lang = json.detected_language ?? json.source_language;
        if (lang && !detectedLang) detectedLang = lang;
      } catch {
        // JSON 解析失败的 chunk（多见于事件分隔不规则的服务端）。
        // 丢弃无法解析的 chunk，避免将损坏的 JSON 片段混入翻译结果。
      }
    }
  };

  try {
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) {
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let boundary = findSSEBoundary(buffer);
      while (boundary) {
        const rawEvent = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);
        processEvent(rawEvent);
        if (done) break;
        boundary = findSSEBoundary(buffer);
      }
    }

    const trailing = buffer.trim();
    if (!done && trailing) {
      processEvent(trailing);
    }
  } finally {
    signal.removeEventListener('abort', onAbort);
    try {
      reader.releaseLock();
    } catch {
      // 已 cancel 时 releaseLock 可能 throw，忽略
    }
  }

  if (signal.aborted) {
    throw new Error('Request aborted');
  }

  const trimmed = acc.trim();
  if (!trimmed) {
    throw new Error('Empty translation response');
  }
  return { text: trimmed, detectedLang };
}
