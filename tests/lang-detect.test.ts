import { describe, expect, test } from 'bun:test';
import { shouldSkipByLanguage } from '../src/lib/lang-detect';

describe('shouldSkipByLanguage 目标语言跳过判定', () => {
  // spec 第 7 条既有四用例：lang 标注迁移到自身属性位置，语义不变
  test('自身 lang="zh" + 目标 zh-CN 跳过', () => {
    expect(shouldSkipByLanguage('zh', null, 'Hello world content', 'zh-CN')).toBe(true);
  });

  test('自身 lang="en" + 目标 zh-CN 不跳过', () => {
    expect(shouldSkipByLanguage('en', null, 'Hello world content', 'zh-CN')).toBe(false);
  });

  test('无 lang 纯中文文本 + 目标 zh-CN 跳过', () => {
    expect(shouldSkipByLanguage(null, null, '今天天气真好，我们出去散步吧。', 'zh-CN')).toBe(true);
  });

  test('无 lang 拉丁文本 + 目标 zh-CN 不跳过', () => {
    expect(shouldSkipByLanguage(null, null, 'The weather is really nice today.', 'zh-CN')).toBe(false);
  });

  test('无 lang 中文文本 + 非CJK目标不启用字符集兜底', () => {
    expect(shouldSkipByLanguage(null, null, '今天天气真好，我们出去散步吧。', 'en')).toBe(false);
  });

  // 回归：站点 UI 本地化为目标语（祖先 [lang] 命中）而正文为外语时不整页误跳过
  test('祖先 lang="zh" + 英文文本 + 目标 zh-CN 不跳过（X 回归）', () => {
    expect(shouldSkipByLanguage(null, 'zh', 'just setting up my twttr', 'zh-CN')).toBe(false);
  });

  test('祖先 lang="zh" + 中文文本 + 目标 zh-CN 跳过', () => {
    expect(shouldSkipByLanguage(null, 'zh', '今天天气真好，我们出去散步吧。', 'zh-CN')).toBe(true);
  });

  test('自身 lang="zh" + 英文文本 + 目标 zh-CN 仍跳过（自身属性语义不变）', () => {
    expect(shouldSkipByLanguage('zh', null, 'just setting up my twttr', 'zh-CN')).toBe(true);
  });

  test('祖先 lang="en" + 目标 en 维持前缀比对跳过（非 CJK 现状）', () => {
    expect(shouldSkipByLanguage(null, 'en', '今天天气真好，我们出去散步吧。', 'en')).toBe(true);
  });
});
