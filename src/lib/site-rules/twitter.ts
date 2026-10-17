import type { SiteRule } from './index'

// X（Twitter）站点规则：块判定放行 inline-only 子树后，推文内的用户名区、
// 互动栏等 span 子树也会成为候选，这里把非正文 UI 整体排除，只保留推文正文
// （div[data-testid="tweetText"]）等真正需要翻译的内容。
export const twitterRule: SiteRule = {
  id: 'twitter',
  matches: (url) => url.hostname === 'twitter.com' || url.hostname === 'x.com',
  excludeSelectors: [
    'div[data-testid="User-Name"]', // 用户名区：昵称 / @handle / 认证标 / 相对时间戳
    '[data-testid="app-text-transition-container"]', // 回复 / 转推 / 点赞 / 浏览量等互动计数的数字滚动容器
    'time', // 时间戳（详情页绝对时间 / 边栏相对时间）
    'div[data-testid="socialContext"]', // 时间线「某人关注 / 某人点赞」上下文行
    'div[data-testid="caret"]', // 推文「更多」菜单按钮
    'div[role="group"]', // 推文底部操作行（回复 / 转推 / 点赞 / 收藏 / 分享）
    'form[role="search"]', // 顶部搜索框与搜索建议
    'div[data-testid="placementTracking"]', // 广告 / 推广内容容器
    '[data-testid="UserActions"]' // 用户页关注按钮等操作区
  ]
}
