import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseHTML } from 'linkedom'
import { localizeTranslationError } from '../src/components/popup/translation-result'
import { BgMessageError } from '../src/lib/messaging'
import { DEFAULT_SETTINGS, saveSettings } from '../src/lib/storage'
import type { GlobalSettings, ProviderConfig, SingleService } from '../src/types'

// 本文件同时覆盖两块：
// 1) localizeTranslationError 的纯函数映射分支；
// 2) popup 真实渲染行为（linkedom + react-dom）——粘贴回归、空态、取消、aria。
// 注意：bun 在同一进程内共享模块注册表，因此 popup 用带 query 的动态 import 拿新实例。

// --- 1. 纯函数：错误本地化 -------------------------------------------------

beforeAll(() => {
  // i18n.ts 的 t() 在扩展里读 chrome.i18n。测试里让 getMessage 原样返回 key，
  // 这样断言值就是「最终选中的 i18n key」，可以直接验证映射分支。
  ;(globalThis as unknown as { chrome: unknown }).chrome = {
    i18n: { getMessage: (key: string) => key }
  }
})

describe('localizeTranslationError — 错误码映射', () => {
  test('把后台错误码映射到对应的本地化 key', () => {
    expect(localizeTranslationError(new BgMessageError('raw', 'NO_ACTIVE_SERVICE'))).toBe(
      'error_no_active_service'
    )
    expect(localizeTranslationError(new BgMessageError('raw', 'NO_MODELS'))).toBe('error_no_models')
    expect(localizeTranslationError(new BgMessageError('raw', 'ALL_MODELS_FAILED'))).toBe(
      'error_all_models_failed'
    )
    expect(localizeTranslationError(new BgMessageError('raw', 'EMPTY_RESPONSE'))).toBe(
      'error_empty_response'
    )
    expect(localizeTranslationError(new BgMessageError('raw', 'REQUEST_ABORTED'))).toBe(
      'error_request_aborted'
    )
    expect(localizeTranslationError(new BgMessageError('raw', 'SETTINGS_QUOTA_EXCEEDED'))).toBe(
      'error_settings_quota_exceeded'
    )
  })

  test('错误码优先于消息特征串', () => {
    // 消息看起来像「无服务」，但 code 说没有模型 —— 应以 code 为准
    expect(
      localizeTranslationError(
        new BgMessageError(
          'No active translation service available. Please configure services.',
          'NO_MODELS'
        )
      )
    ).toBe('error_no_models')
  })

  test('未知错误码不命中映射，继续按消息特征串回落', () => {
    expect(
      localizeTranslationError(new BgMessageError('Empty translation response', 'SOME_NEW_CODE'))
    ).toBe('error_empty_response')
  })
})

describe('localizeTranslationError — 消息特征串映射', () => {
  test('无可用服务', () => {
    expect(
      localizeTranslationError(
        new Error('No active translation service available. Please configure services in settings.')
      )
    ).toBe('error_no_active_service')
  })

  test('无可用模型', () => {
    expect(localizeTranslationError(new Error('No models configured'))).toBe('error_no_models')
    expect(localizeTranslationError(new Error('No model configured'))).toBe('error_no_models')
  })

  test('全部模型失败（带多行明细）', () => {
    expect(
      localizeTranslationError(
        new Error('All translation models failed:\nopenai/gpt-4o: HTTP 500\ndeepseek/v3: timeout')
      )
    ).toBe('error_all_models_failed')
  })

  test('空响应', () => {
    expect(localizeTranslationError(new Error('Empty translation response'))).toBe(
      'error_empty_response'
    )
  })

  test('请求中断：既认消息也认 AbortError', () => {
    expect(localizeTranslationError(new Error('Request aborted'))).toBe('error_request_aborted')

    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    expect(localizeTranslationError(abortError)).toBe('error_request_aborted')
  })

  test('匹配不依赖后台完整文案，只依赖稳定前缀', () => {
    // 后台微调措辞后仍应命中
    expect(localizeTranslationError(new Error('No active translation service available.'))).toBe(
      'error_no_active_service'
    )
    expect(localizeTranslationError(new Error('All translation models failed'))).toBe(
      'error_all_models_failed'
    )
  })

  test('大小写不同也能命中', () => {
    expect(localizeTranslationError(new Error('all translation models failed: x'))).toBe(
      'error_all_models_failed'
    )
  })
})

