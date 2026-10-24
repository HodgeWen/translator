import type { ElementState } from './state';

// 失败段落重试阈值：距失败 ≥ 15 秒后，元素再次进入视口时允许重试一次
export const RETRY_THRESHOLD_MS = 15_000;

// 单个段落的重试次数上限：达到后不再自动重试，避免持续滚动对持续性失败
// （如额度耗尽 / 内容被安全策略拒绝）无限重试造成持续计费。
//
// 这是「次数上限」的唯一定义处。观察者（observer.ts 的 shouldAutoRetry）
// 直接引用它，不要再各自声明一份 —— 此前 observer.ts 另有一个
// MAX_AUTO_RETRIES，两份常量并存容易漂移。
export const MAX_RETRIES = 3;

/**
 * 失败段落重试判定（纯函数，便于单测）。
 *
 * 只回答「冷却是否已过」这一半问题；次数上限由调用方结合计数判断
 * （见 observer.ts 的 shouldAutoRetry）。计数存放在 WeakMap 里、需要跨
 * elementMap 条目删除存活，不适合塞进这个纯函数。
 *
 * - 仅 status === 'error' 且记录了失败时间戳的元素可重试；
 * - 距失败不足阈值（默认 15 秒）时不重试，避免对持续性错误密集重试；
 * - errorAt 缺失视为不可重试（异常写入路径的兜底）。
 */
export function shouldRetryError(
  status: ElementState['status'],
  errorAt: number | undefined,
  now: number,
  thresholdMs: number = RETRY_THRESHOLD_MS
): boolean {
  if (status !== 'error' || errorAt === undefined) return false;
  if (now - errorAt < thresholdMs) return false;
  return true;
}

/**
 * 失败段落「手动重试」判定（纯函数，便于单测）。
 *
 * 与 shouldRetryError / shouldAutoRetry 的分工是「谁发起、谁付账」：
 * 自动重试由滚动等页面行为隐式触发，必须叠加 15s 冷却与 MAX_RETRIES 次数上限，
 * 否则持续性失败（额度耗尽 / 内容被拒）会被无限重试、无限计费；而手动重试由
 * 用户每次显式手势（Ctrl+悬浮、切回译文）发起，必须无条件放行 —— 否则自动预算
 * 耗尽后失败段落就永久卡死，红虚线再没有任何清除入口（用户报障的根因）。
 *
 * 排除两种状态：
 * - pending：已有请求在飞，再发一次只是重复计费，且结果仍会覆盖同一段落；
 * - translated：由显示切换路径处理；强制重译会撞上 applyTranslation 的幂等守卫
 *   （请求照发、译文不渲染），纯属浪费配额。
 * 其余状态下 status === 'error' 是失败快照本身；hasErrorAttr 兜住「属性还在、
 * 条目却已被删或改写成 idle」的残留（例如失败后命中目标语言跳过、站点复用节点），
 * 这类段落同样带着红虚线且没有别的清理入口，一并按可重试处理。status 允许
 * undefined 正是为后者服务：elementMap.get() 未命中时条目已不存在，此时唯一
 * 依据只能是红虚线属性。
 */
export function shouldRetryManually(
  status: ElementState['status'] | undefined,
  hasErrorAttr: boolean
): boolean {
  if (status === 'pending' || status === 'translated') return false;
  return status === 'error' || hasErrorAttr;
}
