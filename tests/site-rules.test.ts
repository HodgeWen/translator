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

  test('排除选择器覆盖未登录（服务端渲染变体）的时间戳 / 用户名 / 互动数字', () => {
    expect(twitterRule.excludeSelectors).toContain('div:has(> span > a[href*="/status/"])')
    expect(twitterRule.excludeSelectors).toContain('div:has(> a.x-engagement-button)')
    expect(twitterRule.excludeSelectors).toContain('a.x-engagement-button')
    expect(twitterRule.excludeSelectors).toContain('div.font-bold.text-primary')
    expect(twitterRule.excludeSelectors).toContain('div.x-middot-group')
    expect(twitterRule.excludeSelectors).toContain('a.x-link')
    expect(twitterRule.excludeSelectors).toContain('div:has(> a.x-link)')
    expect(twitterRule.excludeSelectors).toContain('aside')
    expect(twitterRule.excludeSelectors).toContain('h1.sr-only')
  })

  test('shouldExclude 拦截未登录变体的回复 li 单元（白名单标签，绕过灰名单校验）', () => {
    // 模拟 li 摘要：shouldExclude 只应拦「自身是 li 且含 meta/互动锚点」的候选，
    // 不影响内部正文 div 的收集
    const liLike = { tagName: 'LI', querySelector: (sel: string) => (sel.includes('x-middot-group') ? {} : null) }
    const divLike = { tagName: 'DIV', querySelector: () => null }
    expect(twitterRule.shouldExclude?.(liLike as HTMLElement)).toBe(true)
    expect(twitterRule.shouldExclude?.(divLike as HTMLElement)).toBe(false)
  })
})
