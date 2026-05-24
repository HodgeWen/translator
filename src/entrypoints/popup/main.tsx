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
  LangCode,
  TranslationTone
} from '@/types'
import { getSettings, saveSettings } from '@/lib/storage'
import { sendBgMessage } from '@/lib/messaging'
import { detectLanguage, detectLanguageLocal, shouldSkipTranslation } from '@/lib/lang-detect'
import { LANGUAGE_OPTIONS } from '@/lib/languages'
import { t, setUILanguage } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import { Send, Loader2, Settings, Layers } from 'lucide-react'
import { LogoIcon } from '@/components/logo-icon'

const TARGET_AUTO = 'auto' as const
type TargetSelection = typeof TARGET_AUTO | LangCode

function isLikelyWordOrPhrase(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > 40) return false
  const withoutPunctuation = trimmed.replace(/[.,;:!?。，；：！？\-\/\\]/g, '')
  return withoutPunctuation.length > 0 && !withoutPunctuation.includes(' ')
}

function buildPolysemyPrompt(targetLang: string): string {
  return `Additional instruction: The user input may be a polysemous word or short phrase. If it has multiple distinct common meanings, provide the primary translations for each sense in ${targetLang}, prefixed with a bullet point (•). Include a brief part-of-speech or context hint in parentheses. If there is only one dominant meaning, output the translation directly without bullets.`
}

async function resolveTargetLang(
  text: string,
  settings: GlobalSettings,
  options: { localOnly?: boolean } = {}
): Promise<LangCode> {
  const trimmed = text.trim()
  if (!trimmed) return settings.nativeLanguage
  const detected = options.localOnly
    ? await detectLanguageLocal(trimmed)
    : await detectLanguage(trimmed)
  if (detected && shouldSkipTranslation(detected, settings.nativeLanguage)) {
    return settings.defaultSourceLanguage
  }
  return settings.nativeLanguage
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
      const target = await resolveTargetLang(trimmed, settings, { localOnly: true })
      if (seq === detectSeqRef.current) {
        setTargetLangPreview(target)
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

  const handleServiceChange = async (serviceId: string) => {
    if (!settings) return
    const newSettings = { ...settings, selectedServiceId: serviceId }
    setSettings(newSettings)
    await saveSettings(newSettings)
  }

  const handleTranslate = async (textOverride?: string) => {
    const text = textOverride ?? inputText
    if (!text.trim()) return
    if (!settings) return
    setLoading(true)
    setResult('')
    setResultMeta(null)

    try {
      const trimmed = text.trim()
      const targetLang =
        manualTarget !== TARGET_AUTO ? manualTarget : await resolveTargetLang(trimmed, settings)
      setTargetLangPreview(targetLang)
      const extraPrompt = isLikelyWordOrPhrase(trimmed)
        ? buildPolysemyPrompt(targetLang)
        : undefined
      const response = await sendBgMessage<TranslationResponse>({
        type: 'TRANSLATE',
        payload: {
          text: trimmed,
          targetLang,
          extraPrompt
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

      {/* Services Selector Row */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-3 bg-muted/10">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-indigo-500" />
          当前翻译服务:
        </span>
        <Select
          value={activeServiceId}
          options={settings.services.map((s) => ({ value: s.id, label: s.name }))}
          onChange={handleServiceChange}
          placeholder="选择翻译服务"
          className="flex-1 max-w-[280px]"
          compact
        />
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
        <Textarea
          ref={textareaRef}
          autoFocus
          placeholder={t('popup_placeholder')}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          className="min-h-[80px] resize-none"
        />

        <Button
          onClick={() => handleTranslate()}
          disabled={loading || !inputText.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
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
