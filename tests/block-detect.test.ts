import { afterEach, describe, expect, test } from 'bun:test'
import { parseHTML } from 'linkedom'
import {
  INLINE_SUBTREE_MAX_NODES,
  clearActiveRulesCache,
  collectBlocks,
  getCachedActiveRules,
  isInlineOnlySubtree,
  isTranslatableBlock,
  isVisible,
  type NodeSummary
} from '../src/lib/block-detect'

// 摘要构造辅助：等价于 DOM 的文本节点 / 元素节点
function text(): NodeSummary {
  return { nodeType: 3 }
}

function el(tagName: string, children: NodeSummary[] = []): NodeSummary {
  return { nodeType: 1, tagName, children }
}

describe('isInlineOnlySubtree', () => {
  test('放行纯行内子树（含嵌套行内元素与文本）', () => {
    // 模拟 X 推文正文的子树：只有 span / a 与文本，mention、换行、图标齐全
    const tweetTextChildren = [
      el('SPAN', [text(), el('A', [text()]), el('STRONG', [text(), el('EM', [text()])])]),
      text(),
      el('BR'),
      el('IMG'),
      el('SVG'),
      el('TIME', [text()]),
      el('CODE', [text()])
    ]
    expect(isInlineOnlySubtree(tweetTextChildren)).toBe(true)
  })

  test('拒绝含块级子元素的子树（含深层嵌套）', () => {
    // 块级元素藏在嵌套深处也不能放行
    expect(isInlineOnlySubtree([el('SPAN', [el('DIV', [text()])])])).toBe(false)
    expect(isInlineOnlySubtree([el('A', [el('SPAN', [el('P', [text()])])])])).toBe(false)
    expect(isInlineOnlySubtree([el('DIV', [text()])])).toBe(false)
  })

  test('子树规模达到上限时放行、超过上限时拒绝', () => {
    const atCap = Array.from({ length: INLINE_SUBTREE_MAX_NODES }, text)
    expect(isInlineOnlySubtree(atCap)).toBe(true)
    expect(isInlineOnlySubtree([...atCap, text()])).toBe(false)
  })

  test('嵌套层级同样计入节点规模', () => {
    // 深链嵌套的行内元素：99 层 span + 1 个文本 = 100 个节点，恰好放行
    let deep: NodeSummary = text()
    for (let i = 0; i < INLINE_SUBTREE_MAX_NODES - 1; i += 1) {
      deep = el('SPAN', [deep])
    }
    expect(isInlineOnlySubtree([deep])).toBe(true)

    deep = el('SPAN', [deep])
    expect(isInlineOnlySubtree([deep])).toBe(false)
  })

  test('自定义 maxNodes 参数生效', () => {
    expect(isInlineOnlySubtree([text(), text()], 1)).toBe(false)
    expect(isInlineOnlySubtree([text()], 1)).toBe(true)
  })
})

// ─── DOM 级测试环境（linkedom + window 打桩） ──────────────────────────

/**
 * 构造 linkedom 文档并给 globalThis.window 打桩：
 * - block-detect 通过 window.location.href 取活跃站点规则，必须提供 location；
 * - linkedom 无布局引擎，getBoundingClientRect 恒返回全 0，会让 isVisible 把
 *   所有元素判为不可见，因此这里在 HTMLElement 原型上给一个非零矩形。
 */
function setupDom(html: string, href = 'https://example.com/page'): Document {
  const { window } = parseHTML(`<!doctype html><html><body>${html}</body></html>`)
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>
  proto.getBoundingClientRect = () => ({
    width: 200,
    height: 20,
    top: 0,
    left: 0,
    right: 200,
    bottom: 20,
    x: 0,
    y: 0,
    toJSON: () => ({})
  })
  const stubbed = window as unknown as { location?: { href: string } }
  stubbed.location = { href }
  ;(globalThis as Record<string, unknown>).window = window
  // 缓存按 href 保存，切到新文档必须清空，避免测试间串味
  clearActiveRulesCache()
  return window.document as unknown as Document
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window
  clearActiveRulesCache()
})

