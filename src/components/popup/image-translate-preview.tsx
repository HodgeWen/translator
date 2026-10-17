import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { boxToPercentRect, fitFontSize, pickContrastColor } from '@/lib/image-translate/layout'
import type { ImageTranslationBlock } from '@/types'

interface ImageTranslatePreviewProps {
  src: string
  width: number
  height: number
  blocks: ImageTranslationBlock[]
  showTranslation: boolean
  loading: boolean
  children?: ReactNode
}

/**
 * 原图 + 覆盖层。覆盖块全部用归一化坐标换算成百分比，
 * 字号按当前渲染尺寸计算，保证不改变图片本身的尺寸与布局。
 */
export function ImageTranslatePreview({
  src,
  width,
  height,
  blocks,
  showTranslation,
  loading,
  children
}: ImageTranslatePreviewProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const image = imageRef.current
    if (!image) return

    const updateSize = () => {
      const rect = image.getBoundingClientRect()
      setRenderSize({ width: rect.width, height: rect.height })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(image)
    return () => observer.disconnect()
  }, [src])

  return (
    <div className="relative inline-block overflow-hidden rounded-md border border-border bg-muted/30">
      <img
        ref={imageRef}
        src={src}
        width={width}
        height={height}
        alt={t('popup_image_translate')}
        className="block h-auto max-h-[300px] w-auto max-w-full select-none"
      />

      {showTranslation &&
        !loading &&
        blocks.map((block, index) => {
          const text = block.translatedText ?? ''
          if (!text.trim()) return null
          const rect = boxToPercentRect(block.box)
          const fontSize = fitFontSize(
            text,
            renderSize.width * block.box.w,
            renderSize.height * block.box.h,
            { minFontSize: 8, maxFontSize: 20, lineHeightRatio: 1.1 }
          )

          return (
            <div
              key={`${block.box.x}-${block.box.y}-${index}`}
              className="absolute flex items-center justify-center overflow-hidden px-0.5 text-center"
              style={{
                ...rect,
                backgroundColor: block.bgColor,
                color: pickContrastColor(block.bgColor),
                fontSize,
                lineHeight: 1.1,
                wordBreak: 'break-word'
              }}
            >
              {text}
            </div>
          )
        })}

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/75 px-4 text-center backdrop-blur-[1px]">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          <span className="text-xs font-medium text-muted-foreground">
            {t('image_translate_loading')}
          </span>
        </div>
      )}

      {children}
    </div>
  )
}

interface ImageTranslateToolbarProps {
  showTranslation: boolean
  onChangeView: (showTranslation: boolean) => void
  onClose: () => void
  className?: string
}

/** 图片角落工具条：原文/译文切换 + 关闭 */
export function ImageTranslateToolbar({
  showTranslation,
  onChangeView,
  onClose,
  className
}: ImageTranslateToolbarProps) {
  return (
    <div
      className={cn(
        'absolute right-2 top-2 flex items-center gap-0.5 rounded-md border border-border/70 bg-background/90 p-0.5 shadow-sm backdrop-blur',
        className
      )}
    >
      <button
        type="button"
        aria-pressed={!showTranslation}
        onClick={() => onChangeView(false)}
        className={cn(
          'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
          !showTranslation
            ? 'bg-indigo-600 text-white'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        {t('image_toolbar_original')}
      </button>
      <button
        type="button"
        aria-pressed={showTranslation}
        onClick={() => onChangeView(true)}
        className={cn(
          'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
          showTranslation
            ? 'bg-indigo-600 text-white'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        {t('image_toolbar_translation')}
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('image_toolbar_close')}
        className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {t('image_toolbar_close')}
      </button>
    </div>
  )
}