describe('localizeTranslationError — 未知错误回落', () => {
  test('未知消息保留原始文案，便于用户与开发者定位', () => {
    expect(localizeTranslationError(new Error('HTTP 418: teapot'))).toBe('HTTP 418: teapot')
  })

  test('非 Error 的字符串入参同样可映射', () => {
    expect(localizeTranslationError('Empty translation response')).toBe('error_empty_response')
    expect(localizeTranslationError('totally unknown')).toBe('totally unknown')
  })

  test('完全没有信息时回落到「未知错误」', () => {
    expect(localizeTranslationError(undefined)).toBe('error_unknown')
    expect(localizeTranslationError(null)).toBe('error_unknown')
    expect(localizeTranslationError(new Error(''))).toBe('error_unknown')
    expect(localizeTranslationError({ weird: true })).toBe('error_unknown')
  })
})

// --- 2. popup 渲染行为 ------------------------------------------------------

const DOM_KEYS = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLTextAreaElement',
  'Element',
  'Node',
  'Event',
  'CustomEvent',
  'MutationObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame'
] as const

type GlobalKey = (typeof DOM_KEYS)[number]
const savedGlobals = new Map<GlobalKey, unknown>()
let savedChrome: unknown
let domInstalled = false

// 安装 linkedom DOM。React 19 需要 window/document/navigator 等一套全局。
function installDom() {
  if (!domInstalled) {
    for (const key of DOM_KEYS) {
      savedGlobals.set(key, (globalThis as unknown as Record<string, unknown>)[key])
    }
    savedChrome = (globalThis as unknown as { chrome?: unknown }).chrome
    domInstalled = true
  }

  const { window } = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  Object.assign(globalThis as unknown as Record<string, unknown>, {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    HTMLTextAreaElement: window.HTMLTextAreaElement,
    Element: window.Element,
    Node: window.Node,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle,
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0),
    cancelAnimationFrame: (id: number) => clearTimeout(id)
  })
  // useDarkMode 会调用 matchMedia
  ;(window as unknown as { matchMedia: unknown }).matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  })
  return window
}

afterAll(() => {
  // 还原全局，避免污染同进程的其它测试文件
  for (const key of DOM_KEYS) {
    const original = savedGlobals.get(key)
    if (original === undefined) {
      delete (globalThis as unknown as Record<string, unknown>)[key]
    } else {
      ;(globalThis as unknown as Record<string, unknown>)[key] = original
    }
  }
  ;(globalThis as unknown as { chrome?: unknown }).chrome = savedChrome
})

function buildSettings(overrides: Partial<GlobalSettings> = {}): GlobalSettings {
  const provider: ProviderConfig = {
    id: 'p1',
    name: 'Provider One',
    baseURL: 'https://example.com/v1',
    apiKey: '',
    headers: {},
    query: {},
    body: {},
    models: [{ id: 'm1', name: 'Model One' }]
  } as ProviderConfig
  const service: SingleService = {
    id: 's1',
    name: 'Service One',
    type: 'single',
    providerId: 'p1',
    modelId: 'm1',
    fallbackEnabled: false
  } as SingleService
  return {
    ...DEFAULT_SETTINGS,
    providers: [provider],
    services: [service],
    selectedServiceId: 's1',
    ...overrides
  }
}

interface ChromeStubOptions {
  /** 拦截 sendMessage：默认立即成功返回译文 */
  onSendMessage?: (message: { type?: string }, respond: (response: unknown) => void) => void
}

let openOptionsCalls = 0

function stubChrome(options: ChromeStubOptions = {}) {
  ;(globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      sync: {
        get: async () => ({}),
        set: async () => {}
      },
      onChanged: { addListener() {} }
    },
    i18n: { getMessage: (key: string) => key },
    runtime: {
      getURL: (path: string) => path,
      getManifest: () => ({ version: '0.0.0-test' }),
      openOptionsPage: () => {
        openOptionsCalls += 1
      },
      sendMessage: (message: unknown, respond: (response: unknown) => void) => {
        if (options.onSendMessage) {
          options.onSendMessage(message as { type?: string }, respond)
          return
        }
        respond({
          success: true,
          data: { text: '译文结果', providerId: 'p1', modelId: 'm1' }
        })
      }
    },
    tabs: {
      query: async () => [{ id: 1 }],
      sendMessage: async () => {}
    }
  }
}

const flush = (ms = 120) => new Promise<void>((resolve) => setTimeout(resolve, ms))

let runCounter = 0

/** 以全新模块实例挂载 popup，返回其渲染的根节点 */
async function mountPopup(settings: GlobalSettings, options: ChromeStubOptions = {}) {
  installDom()
  stubChrome(options)
  // storage 有模块级缓存；用 saveSettings 预热缓存，保证每次挂载读到期望设置
  await saveSettings(settings)
  runCounter += 1
  await import(`../src/entrypoints/popup/main?run=${runCounter}`)
  await flush(200)
  return document.getElementById('root') as HTMLElement
}

