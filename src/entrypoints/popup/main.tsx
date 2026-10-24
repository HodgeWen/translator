import React, { useState, useEffect, useReducer, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import '@/assets/styles.css'
import { useDarkMode } from '@/hooks/use-dark-mode'
import { Toast } from '@/components/ui/toast'
import { PopupTranslationResult, localizeTranslationError } from '@/components/popup/translation-result'
import { PopupHeader } from '@/components/popup/popup-header'
import { PopupServiceSelector } from '@/components/popup/popup-service-selector'
import { PopupInputArea } from '@/components/popup/popup-input-area'
import { TARGET_AUTO, resolveAutoTargetLang, type TargetSelection, type SelectedImage } from '@/components/popup/popup-shared'
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
import { detectLanguageLocal } from '@/lib/lang-detect'
import {
  imageTranslationErrorKey,
  localImageFileErrorKey,
  readImageFileAsDataUrl,
  resolveLocalImageTargetLang,
  validateLocalImageFile
} from '@/lib/image-translate/local-image'
import { ImageTranslationError } from '@/lib/image-translate/types'
import { BgMessageError } from '@/lib/messaging'
import { t, setUILanguage } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'

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
  // 语言切换后强制重渲染（不卸载子树，避免丢失正在输入的草稿）。
  // 与 options/main.tsx 保持同一方案：t() 是普通函数而非 hook，语言包加载完成后
  // 必须触发一次 re-render 才能让文案重新求值；用 key 重挂载会清空输入框与结果。
  const [, forceLangRender] = useReducer((n: number) => n + 1, 0)
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
  // 翻译失败的内联错误：用 role="alert" 呈现，比 toast 更利于键盘/读屏用户
  const [error, setError] = useState<{ text: string; retryable: boolean } | null>(null)
  // 请求序号：快速连续操作时用它丢弃过期响应，防止旧结果覆盖新结果
  const requestSeqRef = useRef(0)
  // 最近一次翻译的文本入参，供「重试」复用；undefined 表示走图片链路
  const lastAttemptRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    loadSettingsData()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 30)

    return () => clearTimeout(timer)
  }, [])

  // 与设置页共用同一份配色偏好：settings 尚未加载时先跟随系统，避免闪烁成错误配色
  useDarkMode(settings?.colorScheme ?? 'system')

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
      forceLangRender()
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

  // 图片链路的错误码更具体（NO_VISION_MODEL 等），优先用图片映射；
  // 映射不到时回落到通用的翻译错误本地化，避免把英文原文甩给用户。
  const localizeImageFailure = (failure: unknown): string => {
    if (failure instanceof ImageTranslationError) {
      return t(imageTranslationErrorKey(failure.code))
    }
    if (failure instanceof BgMessageError) {
      const key = imageTranslationErrorKey(failure.code)
      return key === 'error_translation_failed' ? localizeTranslationError(failure) : t(key)
    }
    return localizeTranslationError(failure)
  }

  // 只在响应仍是最新一次请求时才允许写 UI：取消或新请求会自增序号，
  // 在途的旧响应随之失效（真正的网络 abort 待 api.ts 暴露 signal 后再接线）。
  const isCurrent = (seq: number) => seq === requestSeqRef.current

  const translateImageAndShow = async (dataUrl: string, seq: number) => {
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
    if (!isCurrent(seq)) return
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

    const seq = ++requestSeqRef.current
    // 图片链路的重试目标就是当前图片，故清空文本入参
    lastAttemptRef.current = undefined
    setLoading(true)
    setError(null)
    setResult('')
    setResultMeta(null)
    try {
      const dataUrl = await readImageFileAsDataUrl(file)
      if (!isCurrent(seq)) return
      setInputText('')
      setImage({ previewUrl: URL.createObjectURL(file), dataUrl, name: file.name })
      await translateImageAndShow(dataUrl, seq)
    } catch (failure) {
      if (!isCurrent(seq)) return
      setError({ text: localizeImageFailure(failure), retryable: true })
    } finally {
      if (isCurrent(seq)) setLoading(false)
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
      const seq = ++requestSeqRef.current
      lastAttemptRef.current = undefined
      setLoading(true)
      setError(null)
      setResult('')
      setResultMeta(null)
      try {
        await translateImageAndShow(image.dataUrl, seq)
      } catch (failure) {
        if (!isCurrent(seq)) return
        setError({ text: localizeImageFailure(failure), retryable: true })
      } finally {
        if (isCurrent(seq)) setLoading(false)
      }
      return
    }

    const text = textOverride ?? inputText
    if (!text.trim()) return
    if (!settings) return
    const seq = ++requestSeqRef.current
    lastAttemptRef.current = text
    setLoading(true)
    setError(null)
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
      if (!isCurrent(seq)) return
      setTargetLangPreview(targetLang)
      const response = await sendBgMessage<TranslationResponse>({
        type: 'TRANSLATE',
        payload: {
          text: trimmed,
          targetLang,
          enablePolysemy: true,
        }
      })
      if (!isCurrent(seq)) return

      const provider = settings.providers.find((p) => p.id === response.providerId)
      const model = provider?.models.find((m) => m.id === response.modelId)
      setResultMeta({
        providerName: provider?.name ?? response.providerId,
        modelName: model?.name ?? response.modelId,
        usage: response.usage
      })
      setResult(response.text)
    } catch (err) {
      if (!isCurrent(seq)) return
      setError({ text: localizeTranslationError(err), retryable: true })
    } finally {
      if (isCurrent(seq)) setLoading(false)
    }
  }

  /**
   * 取消正在进行的翻译。
   * 实现是「本地作废」：自增请求序号让在途响应全部失效，并立即解除 loading 态。
   * 后台请求本身仍会跑完（api.ts 尚未接受外部 signal），后续可在 sendBgMessage
   * 增加 signal 参数后，在这里同时 abort 真正的网络请求。
   */
  const handleCancel = () => {
    requestSeqRef.current += 1
    setLoading(false)
    setError({ text: t('error_request_aborted'), retryable: true })
  }

  // 重试：复用上一次的文本入参（或当前图片），把交互成本降到一次点击
  const handleRetry = () => {
    if (lastAttemptRef.current !== undefined) {
      void handleTranslate(lastAttemptRef.current)
      return
    }
    void handleTranslate()
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

    // React 事件派发结束（executeDispatch 的 finally）会把 currentTarget 置为 null，
    // 因此这里不能读 e.currentTarget；改用 ref 拿 textarea 的最新值。
    // 仍需 setTimeout：默认粘贴动作在事件处理返回后才把内容写进 textarea，
    // 同步读取只能拿到粘贴前的旧值。
    window.setTimeout(() => {
      const val = textareaRef.current?.value ?? ''
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
  // 没有任何翻译服务时不渲染空下拉框，改为在输入区位置展示空态引导
  const hasServices = settings.services.length > 0

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
    <div className="w-[450px] max-h-[600px] bg-background text-foreground flex flex-col">
      <Toast toast={toast} onDismiss={dismiss} />

      <PopupHeader
        pageTranslating={pageTranslating}
        onTogglePageTranslation={handleTogglePageTranslation}
        currentTone={currentTone}
        toneOptions={toneOptions}
        onToneChange={handleToneChange}
      />

      {hasServices && (
        <PopupServiceSelector
          settings={settings}
          activeServiceId={activeServiceId}
          activeService={activeService}
          onServiceChange={handleServiceChange}
          onModelChange={handleModelChange}
        />
      )}

      <PopupInputArea
        hasServices={hasServices}
        inputText={inputText}
        image={image}
        loading={loading}
        error={error}
        manualTarget={manualTarget}
        targetLangPreview={targetLangPreview}
        imageInputRef={imageInputRef}
        textareaRef={textareaRef}
        onInputChange={(value) => {
          setInputText(value)
          // 输入文本即放弃已选图片，保持「一次只有一个翻译对象」
          if (value) clearImage()
        }}
        onClearImage={clearImage}
        onImageInputChange={handleImageInputChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onTranslate={() => handleTranslate()}
        onCancel={handleCancel}
        onRetry={handleRetry}
        onDismissError={() => setError(null)}
        onManualTargetChange={setManualTarget}
        result={
          <PopupTranslationResult
            result={result}
            onCopy={handleCopy}
            providerName={resultMeta?.providerName}
            modelName={resultMeta?.modelName}
            usage={resultMeta?.usage}
            loading={loading}
          />
        }
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
