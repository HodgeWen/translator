import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 复制到剪贴板并给出「已复制」反馈。
 *
 * 抽成共享 hook 的依据：预设接口地址弹窗与推理参数指南弹窗各自手写了一份
 * 「writeText → 标记已复制 → 2000ms 后复位 → 失败静默」的逻辑，逐行相同。
 * 抽出的同时修掉两处原实现的定时器泄漏：组件卸载后 2s 的 setTimeout 仍会触发 setState，
 * 这里统一在卸载时清理。
 *
 * @param resetMs 反馈持续时间，默认 2000ms（与原实现一致）
 */
export function useCopyFeedback<T extends string | boolean = boolean>(resetMs = 2000) {
  const [copied, setCopied] = useState<T>(false as T)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const copy = useCallback(
    async (text: string, marker: T = true as T) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(marker)
        clearTimer()
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          setCopied(false as T)
        }, resetMs)
      } catch {
        // 复制失败静默：与原有行为一致，不打断用户当前操作
      }
    },
    [clearTimer, resetMs]
  )

  const reset = useCallback(() => {
    clearTimer()
    setCopied(false as T)
  }, [clearTimer])

  return { copied, copy, reset }
}
