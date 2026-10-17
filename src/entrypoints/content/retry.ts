import type { ElementState } from './state';

// 失败段落重试阈值：距失败 ≥ 15 秒后，元素再次进入视口时允许重试一次
export const RETRY_THRESHOLD_MS = 15_000;

// 失败段落重试判定（纯函数，便于单测）：
// - 仅 status === 'error' 且记录了失败时间戳的元素可重试；
// - 距失败不足阈值（默认 15 秒）时不重试，避免对持续性错误密集重试；
// - errorAt 缺失视为不可重试（异常写入路径的兜底）。
export function shouldRetryError(
  status: ElementState['status'],
  errorAt: number | undefined,
  now: number,
  thresholdMs: number = RETRY_THRESHOLD_MS
): boolean {
  if (status !== 'error' || errorAt === undefined) return false;
  return now - errorAt >= thresholdMs;
}
