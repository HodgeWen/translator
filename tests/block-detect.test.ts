import { describe, expect, test } from 'bun:test'
import {
  INLINE_SUBTREE_MAX_NODES,
  isInlineOnlySubtree,
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
