import { describe, expect, test } from 'bun:test';
import { buildTranslationCachePartition } from '../src/lib/api';

/** 独立复刻旧实现的分区算法，用于锁定「默认参数下 hash 不变」的向后兼容承诺 */
async function legacyHash(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf, 0, 4))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('translation cache partitioning', () => {
  test('separates requests with different extra prompts', async () => {
    const base = await buildTranslationCachePartition('global prompt');
    const polysemy = await buildTranslationCachePartition('global prompt', 'polysemy instruction');

    expect(polysemy).not.toBe(base);
  });

  test('keeps identical prompt inputs in the same partition', async () => {
    await expect(buildTranslationCachePartition('global prompt', 'polysemy instruction'))
      .resolves.toBe(await buildTranslationCachePartition('global prompt', 'polysemy instruction'));
  });
});

describe('translation cache partitioning format flags', () => {
  test('keeps the legacy hash byte-for-byte when the new flags are omitted', async () => {
    // 向后兼容断言：默认参数下必须与旧实现（只哈希 globalPrompt）完全一致，
    // 否则所有既有缓存条目会一次性失效。
    expect(await buildTranslationCachePartition('global prompt')).toBe(
      await legacyHash('global prompt')
    );
  });

  test('treats explicit false/undefined flags as the legacy partition', async () => {
    const omitted = await buildTranslationCachePartition('global prompt');
    const explicitFalse = await buildTranslationCachePartition('global prompt', undefined, undefined, false, false);

    expect(explicitFalse).toBe(omitted);
  });

  test('keeps the legacy multi-part hash for extra prompt / tone inputs', async () => {
    // 旧实现在有 extraPrompt 或非 normal tone 时哈希 [prompt, extra, tone] 三元素数组
    expect(await buildTranslationCachePartition('global prompt', 'extra', 'formal')).toBe(
      await legacyHash(JSON.stringify(['global prompt', 'extra', 'formal']))
    );
    expect(await buildTranslationCachePartition('global prompt', 'extra')).toBe(
      await legacyHash(JSON.stringify(['global prompt', 'extra', '']))
    );
  });

  test('aggregate flag alone does not fork the partition when text carries the marker', async () => {
    // 格式开关由文本指纹表达时不得额外分区：否则升级后聚合模式的每一条缓存都会失效。
    // （纯文本 + 无 <<<N>>> 的情形属于「开关与文本矛盾」，见下一组用例。）
    const aggregateText = '<<<1>>>\nHello there\n<<<2>>>\nGeneral Kenobi';
    expect(await buildTranslationCachePartition('global prompt', undefined, undefined, true, false, aggregateText)).toBe(
      await legacyHash('global prompt')
    );
  });

  test('placeholder flag alone does not fork the partition when text carries the marker', async () => {
    const placeholderText = 'Read <s0>this</s0> and #1# too';
    expect(await buildTranslationCachePartition('global prompt', undefined, undefined, false, true, placeholderText)).toBe(
      await legacyHash('global prompt')
    );
  });

  test('keeps flags orthogonal to extra prompt / tone inputs', async () => {
    const withExtra = await buildTranslationCachePartition('global prompt', 'extra', 'formal');
    const withExtraAggregate = await buildTranslationCachePartition(
      'global prompt',
      'extra',
      'formal',
      true,
      false,
      '<<<1>>>\nmarked paragraph'
    );

    // 文本指纹与声明一致 → 开关不进盐值，两者仍等价
    expect(withExtraAggregate).toBe(withExtra);
  });
});

describe('格式开关不污染缓存分区（命中率回归防护）', () => {
  // 这些用例锁定一个曾导致「大面积缓存失效」的缺陷：把 isAggregate /
  // hasPlaceholders 无条件塞进盐值，会让「文本与提示词都没变」的请求换 hash。
  // 文本本身已携带开关指纹（聚合的 <<<N>>>、占位符的 #N# / <sN>），
  // 因此正常请求的盐值必须与 v0.5.1 逐字节一致。

  test('聚合请求：文本自带 <<<N>>> 时盐值与旧实现一致', async () => {
    const text = '<<<1>>>\nHello\n<<<2>>>\nWorld';
    expect(await buildTranslationCachePartition('global prompt', undefined, undefined, true, false, text)).toBe(
      await legacyHash('global prompt')
    );
  });

  test('占位符请求：文本自带 <sN> 时盐值与旧实现一致', async () => {
    const text = '<s0>Hello</s0> <s1>world</s1>';
    expect(await buildTranslationCachePartition('global prompt', undefined, undefined, false, true, text)).toBe(
      await legacyHash('global prompt')
    );
  });

  test('占位符请求：文本自带 #N# 时盐值与旧实现一致', async () => {
    const text = 'Use #1# then #2#';
    expect(await buildTranslationCachePartition('global prompt', undefined, undefined, false, true, text)).toBe(
      await legacyHash('global prompt')
    );
  });

  test('聚合 + 占位符：两种指纹都在文本里时盐值与旧实现一致', async () => {
    const text = '<<<1>>>\n<s0>Hello</s0>\n<<<2>>>\nplain';
    expect(await buildTranslationCachePartition('global prompt', undefined, undefined, true, true, text)).toBe(
      await legacyHash('global prompt')
    );
  });

  test('批次的组成不影响盐值（同一段落跨批次可命中）', async () => {
    // 缺陷形态：hasPlaceholders 是「批次级」开关。含占位符段落的批次与纯文本
    // 段落的批次会拿到两个不同的盐值，于是同一段纯文本在不同批次里永远无法
    // 共享缓存条目 —— 只要批次组成变化就重新计费。
    const withPlaceholders = '<<<1>>>\n<s0>Hello</s0>\n<<<2>>>\nplain sentence';
    const withoutPlaceholders = '<<<1>>>\nplain sentence\n<<<2>>>\nanother plain';

    const saltA = await buildTranslationCachePartition('global prompt', undefined, undefined, true, true, withPlaceholders);
    const saltB = await buildTranslationCachePartition('global prompt', undefined, undefined, true, false, withoutPlaceholders);

    expect(saltA).toBe(saltB);
  });

  test('声明的开关与文本指纹矛盾时仍然分区（保守正确）', async () => {
    // 正文里字面写着 #1# 却声明 hasPlaceholders=false：同一段文本会配两套提示词，
    // 必须分开缓存。这类矛盾是唯一需要把开关写进盐值的场景。
    const literalHashInProse = 'Read the marker #1# carefully';
    const salt = await buildTranslationCachePartition('global prompt', undefined, undefined, false, false, literalHashInProse);

    expect(salt).not.toBe(await legacyHash('global prompt'));
    // 且与「真的把 #1# 当占位符」的请求区分开
    expect(salt).not.toBe(
      await buildTranslationCachePartition('global prompt', undefined, undefined, false, true, literalHashInProse)
    );
  });

  test('省略文本参数时按无指纹推断：声明 true 即视为矛盾并分区', async () => {
    expect(await buildTranslationCachePartition('global prompt', undefined, undefined, true, false)).not.toBe(
      await legacyHash('global prompt')
    );
  });
});
