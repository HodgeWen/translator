import React, { useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import '@/assets/styles.css'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useDarkMode } from '@/hooks/use-dark-mode'
import { Toast } from '@/components/ui/toast'
import { Select } from '@/components/ui/select'
import { PopupTranslationResult } from '@/components/popup/translation-result'
import type {
  GlobalSettings,
  TranslationResponse,
  ImageTranslationResult,
  LangCode,
  TranslationTone,
  ContentMessage
} from '@/types'
import { getSettings, saveSettings } from '@/lib/storage'
import { sendBgMessage } from '@/lib/messaging'
import { detectLanguageLocal, isSameLanguage } from '@/lib/lang-detect'
import {
  LOCAL_IMAGE_ACCEPT,
  imageTranslationErrorKey,
  localImageFileErrorKey,
  readImageFileAsDataUrl,
  resolveLocalImageTargetLang,
  validateLocalImageFile
} from '@/lib/image-translate/local-image'
import { ImageTranslationError } from '@/lib/image-translate/types'
import { BgMessageError } from '@/lib/messaging'
import { LANGUAGE_OPTIONS } from '@/lib/languages'
import { t, setUILanguage } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import { Send, Loader2, Settings, Layers, Languages, Square, ImagePlus, X } from 'lucide-react'
import { LogoIcon } from '@/components/logo-icon'

const TARGET_AUTO = 'auto' as const
type TargetSelection = typeof TARGET_AUTO | LangCode

interface SelectedImage {
  previewUrl: string
  dataUrl: string
  name: string
}

// 根据检测结果决定翻译方向：母语→第二语言，外语→母语
function resolveAutoTargetLang(
  detectedLang: LangCode | null,
  nativeLanguage: LangCode,
  secondLanguage: LangCode
): LangCode {
  if (detectedLang && isSameLanguage(detectedLang, nativeLanguage)) {
    return secondLanguage
  }
  return nativeLanguage
}

