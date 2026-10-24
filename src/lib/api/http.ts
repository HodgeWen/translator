import type { ProviderConfig } from '@/types';

// 请求构造：URL、请求头、provider 采样字段。
// 文本链路（api.ts）与识图链路（api/vision.ts）共用，避免两条链路各写一份
// 「Authorization 注入 / Accept 随 stream 切换」的规则而漂移。

export function buildUrl(baseURL: string, query: Record<string, string>): string {
  const url = new URL(baseURL);
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

/** 把 provider 的采样/流式设置写入请求体（独立字段覆盖 body 中的同名键） */
export function applyProviderSampling(body: Record<string, unknown>, provider: ProviderConfig): void {
  if (provider.temperature !== undefined) body.temperature = provider.temperature;
  if (provider.topP !== undefined) body.top_p = provider.topP;
  if (provider.maxTokens !== undefined) body.max_tokens = provider.maxTokens;
  if (provider.stream === true) body.stream = true;
}

export function buildHeaders(provider: ProviderConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: provider.stream === true ? 'text/event-stream' : 'application/json',
    ...provider.headers,
  };

  if (provider.apiKey && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }

  return headers;
}
