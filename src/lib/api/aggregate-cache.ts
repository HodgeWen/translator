import { getCachedTranslation, setCachedTranslation } from '../cache';
import { encodeBatch, parseEncodedBatch } from '../batch-protocol';

// 聚合请求的逐段缓存读写。
//
// ── 为什么必须按段落而不是整批缓存 ──────────────────────────────────
// 聚合请求的 `text` 是 `encodeBatch` 拼出的整批文本（`<<<1>>>\n段落A\n<<<2>>>\n段落B`）。
// 把它当缓存键意味着「键 = 这一批的完整组成」：只要批次里的段落集合、顺序或
// 数量有任何变化，整批 key 就不同 —— 哪怕其中 4/5 的段落昨天刚翻译过。
//
// 实测（Reddit 右侧栏「更多你可能喜欢的帖子」列表，53 段）：
//   - 快速滚动（每批 5 段）产生 11 个批次 key，慢速滚动（每批 2 段）产生 27 个；
//     两种节奏之间 **重合 0 个**，即慢滚一遍后快滚仍全部重新计费；
//   - 同一列表第二次访问（起点偏移 3 段）与第一次的批次 key **重合 0/3**；
//   - 而按段落看，这 53 段的文本完全相同 —— 段落级可命中 53/53。
//
// 这就是「右侧栏列表始终无法命中缓存」的根因：不是段落文本在变，而是
// 批次组成在变，而旧实现把批次组成也纳入了缓存键。

/**
 * 整批命中查询：把整批文本切回单段（`parseEncodedBatch`，带往返校验，无歧义才认可），
 * 逐段查缓存；全部命中则直接拼出批次译文返回，一个请求都不发。
 *
 * 无歧义切分失败（正文里字面出现 `<<<N>>>` 行）时返回 null，调用方回落到
 * 整批缓存路径 —— 行为与修复前完全一致，不会引入错误复用。
 */
export async function lookupAggregateCache(
  text: string,
  targetLang: string,
  promptSalt: string
): Promise<string | null> {
  const items = parseEncodedBatch(text);
  if (!items) return null;

  const translations: string[] = [];
  for (const item of items) {
    const cached = await getCachedTranslation(item.text, targetLang, promptSalt);
    // 任一段缺失就无法拼出完整批次：交给调用方按「未命中段落」再请求。
    // 这里不返回部分结果，避免调用方误以为整批可用。
    if (!cached) return null;
    translations.push(cached.text);
  }

  return encodeBatch(items.map((item, i) => ({ id: item.id, text: translations[i] })));
}

/**
 * 逐段写聚合缓存：模型按 `<<<N>>>` 协议返回整批译文，这里切回单段分别入库。
 *
 * 写入失败只记 warn（已计费的请求不能因为缓存问题进入降级重试）。切分失败则
 * 整体放弃逐段写 —— 宁可少缓存，也不能把错位的段落写进别的段的 key。
 */
export async function writeAggregateCache(
  requestText: string,
  responseText: string,
  targetLang: string,
  promptSalt: string
): Promise<void> {
  const requestItems = parseEncodedBatch(requestText);
  if (!requestItems) return;
  const responseItems = parseEncodedBatch(responseText);
  if (!responseItems || responseItems.length !== requestItems.length) return;

  for (let i = 0; i < requestItems.length; i++) {
    try {
      await setCachedTranslation(requestItems[i].text, targetLang, responseItems[i].text, undefined, promptSalt);
    } catch (error) {
      console.warn('[Translator] Failed to write aggregate translation cache:', error);
    }
  }
}

/**
 * 单条译文写缓存：失败只记 warn。翻译已经成功且已计费，绝不能因为写缓存失败
 * 进入降级重试（那会对同一请求重复计费，最坏情况把所有模型都试一遍）。
 */
export async function writeTranslationCache(
  text: string,
  targetLang: string,
  translatedText: string,
  promptSalt: string
): Promise<void> {
  try {
    await setCachedTranslation(text, targetLang, translatedText, undefined, promptSalt);
  } catch (error) {
    console.warn('[Translator] Failed to write translation cache:', error);
  }
}
