import { useCallback, useEffect, useRef } from 'react'
import type { GlobalSettings } from '@/types'

/**
 * 防抖保存设置。
 *
 * 抽成共享 hook 的原因：通用设置（4 个数字输入）、预设与风格（全局提示词 textarea）、
 * 显示设置（输入加载脉冲时长）三处都需要「输入时不立刻落盘」，
 * 此前两处各自手写了一份完全相同的 debounceRef + useCallback + 卸载清理，
 * 第三处（显示设置）漏写了，导致每次按键都写 chrome.storage.sync。
 *
 * chrome.storage.sync 有 120 次/分钟的写入配额（MAX_WRITE_OPERATIONS_PER_MINUTE），
 * 超限会抛错并丢弃本次修改，所以凡是「连续输入触发保存」的路径都必须防抖。
 *
 * 两条必须保证的语义（否则会静默丢用户输入）：
 * 1. **同窗口内的多次 patch 要合并**，不能「后来的取消先来的」。
 *    一个组件里通常有多个字段共用一个 hook 实例（通用设置 4 个数字输入、
 *    预设风格页的提示词等），用户改完 A 立刻改 B，若只保留最后一次 patch，
 *    A 的修改就永久丢失。
 * 2. **卸载时要 flush 而不是丢弃**。设置页切换 tab 会卸载当前分区组件
 *    （options/main.tsx 用 `activeTab === x && <Panel/>` 条件渲染），
 *    用户改完值 500ms 内切走，若不 flush，这次修改同样永久丢失。
 *
 * @param settings 当前设置（保存时以它为基底做 patch）
 * @param onSave 真正落盘的保存函数
 * @param delayMs 防抖窗口，默认 500ms
 */
export function useDebouncedSave(
  settings: GlobalSettings,
  onSave: (settings: GlobalSettings) => void,
  delayMs = 500
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 累积待落盘的 patch：同窗口内多个字段的修改在此合并，而不是互相覆盖。
  const pendingRef = useRef<Partial<GlobalSettings>>({})
  // 用 ref 持有最新的 settings/onSave：避免它们变化时重建 debounce 函数，
  // 也避免防抖窗口内 settings 更新导致 patch 落到底稿旧值上。
  const latestRef = useRef({ settings, onSave })
  latestRef.current = { settings, onSave }

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /** 取走累积的 patch 并落盘（无待落盘内容时为空操作） */
  const flush = useCallback(() => {
    clearTimer()
    const patch = pendingRef.current
    pendingRef.current = {}
    if (Object.keys(patch).length === 0) return
    const { settings: base, onSave: saveLatest } = latestRef.current
    saveLatest({ ...base, ...patch })
  }, [clearTimer])

  const save = useCallback(
    (patch: Partial<GlobalSettings>) => {
      // 合并而非替换：同窗口内不同字段的修改都要保留
      pendingRef.current = { ...pendingRef.current, ...patch }
      clearTimer()
      timerRef.current = setTimeout(flush, delayMs)
    },
    [delayMs, clearTimer, flush]
  )

  // 卸载时把在途修改落盘，避免「改完立刻切 tab」丢失输入。
  // StrictMode 下 mount 后会立即执行一次 cleanup，此时 pending 为空 → 空操作。
  useEffect(() => flush, [flush])

  return save
}
