import React, { useEffect, useMemo, useState } from 'react'
import { Select } from '@/components/ui/select'
import { useDebouncedSave } from '@/hooks/use-debounced-save'
import { NumberInput } from '@/components/ui/number-input'
import { Switch, SwitchRow } from '@/components/ui/switch'
import type { GlobalSettings } from '@/types'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'
import {
  getHoverShortcutOptions,
  getInputShortcutOptions
} from '@/entrypoints/content/shortcut-utils'
import { Clock, Layers, Keyboard, ExternalLink } from 'lucide-react'
import { SettingsCard } from './settings-card'

const KEY_ICON_MAP: Record<string, string> = {
  Control: '⌃',
  Alt: '⌥',
  Shift: '⇧',
  Meta: '⌘',
  Escape: '⎋',
  Space: '␣'
}

function renderShortcutOption(label: string, value: string) {
  const icon = KEY_ICON_MAP[value]
  return (
    <span className="inline-flex items-center gap-2">
      {icon && (
        <kbd
          className={cn(
            'inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 rounded border border-border bg-muted',
            'text-[11px] font-sans font-medium text-foreground/80 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]'
          )}
        >
          {icon}
        </kbd>
      )}
      <span>{label}</span>
    </span>
  )
}

const IS_MAC = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')

const MAC_SYMBOL_MAP: Record<string, string> = {
  Command: '⌘',
  MacCtrl: '⌃',
  Ctrl: '⌃',
  Alt: '⌥',
  Option: '⌥',
  Shift: '⇧'
}

function formatShortcutTokens(raw: string, isMac: boolean): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  return trimmed.split('+').map((rawPart) => {
    const part = rawPart.trim()
    if (isMac && MAC_SYMBOL_MAP[part]) return MAC_SYMBOL_MAP[part]
    return part.length > 1 ? part.charAt(0).toUpperCase() + part.slice(1) : part.toUpperCase()
  })
}

interface OptionsGeneralSettingsProps {
  settings: GlobalSettings
  onSave: (settings: GlobalSettings) => void
}

