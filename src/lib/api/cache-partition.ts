/**
 * 翻译缓存的分区盐值计算。
 *
 * 从 `api.ts` 拆出：这块只做「把提示词相关输入折叠成一个短 hash」，不参与请求发送、
 * 模型降级与缓存读写，是纯函数模块（SMELLS「发散式变化」：分区策略会因缓存命中率
 * 调优单独变动，不该牵动整条翻译调用链）。
 *
 * 对外契约：`api.ts` 仍 re-export `buildTranslationCachePartition`，既有
 * `from '@/lib/api'` 的导入（含 tests/api-cache.test.ts）保持不变。
 */

// 格式开关在请求文本里的「指纹」。二者都出现在 encodeBatch / encodeInline 的产物中：
//   - 聚合请求：每段以 `<<<N>>>` 独占一行开头（encodeBatch 的权威格式）
//   - 占位符请求：文本里含 `#N#`（Flat 片段）或 `<sN>` / `</sN>`（样式占位）
const AGGREGATE_MARKER_RE = /^[ \t]*<<<\d+>>>/m;
const PLACEHOLDER_MARKER_RE = /#\d+#|<\/?s\d+>/i;

/** SHA-256 前 4 字节的十六进制（8 字符）：足够区分提示词变体，又比全量 hash 短 */
export async function shortPromptHash(prompt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prompt));
  return Array.from(new Uint8Array(buf, 0, 4))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 生成翻译缓存的 prompt 分区盐值。
 *
 * ── 为什么格式开关**默认不**进入分区键 ────────────────────────────────
 * renderPrompt() 确实会按 isAggregate / hasPlaceholders 追加不同规则段落，
 * 所以「同一段文本、两种开关」必须拿到不同译文。但这里的文本本身已经携带了
 * 开关指纹：聚合请求的每段都以 `<<<N>>>` 开头，占位符请求含 `#N#` / `<sN>`。
 * 而文本是缓存键的一部分，因此「文本相同 + 开关不同」在正常调用链里不可能发生 ——
 * 把开关再塞进盐值属于**重复分区**，它不会多拦任何错误复用，只会让
 * 「文本与提示词都没变」的请求拿到新 hash：
 *
 *   - 一次全量失效：所有既有缓存条目（聚合模式的每一条、占位符段落的大部分）
 *     升级后全部无法命中。实测一个普通文章页 213 段里 120 段带占位符，
 *     这 120 段的盐值全部漂移，等于把缓存整体清空一次；
 *   - 长期命中率下降：同一段落单独翻译与进入聚合批次时开关不同，
 *     重复分区会让两条路径永远无法共享缓存条目。
 *
 * ── 只在「开关与文本不一致」时才分区 ──────────────────────────────────
 * 唯一需要额外分区的场景是调用方声明的开关与文本指纹矛盾：典型如正文里
 * 字面写着 `#1#`（讲解协议的文档页）却声明 hasPlaceholders=false —— 此时
 * 同一段文本会配两套提示词，必须分开缓存。检测到这种矛盾才把开关写进盐值，
 * 正常请求一律走旧分区，保证与 v0.5.1 的 hash 逐字节一致。
 *
 * @param text 本次请求实际发送的文本，用于推断开关指纹。缺省时按「无指纹」
 *   推断：声明为 true 即视为矛盾并分区（保守正确），声明为 false 则沿用旧分区。
 */
export async function buildTranslationCachePartition(
  globalPrompt: string,
  extraPrompt?: string,
  tone?: string,
  isAggregate?: boolean,
  hasPlaceholders?: boolean,
  text = ''
): Promise<string> {
  const effectiveTone = tone && tone !== 'normal' ? tone : undefined;
  const declaredAggregate = isAggregate === true;
  const declaredPlaceholders = hasPlaceholders === true;

  // 开关与文本指纹一致 → 开关是冗余信息，不进盐值（与 v0.5.1 完全兼容）
  const flagsRedundant =
    declaredAggregate === AGGREGATE_MARKER_RE.test(text) &&
    declaredPlaceholders === PLACEHOLDER_MARKER_RE.test(text);

  if (!extraPrompt && !effectiveTone && flagsRedundant) return shortPromptHash(globalPrompt);

  const parts: unknown[] = [globalPrompt, extraPrompt ?? '', effectiveTone ?? ''];
  // 仅在开关与文本矛盾时扩展数组长度，保证正常请求的序列化结果与旧版逐字节相同。
  if (!flagsRedundant) parts.push(declaredAggregate, declaredPlaceholders);

  return shortPromptHash(JSON.stringify(parts));
}
