import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsCardProps {
  /** 标题左侧图标（装饰性，应带 aria-hidden） */
  icon: ReactNode
  title: ReactNode
  /** 标题右侧操作区（如「恢复默认」按钮）；不传则只渲染标题 */
  actions?: ReactNode
  /** 卡片内部纵向间距，沿用各分区原有取值 */
  spaceClass?: string
  children: ReactNode
}

/**
 * 设置分区卡片外壳。
 *
 * 抽成共享组件的依据：`rounded-lg border border-border p-6 bg-card` + 「图标 + h3」头部
 * 这一结构在设置页出现 13 次（显示设置 5 处、预设与风格 2 处、通用设置 3 处、
 * 备份恢复 1 处、服务编辑 1 处、用户手册 1 处）。抽出后分区卡片样式只需维护一处。
 *
 * 纯展示组件，不持有任何状态，样式与原手写结构逐字一致。
 */
export function SettingsCard({
  icon,
  title,
  actions,
  spaceClass = 'space-y-6',
  children
}: SettingsCardProps) {
  return (
    <div className={cn('rounded-lg border border-border p-6 bg-card', spaceClass)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}
