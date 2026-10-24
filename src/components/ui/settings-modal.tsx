import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * 设置页弹窗外壳。
 *
 * 抽成共享组件的依据：推理参数指南弹窗与预设接口地址弹窗的
 * 「遮罩 + 焦点移入/归还 + Esc 关闭 + 关闭按钮 + 底栏关闭按钮」逻辑逐行相同
 * （diff 后除标题、图标与内容区外无差异），两份各约 30 行。
 * 任何焦点或键盘可访问性修正此前都要改两处，容易漏改。
 *
 * 行为与原先一致：
 * - 打开时把焦点移入对话框（setTimeout 0，等 DOM 挂载完）；
 * - 关闭时把焦点归还给触发元素；
 * - Esc 关闭并 stopPropagation，避免连带关闭其它层。
 */
interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  /** 标题栏图标（装饰性，应自带 aria-hidden 或由 lucide 默认处理） */
  icon: React.ReactNode
  title: string
  titleId: string
  /** 内容区最大高度类，两个弹窗原本分别是 85vh / 80vh */
  maxHeightClass: string
  children: React.ReactNode
}

export function SettingsModal({
  isOpen,
  onClose,
  icon,
  title,
  titleId,
  maxHeightClass,
  children
}: SettingsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // 打开时把焦点移入对话框，关闭后归还给触发元素（最小实现，不引入焦点陷阱库）
  useEffect(() => {
    if (!isOpen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const timer = window.setTimeout(() => {
      dialogRef.current?.focus()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      previouslyFocused?.focus?.()
    }
  }, [isOpen])

  // Esc 关闭
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      {/* 遮罩点击关闭 */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col outline-none',
          maxHeightClass
        )}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2">
            {icon}
            <h3 id={titleId} className="text-base font-semibold text-foreground">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t('a11y_close_dialog')}
            className="rounded-full p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容主体 */}
        <div className="flex-1 flex overflow-hidden min-h-[350px]">{children}</div>

        {/* 底部 */}
        <div className="border-t border-border px-6 py-3.5 bg-muted/20 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            {t('preset_urls_modal_close')}
          </Button>
        </div>
      </div>
    </div>
  )
}