function App() {
  const { toast, showSuccess, showError, dismiss } = useToast()
  const [settings, setSettings] = useState<GlobalSettings | null>(null)
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState('')
  const [resultMeta, setResultMeta] = useState<{
    providerName?: string
    modelName?: string
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [langVersion, setLangVersion] = useState(0)
  const [currentTone, setCurrentTone] = useState<TranslationTone>('normal')
  const [targetLangPreview, setTargetLangPreview] = useState<LangCode>('zh-CN')
  const [manualTarget, setManualTarget] = useState<TargetSelection>(TARGET_AUTO)
  // 页面翻译开关态由 popup 本地维护：点击即切换，成功送达 content script 后翻转
  const [pageTranslating, setPageTranslating] = useState(false)
  // 图片翻译与文本翻译共用输入框：粘贴/上传图片后暂存于此，翻译时优先于文本
  const [image, setImage] = useState<SelectedImage | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const detectSeqRef = useRef(0)

  useEffect(() => {
    loadSettingsData()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 30)

    return () => clearTimeout(timer)
  }, [])

  useDarkMode()

  useEffect(() => {
    if (!settings) return
    if (manualTarget !== TARGET_AUTO) {
      setTargetLangPreview(manualTarget)
      return
    }
    const trimmed = inputText.trim()
    if (!trimmed) {
      setTargetLangPreview(settings.nativeLanguage)
      return
    }
    const seq = ++detectSeqRef.current
    const timer = window.setTimeout(async () => {
      const detected = await detectLanguageLocal(trimmed)
      if (seq === detectSeqRef.current) {
        setTargetLangPreview(resolveAutoTargetLang(detected, settings.nativeLanguage, settings.secondLanguage))
      }
    }, 200)
    return () => window.clearTimeout(timer)
  }, [inputText, settings, manualTarget])

  const loadSettingsData = async () => {
    try {
      const s = await getSettings()
      await setUILanguage(s.uiLanguage)
      setSettings(s)
      setTargetLangPreview(s.nativeLanguage)
      setLangVersion((v) => v + 1)
      setCurrentTone(s.translationTone)
    } catch {
      showError(t('error_load_settings'))
    }
  }

  // 图片被替换或清除时释放旧的 object URL
  useEffect(() => {
    if (!image) return
    return () => {
      URL.revokeObjectURL(image.previewUrl)
    }
  }, [image])

  const showImageFailure = (failure: unknown) => {
    if (failure instanceof BgMessageError || failure instanceof ImageTranslationError) {
      showError(t(imageTranslationErrorKey(failure.code)))
    } else {
      showError(failure instanceof Error ? failure.message : t('error_translation_failed'))
    }
  }

  const translateImageAndShow = async (dataUrl: string) => {
    if (!settings) return
    const targetLang = resolveLocalImageTargetLang(
      manualTarget,
      targetLangPreview,
      settings.nativeLanguage
    )
    setTargetLangPreview(targetLang)
    const response = await sendBgMessage<ImageTranslationResult>({
      type: 'IMAGE_TRANSLATE',
      payload: { dataUrl, targetLang }
    })
    const provider = settings.providers.find((p) => p.id === response.providerId)
    const model = provider?.models.find((m) => m.id === response.modelId)
    setResultMeta({
      providerName: provider?.name ?? response.providerId,
      modelName: model?.name ?? response.modelId
    })
    setResult(response.text)
  }

  const handleImageFile = async (file: File) => {
    if (!settings) return
    const validation = validateLocalImageFile(file)
    if (validation) {
      showError(t(localImageFileErrorKey(validation)))
      return
    }

    setLoading(true)
    setResult('')
    setResultMeta(null)
    try {
      const dataUrl = await readImageFileAsDataUrl(file)
      setInputText('')
      setImage({ previewUrl: URL.createObjectURL(file), dataUrl, name: file.name })
      await translateImageAndShow(dataUrl)
    } catch (failure) {
      showImageFailure(failure)
    } finally {
      setLoading(false)
    }
  }

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void handleImageFile(file)
  }

  const clearImage = () => {
    setImage(null)
    setResult('')
    setResultMeta(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const handleTogglePageTranslation = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        showError(t('popup_page_translation_unavailable'))
        return
      }
      const message: ContentMessage = {
        type: pageTranslating ? 'STOP_TRANSLATION' : 'START_TRANSLATION'
      }
      // tabs.sendMessage 默认送达该 tab 的所有 frame，iframe 内同步生效
      await chrome.tabs.sendMessage(tab.id, message)
      setPageTranslating(!pageTranslating)
    } catch {
      // 内容脚本未注入（浏览器内置页面、扩展商店页等）
      showError(t('popup_page_translation_unavailable'))
    }
  }

  const handleServiceChange = async (serviceId: string) => {
    if (!settings) return
    const newSettings = { ...settings, selectedServiceId: serviceId }
    setSettings(newSettings)
    await saveSettings(newSettings)
  }

  const handleTranslate = async (textOverride?: string) => {
    // 有图片时优先翻译图片；粘贴文本带 textOverride 的场景仍走文本链路
    if (!textOverride && image) {
      setLoading(true)
      setResult('')
      setResultMeta(null)
      try {
        await translateImageAndShow(image.dataUrl)
      } catch (failure) {
        showImageFailure(failure)
      } finally {
        setLoading(false)
      }
      return
    }

    const text = textOverride ?? inputText
    if (!text.trim()) return
    if (!settings) return
    setLoading(true)
    setResult('')
    setResultMeta(null)

    try {
      const trimmed = text.trim()
      let targetLang: LangCode
      if (manualTarget !== TARGET_AUTO) {
        targetLang = manualTarget
      } else {
        const detected = await detectLanguageLocal(trimmed)
        targetLang = resolveAutoTargetLang(detected, settings.nativeLanguage, settings.secondLanguage)
      }
      setTargetLangPreview(targetLang)
      const response = await sendBgMessage<TranslationResponse>({
        type: 'TRANSLATE',
        payload: {
          text: trimmed,
          targetLang,
          enablePolysemy: true,
        }
      })

      const provider = settings.providers.find((p) => p.id === response.providerId)
      const model = provider?.models.find((m) => m.id === response.modelId)
      setResultMeta({
        providerName: provider?.name ?? response.providerId,
        modelName: model?.name ?? response.modelId,
        usage: response.usage
      })
      setResult(response.text)
    } catch (err) {
      showError(err instanceof Error ? err.message : t('error_translation_failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    showSuccess(t('popup_copied'))
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardItems = Array.from(e.clipboardData?.items ?? [])
    const clipboardFile =
      clipboardItems.find((item) => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile() ??
      Array.from(e.clipboardData?.files ?? []).find((file) => file.type.startsWith('image/'))
    if (clipboardFile) {
      e.preventDefault()
      void handleImageFile(clipboardFile)
      return
    }

    window.setTimeout(() => {
      const val = e.currentTarget.value
      if (val.trim()) handleTranslate(val)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTranslate()
    }
  }

  const toneOptions: Array<{ value: string; label: string }> = [
    { value: 'normal', label: t('tone_normal') },
    { value: 'technical', label: t('tone_technical') },
    { value: 'tech_forward', label: t('tone_tech_forward') },
    { value: 'humorous', label: t('tone_humorous') },
    { value: 'literary', label: t('tone_literary') },
    { value: 'formal', label: t('tone_formal') },
    { value: 'colloquial', label: t('tone_colloquial') },
    ...(settings?.customTones.map(ct => ({ value: ct.id, label: ct.name })) ?? [])
  ]

  const handleToneChange = async (tone: string) => {
    if (!settings) return
    setCurrentTone(tone as TranslationTone)
    const newSettings = { ...settings, translationTone: tone as TranslationTone }
    setSettings(newSettings)
    await saveSettings(newSettings)
  }

  if (!settings) return null

  const activeServiceId = settings.selectedServiceId || (settings.services[0]?.id ?? '')
  const activeService = settings.services.find((s) => s.id === activeServiceId) || settings.services[0]

  const handleModelChange = async (modelId: string) => {
    if (!settings || !activeService || activeService.type !== 'single') return
    const updatedServices = settings.services.map((s) => {
      if (s.id === activeService.id) {
        return { ...s, modelId }
      }
      return s
    })
    const newSettings = { ...settings, services: updatedServices }
    setSettings(newSettings)
    await saveSettings(newSettings)
  }

  return (
    <div className="w-[450px] bg-background text-foreground flex flex-col" key={langVersion}>
      <Toast toast={toast} onDismiss={dismiss} />

      {/* Header */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-gradient-to-r from-indigo-500/5 to-violet-500/5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <LogoIcon className="h-3.5 w-3.5 text-white" />
          </div>
          <h1 className="text-base font-semibold tracking-tight">{t('extName')}</h1>
          <span className="text-[10px] text-muted-foreground/60 font-mono">v{chrome.runtime.getManifest().version}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={pageTranslating ? 'outline' : 'secondary'}
            size="sm"
            className="h-7 shrink-0 gap-1 px-2.5 text-xs"
            onClick={handleTogglePageTranslation}
            title={pageTranslating ? t('popup_stop_translation') : t('popup_translate_page')}
          >
            {pageTranslating ? (
              <Square className="fill-current text-red-500" />
            ) : (
              <Languages className="text-indigo-500" />
            )}
            {pageTranslating ? t('popup_stop_translation') : t('popup_translate_page')}
          </Button>
          <Select
            value={currentTone}
            options={toneOptions}
            onChange={handleToneChange}
            className="w-[100px]"
            compact
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => chrome.runtime.openOptionsPage()}
            title={t('popup_open_settings')}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Service & Model Selector Row */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-3 bg-muted/10">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
          <Layers className="h-3.5 w-3.5 text-indigo-500" />
          服务:
        </span>
        <Select
          value={activeServiceId}
          options={settings.services.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.type === 'pool' ? '翻译池' : '单提供商'})`
          }))}
          onChange={handleServiceChange}
          placeholder="选择翻译服务"
          className="flex-1 min-w-0"
          compact
        />
        {activeService && activeService.type === 'single' && (
          <>
            <span className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              模型:
            </span>
            <Select
              value={activeService.modelId}
              options={settings.providers.find(p => p.id === activeService.providerId)?.models.map(m => ({ value: m.id, label: m.name })) || []}
              onChange={handleModelChange}
              placeholder="选择模型"
              className="flex-1 min-w-0"
              compact
            />
          </>
        )}
        {activeService && activeService.type === 'pool' && (
          <span className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            翻译池
          </span>
        )}
      </div>

      {/* Target Language Hint */}
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
            onChange={(v) => setManualTarget(v as TargetSelection)}
            className="w-[150px] shrink-0"
          />
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 ml-[18px]">
          {manualTarget === TARGET_AUTO
            ? t('popup_auto_detect_hint')
            : t('popup_manual_override_hint')}
        </div>
      </div>

      {/* Input Area */}
      <div className="px-4 py-2 flex-1 flex flex-col gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept={LOCAL_IMAGE_ACCEPT}
          className="hidden"
          onChange={handleImageInputChange}
        />

        <Textarea
          ref={textareaRef}
          autoFocus
          placeholder={t('popup_placeholder')}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value)
            // 输入文本即放弃已选图片，保持「一次只有一个翻译对象」
            if (e.target.value) clearImage()
          }}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
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
              onClick={clearImage}
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
          <Button
            onClick={() => handleTranslate()}
            disabled={loading || (!inputText.trim() && !image)}
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

        <PopupTranslationResult
          result={result}
          onCopy={handleCopy}
          providerName={resultMeta?.providerName}
          modelName={resultMeta?.modelName}
          usage={resultMeta?.usage}
        />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
