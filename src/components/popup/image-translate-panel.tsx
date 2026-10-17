import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { AlertCircle, ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { BgMessageError, sendBgMessage } from '@/lib/messaging'
import {
  LOCAL_IMAGE_ACCEPT,
  imageTranslationErrorKey,
  localImageFileErrorKey,
  validateLocalImageFile
} from '@/lib/image-translate/local-image'
import { assertImageEdgeLimit } from '@/lib/image-translate/image-processing'
import { ImageTranslationError } from '@/lib/image-translate/types'
import type { ImageTranslationResult, LangCode } from '@/types'
import { ImageTranslatePreview, ImageTranslateToolbar } from './image-translate-preview'

interface ImageTranslatePanelProps {
  targetLang: LangCode
  onError: (message: string) => void
}

interface SelectedImage {
  previewUrl: string
  dataUrl: string
  width: number
  height: number
  name: string
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new ImageTranslationError('IMAGE_DECODE_FAILED', 'Image could not be read'))
      }
    }
    reader.onerror = () => {
      reject(new ImageTranslationError('IMAGE_DECODE_FAILED', 'Image could not be read'))
    }
    reader.readAsDataURL(file)
  })
}

function readImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      reject(new ImageTranslationError('IMAGE_DECODE_FAILED', 'Image could not be decoded'))
    }
    image.src = src
  })
}

/**
 * popup 本地图片翻译面板：文件选择/拖拽/粘贴 → 校验 → data URL 请求
 * background → 原图上覆盖译文。不提供下载/复制图片入口。
 */
export function ImageTranslatePanel({ targetLang, onError }: ImageTranslatePanelProps) {
  const [selected, setSelected] = useState<SelectedImage | null>(null)
  const [result, setResult] = useState<ImageTranslationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedRef = useRef<SelectedImage | null>(null)
  const requestSeqRef = useRef(0)
  const dragDepthRef = useRef(0)

  const replaceSelectedImage = useCallback((next: SelectedImage | null) => {
    const previous = selectedRef.current
    if (previous && previous.previewUrl !== next?.previewUrl) {
      URL.revokeObjectURL(previous.previewUrl)
    }
    selectedRef.current = next
    setSelected(next)
  }, [])

  useEffect(() => {
    return () => {
      requestSeqRef.current += 1
      if (selectedRef.current) {
        URL.revokeObjectURL(selectedRef.current.previewUrl)
        selectedRef.current = null
      }
    }
  }, [])

  const notifyError = useCallback(
    (message: string) => {
      setError(message)
      onError(message)
    },
    [onError]
  )

  const showFailure = useCallback(
    (failure: unknown) => {
      let key = 'error_image_load_failed'
      if (failure instanceof ImageTranslationError) {
        key = imageTranslationErrorKey(failure.code)
      } else if (failure instanceof BgMessageError) {
        key = imageTranslationErrorKey(failure.code)
      }
      notifyError(t(key))
    },
    [notifyError]
  )

  const requestAndShow = useCallback(
    async (dataUrl: string, runId: number) => {
      try {
        const response = await sendBgMessage<ImageTranslationResult>({
          type: 'IMAGE_TRANSLATE',
          payload: { kind: 'dataUrl', dataUrl, targetLang }
        })
        if (runId !== requestSeqRef.current) return
        setResult(response)
        setShowTranslation(true)
      } catch (failure) {
        if (runId !== requestSeqRef.current) return
        setResult(null)
        showFailure(failure)
      }
    },
    [showFailure, targetLang]
  )

  const handleFile = useCallback(
    async (file: File) => {
      const validation = validateLocalImageFile(file)
      if (validation) {
        notifyError(t(localImageFileErrorKey(validation)))
        return
      }

      const runId = ++requestSeqRef.current
      setLoading(true)
      setError(null)

      const previewUrl = URL.createObjectURL(file)
      try {
        const { width, height } = await readImageSize(previewUrl)
        assertImageEdgeLimit(width, height)
        const dataUrl = await readFileAsDataUrl(file)

        if (runId !== requestSeqRef.current) {
          URL.revokeObjectURL(previewUrl)
          return
        }

        replaceSelectedImage({ previewUrl, dataUrl, width, height, name: file.name })
        setResult(null)
        setShowTranslation(true)

        await requestAndShow(dataUrl, runId)
      } catch (failure) {
        URL.revokeObjectURL(previewUrl)
        if (runId !== requestSeqRef.current) return
        showFailure(failure)
      } finally {
        if (runId === requestSeqRef.current) setLoading(false)
      }
    },
    [notifyError, replaceSelectedImage, requestAndShow, showFailure]
  )

  const handleRetry = useCallback(() => {
    if (!selected) {
      inputRef.current?.click()
      return
    }
    const runId = ++requestSeqRef.current
    setLoading(true)
    setError(null)
    setResult(null)
    setShowTranslation(true)
    void requestAndShow(selected.dataUrl, runId).finally(() => {
      if (runId === requestSeqRef.current) setLoading(false)
    })
  }, [requestAndShow, selected])

  const handleClose = useCallback(() => {
    requestSeqRef.current += 1
    replaceSelectedImage(null)
    setResult(null)
    setShowTranslation(true)
    setError(null)
    setLoading(false)
    setDragging(false)
    dragDepthRef.current = 0
    if (inputRef.current) inputRef.current.value = ''
  }, [replaceSelectedImage])

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = Array.from(event.clipboardData?.items ?? [])
      const clipboardFile =
        items.find((item) => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile() ??
        Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith('image/'))

      if (clipboardFile) {
        event.preventDefault()
        void handleFile(clipboardFile)
        return
      }

      const files = Array.from(event.clipboardData?.files ?? [])
      if (files.length > 0) {
        event.preventDefault()
        notifyError(t('error_image_invalid_format'))
        return
      }

      const text = event.clipboardData?.getData('text/plain') ?? ''
      if (!text.trim()) {
        notifyError(t('error_image_clipboard_empty'))
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handleFile, notifyError])

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void handleFile(file)
  }

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepthRef.current += 1
    setDragging(true)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDragLeave = () => {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepthRef.current = 0
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  return (
    <div
      className="flex flex-col gap-2"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={LOCAL_IMAGE_ACCEPT}
        className="hidden"
        onChange={handleInputChange}
      />

      {selected ? (
        <div className="flex flex-col gap-2">
          <ImageTranslatePreview
            src={selected.previewUrl}
            width={selected.width}
            height={selected.height}
            blocks={result?.blocks ?? []}
            showTranslation={showTranslation}
            loading={loading}
          >
            {result && !loading && (
              <ImageTranslateToolbar
                showTranslation={showTranslation}
                onChangeView={setShowTranslation}
                onClose={handleClose}
              />
            )}
          </ImageTranslatePreview>

          <div className="flex items-center gap-2">
            <span className="min-w-0 truncate text-[10px] text-muted-foreground">
              {selected.name}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto h-7 shrink-0"
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {t('popup_image_replace')}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center transition-colors',
            dragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-border bg-muted/20 hover:border-indigo-400 hover:bg-accent/40',
            loading && 'pointer-events-none opacity-70'
          )}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          ) : (
            <ImagePlus className="h-6 w-6 text-indigo-500" />
          )}
          <span className="text-xs font-medium text-foreground">
            {loading ? t('image_translate_loading') : t('popup_image_drop_hint')}
          </span>
          {!loading && (
            <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
              {t('popup_image_select_file')}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{t('popup_image_file_types')}</span>
        </button>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="shrink-0 font-medium underline underline-offset-2"
          >
            {t('btn_retry')}
          </button>
        </div>
      )}
    </div>
  )
}
