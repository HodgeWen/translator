import { describe, expect, test } from 'bun:test';
import { shouldRetryError } from '../src/entrypoints/content/retry';

describe('shouldRetryError 失败段落重试判定', () => {
  test('error 且距失败超过阈值 → 重试', () => {
    expect(shouldRetryError('error', 1_000, 20_000)).toBe(true);
  });

  test('error 且距失败等于阈值 → 重试（≥ 语义）', () => {
    expect(shouldRetryError('error', 1_000, 16_000)).toBe(true);
  });

  test('error 未超阈值 → 不重试', () => {
    expect(shouldRetryError('error', 1_000, 10_000)).toBe(false);
  });

  test('非 error 状态 → 不重试', () => {
    expect(shouldRetryError('translated', 1_000, 100_000)).toBe(false);
    expect(shouldRetryError('idle', 1_000, 100_000)).toBe(false);
    expect(shouldRetryError('pending', 1_000, 100_000)).toBe(false);
  });

  test('error 但缺失失败时间戳 → 不重试', () => {
    expect(shouldRetryError('error', undefined, 100_000)).toBe(false);
  });
});
