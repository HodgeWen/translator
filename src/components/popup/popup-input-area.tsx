import type { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { LogoIcon } from '@/components/logo-icon'
import { t } from '@/lib/i18n'
import { LANGUAGE_OPTIONS } from '@/lib/languages'
import { LOCAL_IMAGE_ACCEPT } from '@/lib/image-translate/local-image'
import type { LangCode } from '@/types'
import { TARGET_AUTO, type SelectedImage, type TargetSelection } from './popup-shared'
import { ImagePlus, X, AlertCircle, Loader2, Send, Square, Settings, Layers } from 'lucide-react'

interface PopupInputAreaProps {
  hasServices: boolean
  inputText: string
  image: SelectedImage | null
  loading: boolean
  error: { text: string; retryable: boolean } | null
  manualTarget: TargetSelection
  targetLangPreview: LangCode
  imageInputRef: RefObject<HTMLInputElement | null>
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onInputChange: (value: string) => void
  onClearImage: () => void
  onImageInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onTranslate: () => void
  onCancel: () => void
  onRetry: () => void
  onDismissError: () => void
  onManualTargetChange: (value: TargetSelection) => void
  result: React.ReactNode
}

/**
 * popup 输入区 + 目标语言行 + 空态引导（从 popup/main.tsx 拆出）。
 * 纯展示组件：翻译状态与请求序号仍由 main.tsx 持有，这里只接收回调。
 */
export function PopupInputArea({
  hasServices,
  inputText,
  image,
  loading,
  error,
  manualTarget,
  targetLangPreview,
  imageInputRef,
  textareaRef,
  onInputChange,
  onClearImage,
  onImageInputChange,
  onPaste,
  onKeyDown,
  onTranslate,
  onCancel,
  onRetry,
  onDismissError,
  onManualTargetChange,
  result
}: PopupInputAreaProps) {
  return (
    <>
      {/* 目标语言提示行 */}
      <div className="px-4 pt-2.5 pb-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 min-w-0">
            <LogoIcon className="h-3 w-3 shrink-0" />
            <span className="truncate font-medium">
              {t('popup_translate_to')}: {targetLangPreview}
            </span>
          </div>
          <Select
            value={manualTarget}
            options={[{ value: TARGET_AUTO, label: t('popup_target_auto') }, ...LANGUAGE_OPTIONS]}
            onChange={(v) => onManualTargetChange(v as TargetSelection)}
            className="w-[150px] shrink-0"
          />
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 ml-[18px]">
          {manualTarget === TARGET_AUTO
            ? t('popup_auto_detect_hint')
            : t('popup_manual_override_hint')}
        </div>
      </div>

      {!hasServices ? (
        // 空态引导：没有服务时下拉框无从选择，直接告诉用户下一步做什么
        <div className="px-4 py-8 flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Layers className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold">{t('popup_no_service_title')}</p>
          <p className="max-w-[300px] text-xs leading-relaxed text-muted-foreground">
            {t('popup_no_service_desc')}
          </p>
          <Button
            className="mt-1 h-8 bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            {t('popup_open_settings')}
          </Button>
        </div>
      ) : (
        <div className="px-4 py-2 flex-1 min-h-0 flex flex-col gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept={LOCAL_IMAGE_ACCEPT}
            className="hidden"
            onChange={onImageInputChange}
          />

          <Textarea
            ref={textareaRef}
            autoFocus
            aria-label={t('popup_placeholder')}
            placeholder={t('popup_placeholder')}
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            className="min-h-[80px] resize-none"
          />

          {image && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5">
              <img
                src={image.previewUrl}
                alt={image.name}
                className="h-10 w-10 shrink-0 rounded object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
                {image.name}
              </span>
              <button
                type="button"
                onClick={onClearImage}
                aria-label={t('popup_image_remove')}
                title={t('popup_image_remove')}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-10 shrink-0"
              onClick={() => imageInputRef.current?.click()}
              disabled={loading}
              title={t('popup_image_translate')}
              aria-label={t('popup_image_translate')}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            {/* 翻译进行中额外给出取消入口：主按钮保持「翻译中…」的等待反馈 */}
            {loading && (
              <Button
                variant="outline"
                onClick={onCancel}
                aria-label={t('btn_cancel')}
                title={t('btn_cancel')}
                className="h-9 shrink-0 gap-1 px-2.5 text-xs"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                {t('btn_cancel')}
              </Button>
            )}
            <Button
              onClick={onTranslate}
              disabled={loading || (!inputText.trim() && !image)}
              aria-label={t('popup_translate')}
              title={t('popup_translate')}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('popup_translating')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('popup_translate')}
                </>
              )}
            </Button>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 break-words max-h-[72px] overflow-y-auto">
                {error.text}
              </span>
              {error.retryable && !loading && (
                <button
                  type="button"
                  onClick={onRetry}
                  aria-label={t('popup_error_retry')}
                  className="shrink-0 rounded px-1.5 py-0.5 font-medium underline-offset-2 hover:bg-destructive/10 hover:underline"
                >
                  {t('popup_error_retry')}
                </button>
              )}
              <button
                type="button"
                onClick={onDismissError}
                aria-label={t('popup_dismiss_error')}
                title={t('popup_dismiss_error')}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-destructive/10"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {result}
        </div>
      )}
    </>
  )
}
