/**
 * 429 限流退避策略：Retry-After 解析、退避时长计算、可取消的等待。
 *
 * 从 `api.ts` 拆出：这是一组纯策略函数（除 sleep 的 signal 处理外无状态），
 * 与「请求体怎么构造、模型怎么排队降级」的变化理由不同（SMELLS「发散式变化」）。
 *
 * 对外契约：`api.ts` re-export `parseRetryAfterMs` / `computeRateLimitDelayMs`
 * 保持既有导入路径（含 tests/api-error-redaction.test.ts）不变。
 */
import { TranslationAbortError } from './errors';

// ---- 429 限流退避策略 ----
//
// 每个模型最多 1 次首试 + RATE_LIMIT_MAX_RETRIES 次重试（硬上限，无无限重试）。
// 等待时长优先取响应头 Retry-After，缺省用指数退避（500ms 起步），单次等待封顶 5s。
// 所有尝试与等待共享该模型的超时预算（settings.requestTimeout）：
// 预算耗尽、或 Retry-After 本身会超出剩余预算时，立即放弃退避并降级到下一个模型，
// 因此退避不会把单个模型的耗时放大到超过修复前的上限。
export const RATE_LIMIT_MAX_RETRIES = 2;
const RATE_LIMIT_BASE_DELAY_MS = 500;
const RATE_LIMIT_MAX_DELAY_MS = 5_000;

/**
 * 解析 Retry-After：支持「秒数」与「HTTP 日期」两种格式。
 * 返回毫秒数；缺失或无法解析时返回 undefined。
 */
export function parseRetryAfterMs(header: string | null | undefined, now = Date.now()): number | undefined {
  const raw = header?.trim();
  if (!raw) return undefined;

  // 严格只接受「十进制非负数字」：Number() 会把 "0x10" 解析成 16 秒、
  // "-5" 解析成负值（随后被 clamp 成 0 立即重试）、"1e999" 解析成 Infinity，
  // 这些都不是合法的 Retry-After，按无法解析处理走指数退避更安全。
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const seconds = Number(raw);
    if (Number.isFinite(seconds)) return Math.round(seconds * 1000);
  }

  // HTTP 日期分支只接受「含字母」的字符串。纯数字/符号串必须走上面的秒数分支
  // 或直接判为非法：Date.parse('-5') / Date.parse('+5') / Date.parse('5') 都会被
  // 引擎当作年份解析（返回 2001 年），产生「等到 24 年后」的荒谬退避。
  if (!/[A-Za-z]/.test(raw)) return undefined;

  const at = Date.parse(raw);
  if (Number.isNaN(at)) return undefined;
  return Math.max(0, at - now);
}

/** 计算第 attempt 次（0 基）重试前的等待时长：Retry-After 优先，否则指数退避，单次封顶 5s */
export function computeRateLimitDelayMs(attempt: number, retryAfterMs?: number): number {
  const fallback = RATE_LIMIT_BASE_DELAY_MS * 2 ** Math.max(0, attempt);
  const target = retryAfterMs ?? fallback;
  return Math.min(Math.max(0, target), RATE_LIMIT_MAX_DELAY_MS);
}

/** 可被外部取消打断的等待 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new TranslationAbortError());
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => {
      if (timer !== undefined) clearTimeout(timer);
      reject(new TranslationAbortError());
    };

    timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
