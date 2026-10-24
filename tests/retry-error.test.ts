import { describe, expect, test } from 'bun:test';
import { MAX_RETRIES, RETRY_THRESHOLD_MS, shouldRetryError } from '../src/entrypoints/content/retry';
import { MAX_AUTO_RETRIES, shouldAutoRetry } from '../src/entrypoints/content/observer';

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

describe('重试次数上限（observer 的 shouldAutoRetry）', () => {
  test('MAX_RETRIES 导出且为 3，observer 复用同一常量', () => {
    expect(MAX_RETRIES).toBe(3);
    expect(MAX_AUTO_RETRIES).toBe(MAX_RETRIES);
  });

  test('未达上限且已过阈值 → 可重试', () => {
    expect(shouldAutoRetry('error', 1_000, 20_000, 0)).toBe(true);
    expect(shouldAutoRetry('error', 1_000, 20_000, MAX_RETRIES - 1)).toBe(true);
  });

  test('达到上限 → 不可重试（即使已过阈值）', () => {
    expect(shouldAutoRetry('error', 1_000, 20_000, MAX_RETRIES)).toBe(false);
    expect(shouldAutoRetry('error', 1_000, 1_000_000, MAX_RETRIES + 5)).toBe(false);
  });

  test('达上限时即便未过阈值也保持不可重试（两个条件同时成立才放行）', () => {
    expect(shouldAutoRetry('error', 1_000, 10_000, MAX_RETRIES)).toBe(false);
  });

  test('自定义 maxRetries 生效', () => {
    expect(shouldAutoRetry('error', 1_000, 20_000, 1, 1)).toBe(false);
    expect(shouldAutoRetry('error', 1_000, 20_000, 0, 1)).toBe(true);
  });

  test('非 error 状态即使次数未超限也不重试', () => {
    expect(shouldAutoRetry('translated', 1_000, 100_000, 0)).toBe(false);
    expect(shouldAutoRetry('idle', 1_000, 100_000, 0)).toBe(false);
  });

  test('冷却未过时不可重试（复用 shouldRetryError 的阈值语义）', () => {
    expect(shouldAutoRetry('error', 1_000, 10_000, 0)).toBe(false);
    expect(shouldAutoRetry('error', undefined, 100_000, 0)).toBe(false);
  });
});
