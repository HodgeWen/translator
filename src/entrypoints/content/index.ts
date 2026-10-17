import { defineContentScript } from 'wxt/utils/define-content-script'
import type { ContentScriptDefinition } from 'wxt'
import { sendBgMessage } from '@/lib/messaging'
import { state, applySettingsToState } from './state'
import { toggleAllDisplay } from './style-apply'
import { startTranslation, stopTranslation, setupSPADetection } from './observer'
import { setupInputListeners } from './input-translate'
import { setupCtrlHover } from './ctrl-hover'
import type { ContentMessage } from '@/types'
import './styles.css'

// ─── Utilities ──────────────────────────────────────────────────────────

function isValidPage(): boolean {
  const url = location.href
  return (
    !url.startsWith('chrome://') &&
    !url.startsWith('chrome-extension://') &&
    !url.startsWith('devtools://') &&
    !url.startsWith('about:') &&
    !url.startsWith('edge://') &&
    !url.startsWith('chrome-error://') &&
    !url.startsWith('moz-extension://')
  )
}

// ─── Toggle Handler ─────────────────────────────────────────────────────

// Alt+W 状态机：
//   inactive                          → press → active + translation（启动翻译，显示译文）
//   active + translation              → press → active + original（全页 toggle 到原文，不停止 observer）
//   active + original                 → press → active + translation（全页 toggle 回译文）
// 目的：避免每次按 Alt+W 都重新请求 API；翻译结果保留在 elementMap，纯切换 DOM 显示。

let isToggling = false

// 首次激活路径：读设置 → applySettingsToState → startTranslation。
// Alt+W 首次激活与 popup「翻译此页」共用，保证两条入口行为一致。
async function activateTranslation(): Promise<void> {
  isToggling = true
  try {
    await sendBgMessage({ type: 'PING' }).catch(() => null)

    const { getSettings } = await import('@/lib/storage')
    const s = await getSettings()

    applySettingsToState(s)
    state.isActive = true
    state.displayMode = 'translation'

    startTranslation()
  } catch (err) {
    console.warn('[Translator] activateTranslation failed:', err)
  } finally {
    isToggling = false
  }
}

async function toggleTranslation(): Promise<void> {
  if (isToggling) return

  if (state.isActive) {
    if (state.displayMode === 'translation') {
      state.displayMode = 'original'
      toggleAllDisplay(true)
    } else {
      state.displayMode = 'translation'
      toggleAllDisplay(false)
    }
    return
  }

  await activateTranslation()
}

// popup「翻译此页」：未激活时走激活路径；已激活时最多把显示切回译文，不重复发请求。
async function startPageTranslation(): Promise<void> {
  if (isToggling) return

  if (state.isActive) {
    if (state.displayMode === 'original') {
      state.displayMode = 'translation'
      toggleAllDisplay(false)
    }
    return
  }

  await activateTranslation()
}

// popup「停止翻译」：唯一的「停止并还原」入口。
// stopTranslation 内部会复位 state.isActive 并 restoreAll 还原全部原文，
// 之后 Alt+W / popup「翻译此页」均可重新启动。
function stopPageTranslation(): void {
  if (isToggling) return
  stopTranslation()
}

// ─── Main Entrypoint ────────────────────────────────────────────────────

export default defineContentScript({
  matches: ['<all_urls>'],
  // 覆盖 iframe：页面翻译需在所有 frame 生效
  allFrames: true,
  runAt: 'document_idle',
  main() {
    if (!isValidPage()) return

    // Guard against double-injection (extension reload/update)
    if ((window as unknown as Record<string, unknown>).__translatorContentScriptLoaded) {
      return
    }
    ;(window as unknown as Record<string, unknown>).__translatorContentScriptLoaded = true

    chrome.runtime.onMessage.addListener((message: ContentMessage) => {
      switch (message.type) {
        case 'TOGGLE_TRANSLATION':
          void toggleTranslation()
          break
        case 'START_TRANSLATION':
          void startPageTranslation()
          break
        case 'STOP_TRANSLATION':
          stopPageTranslation()
          break
      }
    })

    setupInputListeners()
    setupCtrlHover()
    setupSPADetection()
  }
}) as ContentScriptDefinition
