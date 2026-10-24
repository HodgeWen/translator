import React, { useEffect, useState } from 'react'
import { Select } from '@/components/ui/select'
import { NumberInput } from '@/components/ui/number-input'
import { ColorPaletteInput } from '@/components/options/color-palette-input'
import type {
  GlobalSettings,
  InputLoadingPulseEasing,
  DisplayStyle,
  TranslationLoadingTheme,
  ColorScheme
} from '@/types'
import { cn } from '@/lib/utils'
import { handleRovingKeyDown } from '@/lib/roving-focus'
import { t } from '@/lib/i18n'
import { getInputLoadingEasingValue } from '@/entrypoints/content/input-translate-utils'
import { useDebouncedSave } from '@/hooks/use-debounced-save'
import { Palette, Sparkles, SunMoon } from 'lucide-react'
import { SettingsCard } from './settings-card'
import { RadioCard } from './radio-card'

interface OptionsDisplaySettingsProps {
  settings: GlobalSettings
  onSave: (settings: GlobalSettings) => void
}

export function commitInputLoadingKeyframe(
  keyframes: [string, string, string],
  index: number,
  value: string
): [string, string, string] {
  const next = [...keyframes] as [string, string, string]
  next[index] = value
  return next
}

export function OptionsDisplaySettings({ settings, onSave }: OptionsDisplaySettingsProps) {
  const [draft, setDraft] = useState(settings)
  const [draftDuration, setDraftDuration] = useState(settings.inputLoadingPulseDurationMs)
  // 数字输入（脉冲时长）连续按键会触发保存：chrome.storage.sync 有
  // 120 次/分钟写入配额，超限会抛错并丢弃修改，因此这里必须防抖。
  const debouncedSave = useDebouncedSave(settings, onSave)

  useEffect(() => {
    setDraft(settings)
    setDraftDuration(settings.inputLoadingPulseDurationMs)
  }, [settings])

  const savePatch = (patch: Partial<GlobalSettings>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    onSave(next)
  }

  const updateDraftKeyframe = (index: number, value: string) => {
    const keyframes = [...draft.inputLoadingPulseKeyframes] as [string, string, string]
    keyframes[index] = value
    setDraft({ ...draft, inputLoadingPulseKeyframes: keyframes })
  }

  const commitKeyframe = (index: number, value: string) => {
    const keyframes = commitInputLoadingKeyframe(draft.inputLoadingPulseKeyframes, index, value)
    savePatch({ inputLoadingPulseKeyframes: keyframes })
  }

  const easingOptions: Array<{ value: InputLoadingPulseEasing; label: string }> = [
    { value: 'linear', label: t('pulse_easing_linear') },
    { value: 'ease-out', label: t('pulse_easing_ease_out') },
    { value: 'spring', label: t('pulse_easing_spring') }
  ]

  // 界面配色三选一：跟随系统 / 浅色 / 深色
  const colorSchemeOptions: Array<{ value: ColorScheme; label: string }> = [
    { value: 'system', label: t('color_scheme_system') },
    { value: 'light', label: t('color_scheme_light') },
    { value: 'dark', label: t('color_scheme_dark') }
  ]

  // 合并系统预设翻译风格与用户自定义语气
  const systemTones = [
    { value: 'normal', label: t('tone_normal'), desc: t('tone_normal_desc') },
    { value: 'technical', label: t('tone_technical'), desc: t('tone_technical_desc') },
    { value: 'tech_forward', label: t('tone_tech_forward'), desc: t('tone_tech_forward_desc') },
    { value: 'humorous', label: t('tone_humorous'), desc: t('tone_humorous_desc') },
    { value: 'literary', label: t('tone_literary'), desc: t('tone_literary_desc') },
    { value: 'formal', label: t('tone_formal'), desc: t('tone_formal_desc') },
    { value: 'colloquial', label: t('tone_colloquial'), desc: t('tone_colloquial_desc') }
  ]

  const customTones = settings.customTones.map((ct) => ({
    value: ct.id,
    label: ct.name,
    desc: ct.promptInstruction
  }))

  const allTones = [...systemTones, ...customTones]

  return (
    <div className="space-y-6">
      {/* 0. Appearance / Color Scheme Card */}
      <SettingsCard
        icon={<SunMoon className="h-5 w-5 text-slate-500" />}
        title={t('label_color_scheme')}
      >
        {/* 用 role="group" + aria-labelledby 给控件命名；Select 自身也已传 ariaLabelledby */}
        <div className="space-y-2" role="group" aria-labelledby="options-color-scheme-label">
          <span id="options-color-scheme-label" className="text-sm font-medium block">
            {t('label_color_scheme')}
          </span>
          <Select
            value={draft.colorScheme}
            options={colorSchemeOptions}
            onChange={(value) => savePatch({ colorScheme: value as ColorScheme })}
            className="max-w-xs"
            ariaLabelledby="options-color-scheme-label"
          />
          <p className="text-xs text-muted-foreground">{t('desc_color_scheme')}</p>
        </div>
      </SettingsCard>

      {/* 1. Display Style Settings Card */}
      <SettingsCard
        icon={<Palette className="h-5 w-5 text-amber-500" />}
        title={t('title_display_mode_settings')}
      >
        <div className="space-y-4">
          <div id="options-global-display-style" className="text-sm font-medium">
            {t('label_global_display_style')}
          </div>

          <div
            role="radiogroup"
            onKeyDown={(event) => handleRovingKeyDown(event, 'radio')}
            aria-labelledby="options-global-display-style"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <RadioCard
              variant="override"
              checked={!draft.overrideDisplayStyleEnabled}
              onSelect={() => savePatch({ overrideDisplayStyleEnabled: false })}
              title={t('option_use_service_default')}
              description={t('desc_use_service_default_style')}
            />

            <RadioCard
              variant="override"
              checked={draft.overrideDisplayStyleEnabled}
              onSelect={() => savePatch({ overrideDisplayStyleEnabled: true })}
              title={t('option_global_override')}
              description={t('desc_global_override_style')}
            />
          </div>

          {draft.overrideDisplayStyleEnabled && (
            <div className="rounded-md border border-border p-4 bg-muted/10 space-y-3">
              <div
                id="options-choose-global-style"
                className="text-xs font-semibold text-indigo-500 uppercase tracking-wider"
              >
                {t('title_choose_global_style')}
              </div>
              <div
                role="radiogroup"
                onKeyDown={(event) => handleRovingKeyDown(event, 'radio')}
                aria-labelledby="options-choose-global-style"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {(['original', 'bilingual', 'underline', 'clean'] as DisplayStyle[]).map(
                  (style) => (
                    <RadioCard
                      key={style}
                      checked={draft.customDisplayStyle === style}
                      onSelect={() => savePatch({ customDisplayStyle: style })}
                      showDot={false}
                      title={t(`style_${style}`)}
                      description={t(`style_${style}_desc`)}
                    />
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* 2. Loading Theme Settings Card */}
      <SettingsCard
        icon={<Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />}
        title={t('title_translation_loading_theme')}
      >
        <div className="space-y-2">
          <div
            role="radiogroup"
            onKeyDown={(event) => handleRovingKeyDown(event, 'radio')}
            aria-label={t('title_translation_loading_theme')}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {(['indigo', 'aurora', 'monochrome', 'cosmic'] as TranslationLoadingTheme[]).map(
              (theme) => (
                <RadioCard
                  key={theme}
                  checked={draft.translationLoadingTheme === theme}
                  onSelect={() => savePatch({ translationLoadingTheme: theme })}
                  showDot={false}
                  transitionClass="transition-all duration-200"
                  descriptionClass="leading-relaxed"
                  title={t(`theme_${theme}`)}
                  description={t(`theme_${theme}_desc`)}
                  trailing={
                    <div
                      className={cn(
                        'h-6 w-6 rounded-full shrink-0 border border-black/10 dark:border-white/10 shadow-sm',
                        theme === 'indigo' && 'bg-[#a5a8e0]',
                        theme === 'aurora' && 'bg-[#8dc2b3]',
                        theme === 'monochrome' && 'bg-neutral-400 dark:bg-neutral-500',
                        theme === 'cosmic' && 'bg-[#d6a7b7]'
                      )}
                    />
                  }
                />
              )
            )}
          </div>
        </div>
      </SettingsCard>

      {/* 3. Translation Tone Settings Card */}
      <SettingsCard
        icon={<Sparkles className="h-5 w-5 text-purple-500" />}
        title={t('title_translation_tone')}
      >
        <div className="space-y-4">
          <div id="options-global-tone" className="text-sm font-medium">
            {t('label_global_tone')}
          </div>

          <div
            role="radiogroup"
            onKeyDown={(event) => handleRovingKeyDown(event, 'radio')}
            aria-labelledby="options-global-tone"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <RadioCard
              variant="override"
              checked={!draft.overrideTranslationToneEnabled}
              onSelect={() => savePatch({ overrideTranslationToneEnabled: false })}
              title={t('option_use_service_default')}
              description={t('desc_use_service_default_tone')}
            />

            <RadioCard
              variant="override"
              checked={draft.overrideTranslationToneEnabled}
              onSelect={() => savePatch({ overrideTranslationToneEnabled: true })}
              title={t('option_global_override')}
              description={t('desc_global_override_tone')}
            />
          </div>

          {draft.overrideTranslationToneEnabled && (
            <div className="rounded-md border border-border p-4 bg-muted/10 space-y-3">
              <div
                id="options-choose-global-tone"
                className="text-xs font-semibold text-purple-500 uppercase tracking-wider"
              >
                {t('title_choose_global_tone')}
              </div>
              <div
                role="radiogroup"
                onKeyDown={(event) => handleRovingKeyDown(event, 'radio')}
                aria-labelledby="options-choose-global-tone"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {allTones.map((tone) => (
                  <RadioCard
                    key={tone.value}
                    checked={draft.customTranslationTone === tone.value}
                    onSelect={() => savePatch({ customTranslationTone: tone.value })}
                    accent="purple"
                    showDot={false}
                    descriptionClass="line-clamp-2"
                    title={tone.label}
                    description={tone.desc}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* 4. Input Loading Settings Card */}
      <SettingsCard
        icon={<Sparkles className="h-5 w-5 text-sky-500" />}
        title={t('title_input_loading_settings')}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {draft.inputLoadingPulseKeyframes.map((color, index) => (
            <ColorPaletteInput
              key={index}
              value={color}
              label={t(`label_input_loading_keyframe_${index}`)}
              invalidText={t('error_invalid_hex_color')}
              onPreview={(value) => updateDraftKeyframe(index, value)}
              onCommit={(value) => commitKeyframe(index, value)}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2" role="group" aria-labelledby="options-pulse-duration-label">
            <span id="options-pulse-duration-label" className="text-sm font-medium block">
              {t('label_input_loading_pulse_duration')}
            </span>
            <NumberInput
              min={400}
              max={5000}
              step={100}
              value={draftDuration}
              onChange={(v) => {
                setDraftDuration(v)
                // 预览需要即时反馈，落盘走防抖：setState 更新函数必须是纯函数，
                // 原实现在 updater 里调用 onSave，StrictMode 下会被执行两次（双写）。
                setDraft((prev) => ({ ...prev, inputLoadingPulseDurationMs: v }))
                debouncedSave({ inputLoadingPulseDurationMs: v })
              }}
            />
            <p className="text-xs text-muted-foreground">
              {t('hint_input_loading_pulse_duration')}
            </p>
          </div>
          <div className="space-y-2" role="group" aria-labelledby="options-pulse-easing-label">
            <span id="options-pulse-easing-label" className="text-sm font-medium block">
              {t('label_input_loading_pulse_easing')}
            </span>
            <Select
              value={draft.inputLoadingPulseEasing}
              options={easingOptions}
              onChange={(value) =>
                savePatch({ inputLoadingPulseEasing: value as InputLoadingPulseEasing })
              }
              ariaLabelledby="options-pulse-easing-label"
            />
            <p className="text-xs text-muted-foreground">{t('hint_input_loading_pulse_easing')}</p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
          <div className="text-xs text-muted-foreground mb-2">
            {t('label_input_loading_preview')}
          </div>
          <div
            className="translator-input-loading-preview text-sm font-medium"
            style={
              {
                '--translator-input-loading-color-0': draft.inputLoadingPulseKeyframes[0],
                '--translator-input-loading-color-50': draft.inputLoadingPulseKeyframes[1],
                '--translator-input-loading-color-100': draft.inputLoadingPulseKeyframes[2],
                '--translator-input-loading-duration': `${draft.inputLoadingPulseDurationMs}ms`,
                '--translator-input-loading-easing': getInputLoadingEasingValue(
                  draft.inputLoadingPulseEasing
                )
              } as React.CSSProperties
            }
          >
            {t('input_loading_preview_text')}
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}