function dispatchPaste(textarea: HTMLTextAreaElement) {
  const window = globalThis as unknown as { window: Window }
  const event = new (window as unknown as { Event: typeof Event }).Event('paste', {
    bubbles: true,
    cancelable: true
  }) as Event & { clipboardData: unknown }
  // 纯文本粘贴：没有图片条目，走 setTimeout 分支
  event.clipboardData = { items: [], files: [] }
  textarea.dispatchEvent(event)
}

/**
 * 用粘贴驱动一次翻译。
 * 不用「输入 + 点发送」是因为 React 19 的受控 textarea onChange 在 linkedom 下不触发
 * （React 的 inputValueTracking 依赖真实原生 change），粘贴路径则直接读 textareaRef，
 * 正好也是问题 1 要覆盖的链路。
 */
async function pasteText(root: HTMLElement, text: string, wait = 250) {
  const textarea = root.querySelector('textarea') as HTMLTextAreaElement
  textarea.value = text
  dispatchPaste(textarea)
  await flush(wait)
}

// 精确匹配按钮文案：popup_translate 是 popup_translate_page 的子串，不能只用 includes
function findButton(root: HTMLElement, label: string) {
  return Array.from(root.querySelectorAll('button')).find(
    (item) => (item.textContent ?? '').trim() === label
  )
}

function findByClass(root: HTMLElement, className: string) {
  return Array.from(root.querySelectorAll('*')).find((item) =>
    (item.getAttribute('class') ?? '').includes(className)
  )
}

describe('popup 粘贴文本自动翻译（回归）', () => {
  // 回归背景：handlePaste 曾在 setTimeout 里读 e.currentTarget.value，
  // React 在事件派发结束的 executeDispatch finally 里把 currentTarget 置为 null，
  // 导致纯文本粘贴 100% 失效（抛 null is not an object）。
  test('粘贴纯文本会带着 textarea 的最新值发起 TRANSLATE', async () => {
    const sent: Array<{ type?: string; payload?: { text?: string } }> = []
    const root = await mountPopup(buildSettings(), {
      onSendMessage: (message, respond) => {
        sent.push(message)
        respond({ success: true, data: { text: '译好了', providerId: 'p1', modelId: 'm1' } })
      }
    })

    const textarea = root.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea).toBeTruthy()

    textarea.value = 'hello world'
    dispatchPaste(textarea)
    await flush(250)

    expect(sent.length).toBe(1)
    expect(sent[0].type).toBe('TRANSLATE')
    // 关键：粘贴内容确实从 textarea 读到并送去翻译
    expect(sent[0].payload?.text).toBe('hello world')
    expect(root.textContent).toContain('译好了')
  })

  test('源码不再读取 e.currentTarget（防止回归复发）', () => {
    const stripComments = (source: string) =>
      source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
    const source = stripComments(
      readFileSync(join(import.meta.dir, '../src/entrypoints/popup/main.tsx'), 'utf8')
    )
    expect(source).not.toContain('currentTarget')
    expect(source).toContain('textareaRef.current?.value')
  })
})

describe('popup 未配置服务的空态引导', () => {
  test('services 为空时展示标题、说明与打开设置按钮，且不再渲染空下拉框', async () => {
    const root = await mountPopup(buildSettings({ services: [], selectedServiceId: '' }))

    expect(root.textContent).toContain('popup_no_service_title')
    expect(root.textContent).toContain('popup_no_service_desc')
    expect(root.textContent).toContain('popup_open_settings')
    // 没有服务时不应该出现翻译输入框
    expect(root.querySelector('textarea')).toBeNull()

    // 点「打开设置」应调用 chrome.runtime.openOptionsPage
    const openButton = findButton(root, 'popup_open_settings')
    expect(openButton).toBeTruthy()
    const before = openOptionsCalls
    openButton!.click()
    expect(openOptionsCalls).toBe(before + 1)
  })

  test('有服务时正常渲染输入框，不显示空态', async () => {
    const root = await mountPopup(buildSettings())
    expect(root.querySelector('textarea')).toBeTruthy()
    expect(root.textContent).not.toContain('popup_no_service_title')
  })
})

