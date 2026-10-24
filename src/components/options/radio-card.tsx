import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * 设置页的单选卡片（role="radio"）。
 *
 * 抽成共享组件的依据：显示设置里「展示样式」「翻译语气」「加载主题」三组单选卡片
 * 一共 7 个，每个都重复了同一套「role/tabIndex/aria-checked + 选中态类名 + 圆点指示器」
 * 结构（选中态类名逐字相同）。此前调一处配色要改 7 遍。
 *
 * 无障碍语义与原先手写版本完全一致：
 * - role="radio" + aria-checked 表达单选状态；
 * - 漫游 tabindex（组内只有一个 0），方向键由外层 radiogroup 的 handleRovingKeyDown 处理；
 * - 圆点指示器为纯装饰，不参与无障碍树。
 */
interface RadioCardProps {
  checked: boolean
  onSelect: () => void
  title: ReactNode
  description?: ReactNode
  /** 右侧附加内容（如加载主题的色块预览） */
  trailing?: ReactNode
  /** 选中态主色，默认 indigo；语气分组原本用 purple */
  accent?: 'indigo' | 'purple'
  /** 是否渲染左侧圆点指示器；主题卡片原本没有圆点，改用色块 */
  showDot?: boolean
  /**
   * 两种既有卡片形态，类名逐字对应原手写版本，避免视觉回归：
   * - 'override'：p-4 + 选中 /20 淡底 + shadow-sm + 描述 mt-0.5（展示样式/语气两组「覆盖」卡）
   * - 'option'：px-4 py-3 + 选中 /50 底 + 无阴影 + 描述 mt-1（样式、主题、语气列表）
   */
  variant?: 'override' | 'option'
  /** 过渡类覆盖；主题卡片原本是 transition-all duration-200，其余为 transition-colors */
  transitionClass?: string
  /** 描述行附加类；主题卡原本带 leading-relaxed */
  descriptionClass?: string
}

const ACCENT_CLASS = {
  indigo: {
    override:
      'border-indigo-500 bg-indigo-50/20 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 ring-1 ring-indigo-500/20 shadow-sm',
    option:
      'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 ring-1 ring-indigo-500/20',
    dot: 'border-indigo-500 bg-indigo-500 text-white'
  },
  purple: {
    override:
      'border-purple-500 bg-purple-50/20 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300 ring-1 ring-purple-500/20 shadow-sm',
    option:
      'border-purple-500 bg-purple-50/50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 ring-1 ring-purple-500/20',
    dot: 'border-purple-500 bg-purple-500 text-white'
  }
} as const

export function RadioCard({
  checked,
  onSelect,
  title,
  description,
  trailing,
  accent = 'indigo',
  showDot = true,
  variant = 'option',
  transitionClass,
  descriptionClass
}: RadioCardProps) {
  const palette = ACCENT_CLASS[accent]
  const isOverride = variant === 'override'
  // 覆盖卡原本是 p-4 + transition-all duration-200；选项卡是 px-4 py-3 + transition-colors
  const boxClass = isOverride ? 'p-4' : 'px-4 py-3'
  const motionClass = transitionClass ?? (isOverride ? 'transition-all duration-200' : 'transition-colors')
  const descriptionGap = isOverride ? 'mt-0.5' : 'mt-1'

  return (
    <button
      type="button"
      role="radio"
      tabIndex={checked ? 0 : -1}
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'rounded-md border text-left text-sm cursor-pointer',
        boxClass,
        motionClass,
        // 覆盖卡原本没有 bg-background，选项卡有
        !isOverride && 'bg-background',
        'flex items-center justify-between gap-4',
        checked ? palette[variant] : 'border-border hover:bg-accent/50'
      )}
    >
      <div className="flex items-center gap-3">
        {showDot && (
          <div
            className={cn(
              'h-4 w-4 rounded-full border flex items-center justify-center shrink-0',
              checked ? palette.dot : 'border-muted-foreground/60'
            )}
          >
            {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </div>
        )}
        <div>
          <div className="font-semibold">{title}</div>
          {description ? (
            <div className={cn('text-xs text-muted-foreground', descriptionGap, descriptionClass)}>
              {description}
            </div>
          ) : null}
        </div>
      </div>
      {trailing}
    </button>
  )
}
