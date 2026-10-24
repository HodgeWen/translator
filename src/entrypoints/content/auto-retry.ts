import type { ElementState } from './state';
import { MAX_RETRIES, shouldRetryError } from './retry';

/**
 * 失败段落的自动重试策略（纯函数）。
 *
 * 从 `observer.ts` 拆出：这是「一次失败是否值得再自动试一次」的判定规则，
 * 与「谁在观察 DOM、什么时候 flush」是两件独立的事（SMELLS「发散式变化」：
 * 重试预算会因计费/限流策略单独调整，不该牵动观察器实现）。
 *
 * 对外契约：`observer.ts` 仍 re-export 这两个导出，既有
 * `from './observer'` / `from '../src/entrypoints/content/observer'` 的导入不变。
 */

// ─── 失败段落自动重试上限 ────────────────────────────────────────────────
//
// `shouldRetryError`（retry.ts）只回答「距上次失败是否已过 15s 冷却」，
// 不限制次数。持续滚动 + 持续失败的场景（接口 4xx、额度耗尽、站点反复重排）
// 会让同一段落被无限次重新请求 → 无限计费。这里在观察者侧叠加次数上限。

/**
 * 单段落自动重试次数上限（不含首次翻译）。超限后只能由用户手动重新触发。
 * 复用 retry.ts 的唯一定义，避免两份常量漂移。
 */
export const MAX_AUTO_RETRIES = MAX_RETRIES;

/**
 * 纯函数：失败段落是否还应被自动重试。
 * @param status 段落当前状态
 * @param errorAt 上次失败时间戳（performance.now()）
 * @param now 当前时间戳
 * @param retryCount 已消耗的自动重试次数
 */
export function shouldAutoRetry(
  status: ElementState['status'],
  errorAt: number | undefined,
  now: number,
  retryCount: number,
  maxRetries: number = MAX_AUTO_RETRIES,
): boolean {
  if (retryCount >= maxRetries) return false;
  return shouldRetryError(status, errorAt, now);
}
