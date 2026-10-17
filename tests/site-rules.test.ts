import { describe, expect, test } from 'bun:test'
import { getActiveRules, siteRules } from '../src/lib/site-rules'
import { twitterRule } from '../src/lib/site-rules/twitter'

describe('twitter site rule', () => {
  test('匹配 twitter.com 与 x.com 域名', () => {
    expect(twitterRule.matches(new URL('https://x.com/home'))).toBe(true)
    expect(twitterRule.matches(new URL('https://twitter.com/whj/status/123456'))).toBe(true)
  })

  test('不匹配其它域名与仿冒前缀域名', () => {
    expect(twitterRule.matches(new URL('https://github.com/twitter'))).toBe(false)
    expect(twitterRule.matches(new URL('https://notx.com/home'))).toBe(false)
    expect(twitterRule.matches(new URL('https://x.com.evil.example/'))).toBe(false)
  })

  test('已注册进 siteRules 并能被 getActiveRules 命中', () => {
    expect(siteRules.some((rule) => rule.id === twitterRule.id)).toBe(true)
    expect(getActiveRules('https://x.com/i/timeline').some((rule) => rule.id === 'twitter')).toBe(
      true
    )
    expect(
      getActiveRules('https://twitter.com/explore').some((rule) => rule.id === 'twitter')
    ).toBe(true)
    expect(getActiveRules('https://github.com/zheeeng').some((rule) => rule.id === 'twitter')).toBe(
      false
    )
  })

  test('排除选择器覆盖用户名区、互动计数与时间戳', () => {
    expect(twitterRule.excludeSelectors).toContain('div[data-testid="User-Name"]')
    expect(twitterRule.excludeSelectors).toContain('[data-testid="app-text-transition-container"]')
    expect(twitterRule.excludeSelectors).toContain('time')
  })
})