function tags(elements: HTMLElement[]): string[] {
  return elements.map((e) => `${e.tagName}${e.id ? `#${e.id}` : ''}`)
}

describe('collectBlocks 多层嵌套子夺权', () => {
  test('三层全部直接文本占比不足 → 只保留最内层候选', () => {
    // li(外) > ul > li(中) > p(内)：三层都命中白名单，外层与中层都是纯容器
    const doc = setupDom(
      '<ul><li id="o"><ul><li id="m"><p id="c">最内层的正文文本内容</p></li></ul></li></ul>'
    )
    expect(tags(collectBlocks(doc))).toEqual(['P#c'])
  })

  test('外层直接文本占比足够 → 只保留最外层，内层不重复翻译', () => {
    // 旧实现在此形态下会同时返回外层 li 与内层 p（重复翻译同一段文字）：
    // 内层 p 只看最近的 passed 祖先 li#m 就 break，没发现更外层 li#o 已经
    // 直接占比足够、会负责整段翻译。
    const doc = setupDom(
      '<ul><li id="o">这是一段足够长的直接文本内容，占比明显超过一半' +
        '<ul><li id="m"><p id="c">子段落文本内容</p></li></ul></li></ul>'
    )
    const result = collectBlocks(doc)
    expect(tags(result)).toEqual(['LI#o'])
  })

  test('四层混合嵌套：低占比容器全部抑制，只有承担翻译的祖先留下', () => {
    const doc = setupDom(
      '<ul><li id="o"><ul><li id="m"><ul><li id="n"><p id="c">最深层的正文文本</p></li></ul></li></ul></li></ul>'
    )
    expect(tags(collectBlocks(doc))).toEqual(['P#c'])
  })

  test('单层父子（li > p）仍保留子段落（原有子夺权行为不变）', () => {
    const doc = setupDom('<ul><li id="o"><p id="c">正文段落文本内容</p></li></ul>')
    expect(tags(collectBlocks(doc))).toEqual(['P#c'])
  })
})

describe('collectBlocks 占位符空壳容器（文本全在块级子孙里）', () => {
  // 回归：Reddit 评论头 <summary> 是白名单标签，但用户名 / 时间戳各在嵌套
  // <div> 中，encodeInline 把它们全变成 #N# 占位符 —— 模型无字面文本可译，
  // 渲染时又按占位符顺序重建整棵子树，grid 网格项与 slot 归属全部错位，
  // 实测高度 36px → 104px，整页结构崩坏。
  test('SUMMARY 的文本全在块级子孙里时不被收集（交给内部块级候选）', () => {
    const doc = setupDom(
      '<details><summary id="s">' +
        '<div class="avatar"><div><span>nitor999</span></div></div>' +
        '<div slot="commentMeta"><div><span>•</span><time>1个月前</time></div></div>' +
        '</summary></details>'
    )
    expect(tags(collectBlocks(doc))).not.toContain('SUMMARY#s')
  })

  test('同一页面里正文 <p> 仍正常收集（不因容器被拒而漏翻）', () => {
    const doc = setupDom(
      '<div><details><summary id="s"><div><div><span>nitor999</span></div></div></summary></details>' +
        '<p id="body">Yep deepseek is the gatekeeper of this scammy model</p></div>'
    )
    const result = tags(collectBlocks(doc))
    expect(result).toContain('P#body')
    expect(result).not.toContain('SUMMARY#s')
  })

  test('有直接文本的 SUMMARY 仍作为翻译单元（不误伤正常段落）', () => {
    const doc = setupDom('<details><summary id="s">Plain summary text here</summary></details>')
    expect(tags(collectBlocks(doc))).toEqual(['SUMMARY#s'])
  })

  test('文本在行内子元素里（非块级）仍放行（X 推文正文形态不受影响）', () => {
    const doc = setupDom(
      '<div id="t"><span>Some tweet text that lives in inline spans</span></div>'
    )
    expect(tags(collectBlocks(doc))).toContain('DIV#t')
  })
})

describe('collectBlocks Shadow DOM 收集', () => {
  test('open shadow root 内的候选会被收集', () => {
    const doc = setupDom('<div id="host"><span>外层文本</span></div>')
    const host = doc.getElementById('host') as unknown as HTMLElement
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<p id="sp">影子树内的正文文本</p>'
    expect(tags(collectBlocks(doc))).toContain('P#sp')
  })

  test('候选自身是 shadow host 时也会被收集（标签命中白名单）', () => {
    const doc = setupDom('<section id="host"><p id="light">光 DOM 内的正文</p></section>')
    const host = doc.getElementById('host') as unknown as HTMLElement
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<div><p id="sp">影子树内的正文文本</p></div>'
    const result = tags(collectBlocks(doc))
    expect(result).toContain('P#sp')
    expect(result).toContain('P#light')
  })

  test('嵌套 shadow root（shadow 内的 host 再带 shadow）同样被穿透', () => {
    const doc = setupDom('<div id="outer"></div>')
    const outer = doc.getElementById('outer') as unknown as HTMLElement
    const s1 = outer.attachShadow({ mode: 'open' })
    s1.innerHTML = '<div id="mid"></div>'
    const mid = s1.getElementById('mid') as unknown as HTMLElement
    const s2 = mid.attachShadow({ mode: 'open' })
    s2.innerHTML = '<p id="deep">两层影子树内的正文文本</p>'
    expect(tags(collectBlocks(doc))).toContain('P#deep')
  })

  test('以 shadow host 自身作为 root 做增量收集时能穿透其影子树', () => {
    const doc = setupDom('<div><shreddit-comment id="host"></shreddit-comment></div>')
    const host = doc.getElementById('host') as unknown as HTMLElement
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<p id="sp">影子树内的正文文本</p>'
    // observer flush 会以新增节点为 root 调 collectBlocks；root 自身是 host 时
    // 其影子树文本不属于 root 的后代，必须单独穿透。
    expect(tags(collectBlocks(host))).toContain('P#sp')
  })

  test('全文档收集不做任何 querySelectorAll 全量扫描（单遍 DFS）', () => {
    const doc = setupDom(
      '<div><p id="a">第一段正文文本</p><ul><li id="b"><p id="c">第二段正文文本</p></li></ul></div>'
    )
    // 根调用走 DFS：根节点上不应再出现 querySelectorAll（旧实现有两次：
    // CANDIDATE_SELECTOR 与 '*'），候选自身的局部查询不受影响。
    const rootEl = doc.documentElement as unknown as Record<string, unknown>
    const original = rootEl.querySelectorAll as (...args: unknown[]) => unknown
    let rootScanCalls = 0
    rootEl.querySelectorAll = (...args: unknown[]) => {
      rootScanCalls += 1
      return original.apply(rootEl, args)
    }
    expect(tags(collectBlocks(doc))).toEqual(['P#a', 'P#c'])
    expect(rootScanCalls).toBe(0)
  })
})

describe('collectBlocks 已翻译标记兼容（clone-replace 与原地渲染）', () => {
  test('原地渲染：元素自身带 data-translator-processed 时不再作为翻译单元', () => {
    const doc = setupDom(
      '<div><p id="done" data-translator-processed="true">已经翻译完成的段落</p></div>'
    )
    expect(collectBlocks(doc)).toEqual([])
  })

  test('原地渲染：祖先带 data-translator-processed 时其后代被排除', () => {
    const doc = setupDom(
      '<div data-translator-processed="true"><p id="child">已经翻译完成的段落</p></div>'
    )
    expect(collectBlocks(doc)).toEqual([])
  })

  test('原地渲染下译文容器仍带 processed 标记，被排除', () => {
    const doc = setupDom(
      '<div><div id="rendered" data-translator-processed="true"><p id="inner">译文容器内的文本</p></div></div>'
    )
    expect(collectBlocks(doc)).toEqual([])
  })

  test('未标记的兄弟段落不受影响', () => {
    const doc = setupDom(
      '<div><p id="done" data-translator-processed="true">已经翻译完成的段落</p>' +
        '<p id="fresh">尚未翻译的新段落文本</p></div>'
    )
    expect(tags(collectBlocks(doc))).toEqual(['P#fresh'])
  })

  test('白名单容器内有已翻译后代时整块不再收集（后续 wave 重译防护）', () => {
    // 后续 wave 里内层已带 data-translator-processed，白名单祖先（如 X 的回复 li）
    // 若被整块收集，会把已翻译正文与用户名/时间戳等 UI 混在一个单元里重译。
    const doc = setupDom(
      '<ul><li id="wrap"><div data-translator-processed="true"><p id="inner">已翻译的正文</p></div></li></ul>'
    )
    expect(collectBlocks(doc)).toEqual([])
  })

  test('isTranslatableBlock 直接调用时同样拒绝已处理元素与其容器', () => {
    const doc = setupDom(
      '<ul><li id="wrap"><div data-translator-processed="true"><p id="inner">已翻译的正文</p></div></li></ul>'
    )
    expect(isTranslatableBlock(doc.getElementById('inner') as unknown as HTMLElement)).toBe(false)
    expect(isTranslatableBlock(doc.getElementById('wrap') as unknown as HTMLElement)).toBe(false)
  })
})

describe('活跃站点规则缓存（按 href）', () => {
  test('同一 href 重复调用返回同一数组（命中缓存，不重复 new URL + filter）', () => {
    setupDom('<div></div>', 'https://x.com/home')
    const first = getCachedActiveRules()
    const second = getCachedActiveRules()
    expect(first.length).toBeGreaterThan(0)
    // getActiveRules 每次都会 filter 出新数组；同一引用即可证明走了缓存
    expect(second).toBe(first)
  })

  test('SPA 路由变化（href 改变）后缓存失效并按新 URL 重算', () => {
    // x.com 下 aside 被站点规则整体排除
    const xDoc = setupDom('<aside><p id="side">侧栏内的正文文本</p></aside>', 'https://x.com/home')
    expect(collectBlocks(xDoc)).toEqual([])

    // 同一份 DOM 结构切到无规则的站点：aside 不再被排除，段落可翻译
    const plainDoc = setupDom('<aside><p id="side">侧栏内的正文文本</p></aside>', 'https://example.com/a')
    expect(tags(collectBlocks(plainDoc))).toEqual(['P#side'])

    // 再切回 x.com 必须重新命中 twitter 规则（缓存已随 href 失效）
    const xDocAgain = setupDom('<aside><p id="side">侧栏内的正文文本</p></aside>', 'https://x.com/other')
    expect(getCachedActiveRules().some((rule) => rule.id === 'twitter')).toBe(true)
    expect(collectBlocks(xDocAgain)).toEqual([])
  })

  test('clearActiveRulesCache 后重新计算（返回新数组）', () => {
    setupDom('<div></div>', 'https://x.com/home')
    const first = getCachedActiveRules()
    clearActiveRulesCache()
    const second = getCachedActiveRules()
    expect(second).not.toBe(first)
    expect(second.some((rule) => rule.id === 'twitter')).toBe(true)
  })

  test('无 window（非浏览器 / 构建期）时返回空规则且不抛错', () => {
    delete (globalThis as Record<string, unknown>).window
    clearActiveRulesCache()
    expect(getCachedActiveRules()).toEqual([])
  })
})

describe('isVisible 分支', () => {
  test('checkVisibility 存在时优先使用（即使 getBoundingClientRect 非零也以它为准）', () => {
    const doc = setupDom('<div><p id="p">正文文本内容</p></div>')
    const p = doc.getElementById('p') as unknown as HTMLElement
    let called = 0
    ;(p as unknown as Record<string, unknown>).checkVisibility = () => {
      called += 1
      return false
    }
    // 原型桩矩形为非零，若错误地走回退分支会返回 true
    expect(isVisible(p)).toBe(false)
    expect(called).toBe(1)

    ;(p as unknown as Record<string, unknown>).checkVisibility = () => true
    expect(isVisible(p)).toBe(true)
  })

  test('checkVisibility 不存在时回退到 getBoundingClientRect 判定', () => {
    const doc = setupDom('<div><p id="p">正文文本内容</p></div>')
    const p = doc.getElementById('p') as unknown as HTMLElement
    expect(typeof (p as unknown as Record<string, unknown>).checkVisibility).toBe('undefined')
    // 原型桩：200×20 → 可见
    expect(isVisible(p)).toBe(true)

    // 覆盖为全 0 矩形 → 不可见（linkedom 默认行为，不应抛错）
    ;(p as unknown as Record<string, unknown>).getBoundingClientRect = () => ({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({})
    })
    expect(isVisible(p)).toBe(false)
  })

  test('无布局环境下 isVisible 不抛错（linkedom 默认全 0 矩形）', () => {
    const doc = setupDom('<div><p id="p">正文文本内容</p></div>')
    const p = doc.getElementById('p') as unknown as HTMLElement
    const proto = Object.getPrototypeOf(p) as unknown as Record<string, unknown>
    // 还原成 linkedom 原始行为（全 0）后只验证「不抛错 + 判不可见」
    proto.getBoundingClientRect = () => ({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({})
    })
    expect(() => isVisible(p)).not.toThrow()
    expect(isVisible(p)).toBe(false)
    // 块判定在无布局环境下同样不应抛错
    expect(() => isTranslatableBlock(p)).not.toThrow()
  })
})
