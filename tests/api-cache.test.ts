import { describe, expect, test } from 'bun:test';
import { buildTranslationCachePartition } from '../src/lib/api';

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