export function OptionsGeneralSettings({ settings, onSave }: OptionsGeneralSettingsProps) {
  const [actualShortcut, setActualShortcut] = useState<string>(settings.shortcutKey)

  // Local draft state for text/number inputs to avoid hitting chrome.storage.sync rate limits
  const [draftTimeout, setDraftTimeout] = useState(settings.requestTimeout)
  const [draftMaxParagraphs, setDraftMaxParagraphs] = useState(settings.maxParagraphsPerRequest)
  const [draftMaxTextLength, setDraftMaxTextLength] = useState(settings.maxTextLengthPerRequest)
  const [draftMaxConcurrent, setDraftMaxConcurrent] = useState(settings.maxConcurrentRequests)

  useEffect(() => {
    setDraftTimeout(settings.requestTimeout)
  }, [settings.requestTimeout])
  useEffect(() => {
    setDraftMaxParagraphs(settings.maxParagraphsPerRequest)
  }, [settings.maxParagraphsPerRequest])
  useEffect(() => {
    setDraftMaxTextLength(settings.maxTextLengthPerRequest)
  }, [settings.maxTextLengthPerRequest])
  useEffect(() => {
    setDraftMaxConcurrent(settings.maxConcurrentRequests)
  }, [settings.maxConcurrentRequests])

  // 数字输入连续按键不能每次都写 chrome.storage.sync（120 次/分钟配额，超限抛错）。
  // 共享 hook 内部用 ref 持有最新 settings：原实现把 settings 捕获在 useCallback 闭包里，
  // 若防抖窗口内又发生了另一次保存（例如点了聚合开关），定时器会用旧 settings 拼 patch，
  // 把刚才的改动覆盖回去。
  const debouncedSave = useDebouncedSave(settings, onSave)

  useEffect(() => {
    let cancelled = false
    chrome.commands.getAll((commands) => {
      if (cancelled) return
      if (chrome.runtime.lastError) return
      const cmd = commands.find((c) => c.name === 'toggle-translate')
      if (cmd) setActualShortcut(cmd.shortcut ?? '')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const shortcutTokens = useMemo(
    () => formatShortcutTokens(actualShortcut, IS_MAC),
    [actualShortcut]
  )
  const inputShortcutOptions = getInputShortcutOptions(IS_MAC).map((option) => ({
    value: option.value,
    label: renderShortcutOption(t(option.labelKey), option.value)
  }))
  const hoverShortcutOptions = getHoverShortcutOptions(IS_MAC).map((option) => ({
    value: option.value,
    label: renderShortcutOption(t(option.labelKey), option.value)
  }))

  return (
    <div className="space-y-6">
      {/* Request Settings */}
      <SettingsCard
        icon={<Clock className="h-5 w-5 text-cyan-500" />}
        title={t('title_request_settings')}
        spaceClass="space-y-4"
      >
        <p className="text-sm text-muted-foreground">{t('desc_request_settings')}</p>
        <div className="space-y-2" role="group" aria-labelledby="general-timeout-label">
          <span id="general-timeout-label" className="text-sm font-medium block">
            {t('label_request_timeout')}
          </span>
          <NumberInput
            min={5000}
            max={120000}
            step={1000}
            value={draftTimeout}
            onChange={(v) => {
              setDraftTimeout(v)
              debouncedSave({ requestTimeout: v })
            }}
          />
        </div>
      </SettingsCard>

      {/* Aggregation Settings */}
      <SettingsCard
        icon={<Layers className="h-5 w-5 text-violet-500" />}
        title={t('title_aggregation')}
      >
        <SwitchRow labelId="general-aggregate-label" label={t('label_aggregate_enabled')} description={t('desc_aggregate_enabled')}>
          <Switch
            checked={settings.aggregateEnabled}
            onChange={(checked) => onSave({ ...settings, aggregateEnabled: checked })}
            labelledBy="general-aggregate-label"
          />
        </SwitchRow>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2" role="group" aria-labelledby="general-max-paragraphs-label">
            <span id="general-max-paragraphs-label" className="text-sm font-medium block">
              {t('label_max_paragraphs')}
            </span>
            <NumberInput
              min={1}
              max={20}
              value={draftMaxParagraphs}
              onChange={(v) => {
                setDraftMaxParagraphs(v)
                debouncedSave({ maxParagraphsPerRequest: v })
              }}
            />
          </div>
          <div className="space-y-2" role="group" aria-labelledby="general-max-text-length-label">
            <span id="general-max-text-length-label" className="text-sm font-medium block">
              {t('label_max_text_length')}
            </span>
            <NumberInput
              min={100}
              max={10000}
              step={100}
              value={draftMaxTextLength}
              onChange={(v) => {
                setDraftMaxTextLength(v)
                debouncedSave({ maxTextLengthPerRequest: v })
              }}
            />
          </div>
          <div className="space-y-2" role="group" aria-labelledby="general-max-concurrent-label">
            <span id="general-max-concurrent-label" className="text-sm font-medium block">
              {t('label_max_concurrent')}
            </span>
            <NumberInput
              min={1}
              max={10}
              value={draftMaxConcurrent}
              onChange={(v) => {
                setDraftMaxConcurrent(v)
                debouncedSave({ maxConcurrentRequests: v })
              }}
            />
          </div>
        </div>
      </SettingsCard>

      {/* Shortcut Settings */}
      <SettingsCard
        icon={<Keyboard className="h-5 w-5 text-sky-500" />}
        title={t('title_shortcut_settings')}
      >
        <div className="space-y-2" role="group" aria-labelledby="general-shortcut-label">
          <div id="general-shortcut-label" className="text-sm font-medium">
            {t('label_keyboard_shortcut')}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {shortcutTokens.length === 0 ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-md border border-dashed border-border',
                  'px-2.5 py-1 text-xs text-muted-foreground italic'
                )}
              >
                {t('shortcut_unbound')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                {shortcutTokens.map((token, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && (
                      <span className="text-muted-foreground/60 text-xs select-none">+</span>
                    )}
                    <kbd
                      className={cn(
                        'inline-flex items-center justify-center',
                        'min-w-[1.75rem] h-7 px-1.5',
                        'rounded-md border border-border bg-background',
                        'text-xs font-sans font-medium text-foreground/90',
                        'shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]',
                        'dark:shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.4)]',
                        IS_MAC && token.length === 1 ? 'text-sm' : ''
                      )}
                    >
                      {token}
                    </kbd>
                  </React.Fragment>
                ))}
              </span>
            )}
            <button
              type="button"
              onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
            >
              {t('shortcut_hint')}
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2" role="group" aria-labelledby="general-hover-shortcut-label">
            <span
              id="general-hover-shortcut-label"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Keyboard className="h-4 w-4 text-sky-500" />
              {t('label_hover_shortcut_key')}
            </span>
            <Select
              value={settings.hoverShortcutKey}
              options={hoverShortcutOptions}
              onChange={(value) => onSave({ ...settings, hoverShortcutKey: value })}
              ariaLabelledby="general-hover-shortcut-label"
            />
            <p className="text-xs text-muted-foreground">{t('hint_single_key_shortcut')}</p>
          </div>
          <div className="space-y-2" role="group" aria-labelledby="general-input-shortcut-label">
            <span
              id="general-input-shortcut-label"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Keyboard className="h-4 w-4 text-rose-500" />
              {t('label_input_shortcut_key')}
            </span>
            <Select
              value={settings.inputShortcutKey}
              options={inputShortcutOptions}
              onChange={(value) => onSave({ ...settings, inputShortcutKey: value })}
              ariaLabelledby="general-input-shortcut-label"
            />
            <p className="text-xs text-muted-foreground">{t('hint_input_shortcut_key')}</p>
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}
