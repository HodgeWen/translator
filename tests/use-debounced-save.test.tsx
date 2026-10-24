import { describe, expect, test } from 'bun:test'
import { parseHTML } from 'linkedom'

// useDebouncedSave 的两条关键语义回归：
// 1. 同窗口内多个字段的 patch 必须合并（否则后一次覆盖前一次，用户输入静默丢失）；
// 2. 卸载时必须 flush 在途修改（设置页切 tab 会卸载分区组件）。
// 这两条此前都缺失，前者会让「改完 A 立刻改 B」丢掉 A，后者会让「改完立刻切 tab」丢掉修改。

const { window } = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
;(globalThis as unknown as { window: unknown }).window = window
;(globalThis as unknown as { document: unknown }).document = window.document
;(globalThis as unknown as { navigator: unknown }).navigator = window.navigator
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const React = await import('react')
const { createRoot } = await import('react-dom/client')
const { act } = React
const { useDebouncedSave } = await import('../src/hooks/use-debounced-save')

const DEBOUNCE_MS = 50
const base = { requestTimeout: 30000, maxParagraphsPerRequest: 10 } as never
const saved: Array<Record<string, unknown>> = []
let saveFn: ((patch: Record<string, unknown>) => void) | null = null

function Harness() {
  saveFn = useDebouncedSave(base, (s) => saved.push(s as unknown as Record<string, unknown>), DEBOUNCE_MS)
  return React.createElement('div', null, 'x')
}

// 每个用例用独立容器，避免同一 container 重复 createRoot 的告警
let containerSeq = 0
async function mount() {
  const container = document.createElement('div')
  container.id = `root-${containerSeq++}`
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(React.createElement(Harness))
  })
  return root
}

describe('useDebouncedSave 语义', () => {
  test('同一防抖窗口内多个字段的修改合并落盘', async () => {
    saved.length = 0
    const root = await mount()
    await act(async () => {
      saveFn!({ requestTimeout: 12345 })
      saveFn!({ maxParagraphsPerRequest: 99 })
    })
    await new Promise((r) => setTimeout(r, DEBOUNCE_MS + 150))

    expect(saved).toHaveLength(1)
    expect(saved[0].requestTimeout).toBe(12345)
    expect(saved[0].maxParagraphsPerRequest).toBe(99)
    await act(async () => root.unmount())
  })

  test('卸载时在途修改仍会落盘，不丢用户输入', async () => {
    saved.length = 0
    const root = await mount()
    await act(async () => {
      saveFn!({ requestTimeout: 55555 })
    })
    await act(async () => root.unmount())
    await new Promise((r) => setTimeout(r, DEBOUNCE_MS + 150))

    expect(saved).toHaveLength(1)
    expect(saved[0].requestTimeout).toBe(55555)
  })

  test('无待落盘内容时卸载不产生多余写入', async () => {
    saved.length = 0
    const root = await mount()
    await act(async () => root.unmount())
    await new Promise((r) => setTimeout(r, DEBOUNCE_MS + 150))

    expect(saved).toHaveLength(0)
  })
})
