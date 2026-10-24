import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface SwitchProps {
  /** 允许 undefined：与历史手写实现一致（未设置时既不高亮也不声明 aria-checked） */
  checked?: boolean
  onChange: (checked: boolean) => void
  /** 外部可见标签的 id：作为开关的无障碍名称 */
  labelledBy?: string
  /** 无可见标签时的无障碍名称；有 labelledBy 时仅补充开/关状态 */
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

/**
 * 开关控件（role="switch"）。
 *
 * 抽成共享组件的原因：设置页有 4 处完全相同的手写开关
 * （服务 Fallback、多义词、聚合开关、流式响应），
 * 每处都重复一遍「role/aria-checked/aria-labelledby/aria-label + 轨道 + 滑块」结构，
 * 任何 a11y 修正都要改 4 份，容易漏改。
 *
 * 无障碍约定与原先手写版本一致：
 * - role="switch" + aria-checked 表达开关语义；
 * - aria-labelledby 指向外部可见标签，aria-label 补充「已开启/已关闭」；
 * - 不叠加 aria-disabled，禁用语义交给原生 disabled。
 */
export function Switch({
  checked,
  onChange,
  labelledBy,
  ariaLabel,
  disabled = false,
  className
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={ariaLabel ?? (checked ? t('a11y_toggle_on') : t('a11y_toggle_off'))}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-indigo-500' : 'bg-muted',
        className
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

/** 供「标签 + 描述 + 开关」这一行结构复用：左侧文字、右侧控件 */
export function SwitchRow({
  labelId,
  label,
  description,
  children,
  className
}: {
  labelId: string
  label: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <div id={labelId} className="text-sm font-medium">
          {label}
        </div>
        {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
      </div>
      {children}
    </div>
  )
}
