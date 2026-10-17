import { describe, expect, test } from 'bun:test';
import { shouldSkipByLanguage } from '../src/lib/lang-detect';

describe('shouldSkipByLanguage 目标语言跳过判定', () => {
  test('lang="zh" + 目标 zh-CN 跳过', () => {
    expect(shouldSkipByLanguage('zh', 'Hello world content', 'zh-CN')).toBe(true);
  });

  test('lang="en" + 目标 zh-CN 不跳过', () => {
    expect(shouldSkipByLanguage('en', 'Hello world content', 'zh-CN')).toBe(false);
  });

  test('无 lang 纯中文文本 + 目标 zh-CN 跳过', () => {
    expect(shouldSkipByLanguage(null, '今天天气真好，我们出去散步吧。', 'zh-CN')).toBe(true);
  });

  test('无 lang 拉丁文本 + 目标 zh-CN 不跳过', () => {
    expect(shouldSkipByLanguage(null, 'The weather is really nice today.', 'zh-CN')).toBe(false);
  });

  test('无 lang 中文文本 + 非CJK目标不启用字符集兜底', () => {
    expect(shouldSkipByLanguage(null, '今天天气真好，我们出去散步吧。', 'en')).toBe(false);
  });
});