describe('popup 错误本地化与内联提示', () => {
  test('后台返回英文「无可用服务」时显示中文对应 key，并带 role=alert', async () => {
    const root = await mountPopup(buildSettings(), {
      onSendMessage: (_message, respond) => {
        respond({
          success: false,
          error: 'No active translation service available. Please configure services in settings.'
        })
      }
    })

    await pasteText(root, 'hi')

    const alert = root.querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert!.textContent).toContain('error_no_active_service')
    // 不应把英文原文直接甩给用户
    expect(alert!.textContent).not.toContain('No active translation service')
    // 提供重试入口
    expect(alert!.textContent).toContain('popup_error_retry')
  })
})

describe('popup 取消机制与过期响应', () => {
  test('翻译中展示取消按钮，点击后回到空闲并忽略随后到达的旧响应', async () => {
    const pending: Array<(response: unknown) => void> = []
    const root = await mountPopup(buildSettings(), {
      onSendMessage: (_message, respond) => {
        // 挂起：模拟后台仍在处理
        pending.push(respond)
      }
    })

    await pasteText(root, 'slow text', 120)

    // 进行中：取消按钮出现，结果区 aria-busy=true
    const cancelButton = findButton(root, 'btn_cancel')
    expect(cancelButton).toBeTruthy()
    const liveRegion = root.querySelector('[data-testid="popup-result-live"]')
    expect(liveRegion).toBeTruthy()
    expect(liveRegion!.getAttribute('aria-busy')).toBe('true')

    // 点取消
    cancelButton!.click()
    await flush(60)
    expect(root.textContent).toContain('error_request_aborted')
    expect(findButton(root, 'btn_cancel')).toBeFalsy()
    expect(root.querySelector('[data-testid="popup-result-live"]')!.getAttribute('aria-busy')).toBe('false')

    // 过期响应迟到：不得覆盖已取消的 UI
    expect(pending.length).toBe(1)
    pending[0]({ success: true, data: { text: '迟到的译文', providerId: 'p1', modelId: 'm1' } })
    await flush(120)
    expect(root.textContent).not.toContain('迟到的译文')
  })

  test('快速连续两次翻译时，先到的旧响应不覆盖新结果', async () => {
    const pending: Array<(response: unknown) => void> = []
    const root = await mountPopup(buildSettings(), {
      onSendMessage: (_message, respond) => {
        pending.push(respond)
      }
    })

    await pasteText(root, 'first', 80)
    // 第一次请求还在跑；取消后立刻再粘贴一次发起第二次
    findButton(root, 'btn_cancel')!.click()
    await flush(40)
    await pasteText(root, 'second', 80)

    expect(pending.length).toBe(2)
    // 旧响应先回来，必须被丢弃
    pending[0]({ success: true, data: { text: '旧结果', providerId: 'p1', modelId: 'm1' } })
    await flush(80)
    expect(root.textContent).not.toContain('旧结果')

    // 新响应才生效
    pending[1]({ success: true, data: { text: '新结果', providerId: 'p1', modelId: 'm1' } })
    await flush(120)
    expect(root.textContent).toContain('新结果')
  })
})

describe('popup 结果区高度约束与无障碍', () => {
  test('长译文容器带 max-h 与 overflow-y-auto，根容器限制在 600px 内', async () => {
    const longText = Array.from({ length: 40 }, (_, i) => `第 ${i + 1} 行很长的译文内容`).join('\n')
    const root = await mountPopup(buildSettings(), {
      onSendMessage: (_message, respond) => {
        respond({ success: true, data: { text: longText, providerId: 'p1', modelId: 'm1' } })
      }
    })

    await pasteText(root, 'long input')

    const scroller = findByClass(root, 'max-h-[240px]')
    expect(scroller).toBeTruthy()
    expect(scroller!.className).toContain('overflow-y-auto')
    // 根容器必须有上限，否则 Chrome popup 会被撑破
    const rootContainer = root.firstElementChild as HTMLElement
    expect(rootContainer.className).toContain('max-h-[600px]')
  })

  test('输入框、发送按钮、结果区都具备 aria 属性', async () => {
    const root = await mountPopup(buildSettings())
    const textarea = root.querySelector('textarea')!
    expect(textarea.getAttribute('aria-label')).toBe('popup_placeholder')

    const sendButton = findButton(root, 'popup_translate')!
    expect(sendButton.getAttribute('aria-label')).toBe('popup_translate')

    const liveRegion = root.querySelector('[data-testid="popup-result-live"]')
    expect(liveRegion).toBeTruthy()
    expect(liveRegion!.getAttribute('aria-busy')).toBe('false')

    const imageButton = Array.from(root.querySelectorAll('button')).find(
      (item) => item.getAttribute('aria-label') === 'popup_image_translate'
    )
    expect(imageButton).toBeTruthy()
  })
})
