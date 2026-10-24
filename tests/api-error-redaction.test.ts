import { describe, expect, test } from 'bun:test';
import { parseRetryAfterMs, redactHttpErrorBody, sanitizeHttpErrorBody } from '../src/lib/api';

// 错误响应体脱敏：只截断不脱敏时，回显在体首部的密钥会完整进 UI。
// 这是「截断 ≠ 脱敏」的回归锁。
describe('redactHttpErrorBody 密钥脱敏', () => {
  test('Bearer 头被替换，保留前缀便于用户定位问题', () => {
    const out = redactHttpErrorBody('Invalid Authorization: Bearer sk-49a2b7c8d9e0f1a2b3c4');
    expect(out).toContain('[REDACTED]');
    expect(out).not.toContain('sk-49a2b7c8d9e0f1a2b3c4');
  });

  test('裸 sk- 前缀密钥被替换', () => {
    const out = redactHttpErrorBody('{"error":"Incorrect API key provided: sk-proj-abcdef123456"}');
    expect(out).not.toContain('sk-proj-abcdef123456');
    expect(out).toContain('[REDACTED]');
  });

  test('key=/token=/secret= 形式的凭据被替换', () => {
    expect(redactHttpErrorBody('API key=sk-secret-value-here is invalid')).not.toContain('sk-secret-value-here');
    expect(redactHttpErrorBody('token="abcdefgh12345678"')).not.toContain('abcdefgh12345678');
    expect(redactHttpErrorBody('password: supersecretvalue')).not.toContain('supersecretvalue');
  });

  test('不含凭据的普通错误保持原样', () => {
    const plain = 'model not found: gpt-9';
    expect(redactHttpErrorBody(plain)).toBe(plain);
  });

  test('sanitize 同时做脱敏与截断', () => {
    const long = `Bearer sk-${'a'.repeat(300)}`;
    const out = sanitizeHttpErrorBody(long);
    expect(out).not.toContain('a'.repeat(300));
    expect(out.length).toBeLessThanOrEqual(201);
  });
});

// Retry-After 严格解析：非法值必须走指数退避，而不是被 Number()/Date.parse
// 误解析成荒谬的等待时长（"-5" 曾被 Date.parse 当成 2001 年 → 等 24 年）。
describe('parseRetryAfterMs 严格解析', () => {
  const now = Date.parse('Wed, 21 Oct 2015 07:00:00 GMT');

  test('秒数格式', () => {
    expect(parseRetryAfterMs('120', now)).toBe(120_000);
    expect(parseRetryAfterMs('  30  ', now)).toBe(30_000);
    expect(parseRetryAfterMs('0', now)).toBe(0);
    expect(parseRetryAfterMs('1.5', now)).toBe(1500);
  });

  test('HTTP 日期格式', () => {
    expect(parseRetryAfterMs('Wed, 21 Oct 2015 07:28:00 GMT', now)).toBe(28 * 60 * 1000);
  });

  test('非法数值不被误解析（回归：0x10 / -5 / 1e999）', () => {
    expect(parseRetryAfterMs('0x10', now)).toBeUndefined();
    expect(parseRetryAfterMs('-5', now)).toBeUndefined();
    expect(parseRetryAfterMs('+5', now)).toBeUndefined();
    expect(parseRetryAfterMs('1e999', now)).toBeUndefined();
    expect(parseRetryAfterMs('Infinity', now)).toBeUndefined();
  });

  test('无法解析的文本与空值返回 undefined', () => {
    expect(parseRetryAfterMs('abc', now)).toBeUndefined();
    expect(parseRetryAfterMs('', now)).toBeUndefined();
    expect(parseRetryAfterMs(null, now)).toBeUndefined();
    expect(parseRetryAfterMs(undefined, now)).toBeUndefined();
  });

  test('过去的 HTTP 日期被 clamp 成 0 而不是负数', () => {
    expect(parseRetryAfterMs('Wed, 21 Oct 2015 06:00:00 GMT', now)).toBe(0);
  });
});
