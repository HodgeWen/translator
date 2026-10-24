import type React from 'react'

/**
 * WAI-ARIA 单选组 / 标签页的键盘导航。
 *
 * 抽成共享 hook 的原因：设置页有 5 个 `role="radiogroup"`（展示样式、语气、配色等）
 * 与 1 个 `role="tablist"`，逐个手写方向键处理会重复 6 份相同逻辑（坏味道：重复代码）。
 *
 * 约定：容器内可聚焦项带 `role="radio"` 或 `role="tab"`，并用 `aria-checked` /
 * `aria-selected` 标识当前项；激活后调用项的 `click()` 复用既有点击逻辑，
 * 避免在这里重复维护「选中后要做什么」。
 *
 * @param itemRole 容器内子项的 role
 * @param orientation 方向键轴；'horizontal' 用左右，'vertical' 用上下，'both' 都支持
 */
export function handleRovingKeyDown(
  event: React.KeyboardEvent<HTMLElement>,
  itemRole: 'radio' | 'tab',
  orientation: 'horizontal' | 'vertical' | 'both' = 'both'
): void {
  const prevKeys =
    orientation === 'vertical'
      ? ['ArrowUp']
      : orientation === 'horizontal'
        ? ['ArrowLeft']
        : ['ArrowUp', 'ArrowLeft']
  const nextKeys =
    orientation === 'vertical'
      ? ['ArrowDown']
      : orientation === 'horizontal'
        ? ['ArrowRight']
        : ['ArrowDown', 'ArrowRight']

  const isPrev = prevKeys.includes(event.key)
  const isNext = nextKeys.includes(event.key)
  const isEdge = event.key === 'Home' || event.key === 'End'
  if (!isPrev && !isNext && !isEdge) return

  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(`[role="${itemRole}"]`)
  )
  if (buttons.length === 0) return

  const selectedAttr = itemRole === 'radio' ? 'aria-checked' : 'aria-selected'
  const currentIndex = buttons.findIndex((b) => b.getAttribute(selectedAttr) === 'true')
  const from = currentIndex === -1 ? 0 : currentIndex

  let next = from
  if (isNext) next = (from + 1) % buttons.length
  else if (isPrev) next = (from - 1 + buttons.length) % buttons.length
  else if (event.key === 'Home') next = 0
  else next = buttons.length - 1

  event.preventDefault()
  buttons[next]?.focus()
  buttons[next]?.click()
}
