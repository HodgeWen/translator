/**
 * 翻译 API 的错误类型与取消信号工具。
 *
 * 从 `api.ts` 拆出：错误类型（HttpError / TranslationAbortError）被文本链路、
 * 识图链路与上层降级逻辑共同依赖，属于「被多方引用的稳定契约」，与「怎么发请求、
 * 怎么选模型」的变化理由不同（SMELLS「发散式变化」）。
 *
 * 对外契约：`api.ts` re-export 这里的全部导出，既有 `from '@/lib/api'` 的导入
 * （含 src/lib/api/vision.ts 与 tests）保持不变；因是同一份定义，`instanceof`
 * 判定跨模块仍然成立。
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    /**
     * 响应头 Retry-After 解析出的毫秒数（未截断的原始值）。
     * 429 退避重试据此判断「等待是否会超出剩余超时预算」。
     */
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * 外部取消（用户关闭页面翻译 / 关闭 popup）导致的失败。
 * 可被调用方识别，且**不得**触发「降级到下一个模型」——取消不是模型的问题。
 */
export class TranslationAbortError extends Error {
  constructor(message = 'Translation aborted by caller') {
    super(message);
    this.name = 'TranslationAbortError';
  }
}

export function isTranslationAbortError(error: unknown): boolean {
  return error instanceof TranslationAbortError;
}

/** translate() / translateImageText() 的调用选项：外部取消信号 */
export interface TranslateOptions {
  signal?: AbortSignal;
}

/**
 * provider 级致命错误：仅鉴权类（401/403）。
 * 换同 provider 的其它模型没有意义，直接跳过该 provider 剩余模型。
 * 429 是瞬时限流，走退避重试 / 换模型，不在此列。
 */
export function isProviderFatal(err: unknown): boolean {
  if (!(err instanceof HttpError)) return false;
  return err.status === 401 || err.status === 403;
}

/**
 * 把外部取消 signal 接到内部超时 controller 上（等价 AbortSignal.any，但不依赖较新的
 * 运行时 API）。返回清理函数，必须在请求结束后调用以移除监听。
 */
export function linkAbortSignals(controller: AbortController, external?: AbortSignal): () => void {
  if (!external) return () => {};

  const onExternalAbort = () => controller.abort();
  if (external.aborted) {
    controller.abort();
    return () => {};
  }

  external.addEventListener('abort', onExternalAbort, { once: true });
  return () => external.removeEventListener('abort', onExternalAbort);
}
