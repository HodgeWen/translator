import type { SiteRule } from './index'

// X（Twitter）站点规则：块判定放行 inline-only 子树后，推文内的用户名区、
// 互动栏等 span 子树也会成为候选，这里把非正文 UI 整体排除，只保留推文正文
// （div[data-testid="tweetText"]）等真正需要翻译的内容。
//
// 两套 DOM 形态：
// - 登录态（React 应用）：data-testid 锚点（User-Name / app-text-transition-container 等）。
// - 未登录（服务端渲染变体，2026-10 实测 x.com/jack/status/20）：无任何
//   data-testid、无 <time>，结构与语义类名见下（x-* 前缀为该变体设计系统类）。
export const twitterRule: SiteRule = {
  id: 'twitter',
  matches: (url) => url.hostname === 'twitter.com' || url.hostname === 'x.com',
  excludeSelectors: [
    // ── 登录态（React 应用）锚点 ──
    'div[data-testid="User-Name"]', // 用户名区：昵称 / @handle / 认证标 / 相对时间戳
    '[data-testid="app-text-transition-container"]', // 回复 / 转推 / 点赞 / 浏览量等互动计数的数字滚动容器
    'time', // 时间戳（详情页绝对时间 / 边栏相对时间）
    'div[data-testid="socialContext"]', // 时间线「某人关注 / 某人点赞」上下文行
    'div[data-testid="caret"]', // 推文「更多」菜单按钮
    'div[role="group"]', // 推文底部操作行（回复 / 转推 / 点赞 / 收藏 / 分享）
    'form[role="search"]', // 顶部搜索框与搜索建议
    'div[data-testid="placementTracking"]', // 广告 / 推广内容容器
    '[data-testid="UserActions"]', // 用户页关注按钮等操作区
    // ── 未登录（服务端渲染变体）锚点 ──
    // 时间戳行：唯一 div>span>a 结构，a 指向推文本身（/<user>/status/<id>）；
    // 主推文与回复的时间戳行同构。:has 限定「直接子级 span 下的状态链接」，
    // 不会波及同层级的推文正文 div。
    'div:has(> span > a[href*="/status/"])',
    // 互动数字行：4 个 a.x-engagement-button（回复/转推/点赞/浏览）是该行
    // div 的直接子级；数字在 span.x-engagement-pill > span.x-animated-count-visual。
    'div:has(> a.x-engagement-button)',
    'a.x-engagement-button',
    // 显示名（含花体名）：未登录变体里是带粗体主文本类的 div（登录态由
    // User-Name 覆盖）；@handle 是 span > a.x-link 内文本，非候选标签无需单列。
    'div.font-bold.text-primary',
    // 回复 meta 行（显示名 · @handle · 时间 的句点组容器）
    'div.x-middot-group',
    // x-link 通用链接组件（未登录变体的资料页链接 / 时间戳链接等），兜底
    // 拦截链接内可能出现的候选容器
    'a.x-link',
    // 直接子级全是 x-link 的行容器：侧栏用户卡片（名 / @handle / Follow 三个
    // 链接构成的 inline-only 块）与「查看所有回复」等链接行；块判定的排除
    // 只拦自身与后代，父容器必须单独命中才能阻止这类聚合收集
    'div:has(> a.x-link)',
    // 侧栏整体（Relevant people 用户卡片 / 登录引导 / 趋势等 UI chrome）。
    // X 的 <aside> 只承载侧栏，不含正文；块判定里 aside 是灰名单候选而非排除项，
    // 站点级在此整体排除
    'aside',
    // 页面 sr-only 一级标题（推文内容的标题回显，非可见正文）
    'h1.sr-only'
  ],
  // 未登录变体的回复条目是白名单 <li>（整条含 名字/@handle/时间/互动数/正文），
  // 白名单标签不经过灰名单结构校验；若该 li 先于正文 div 被收集，会把整条
  // UI 混进一个翻译单元。shouldExclude 只拦候选自身、不影响后代候选，正文
  // div 仍可独立成单元（excludeSelectors 的 closest 语义做不到这点）。
  shouldExclude: (el) =>
    el.tagName === 'LI' &&
    (el.querySelector('div.x-middot-group') !== null ||
      el.querySelector('a.x-engagement-button') !== null)
}
