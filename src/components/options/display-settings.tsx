import React, { useEffect, useState } from 'react';
import { Select } from '@/components/ui/select';
import { NumberInput } from '@/components/ui/number-input';
import { ColorPaletteInput } from '@/components/options/color-palette-input';
import type { GlobalSettings, InputLoadingPulseEasing, DisplayStyle, TranslationTone, TranslationLoadingTheme } from '@/types';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { getInputLoadingEasingValue } from '@/entrypoints/content/input-translate-utils';
import { Palette, Sparkles } from 'lucide-react';

interface OptionsDisplaySettingsProps {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
}

export function commitInputLoadingKeyframe(
  keyframes: [string, string, string],
  index: number,
  value: string
): [string, string, string] {
  const next = [...keyframes] as [string, string, string];
  next[index] = value;
  return next;
}

export function OptionsDisplaySettings({ settings, onSave }: OptionsDisplaySettingsProps) {
  const [draft, setDraft] = useState(settings);
  const [draftDuration, setDraftDuration] = useState(settings.inputLoadingPulseDurationMs);

  useEffect(() => {
    setDraft(settings);
    setDraftDuration(settings.inputLoadingPulseDurationMs);
  }, [settings]);

  const savePatch = (patch: Partial<GlobalSettings>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onSave(next);
  };

  const updateDraftKeyframe = (index: number, value: string) => {
    const keyframes = [...draft.inputLoadingPulseKeyframes] as [string, string, string];
    keyframes[index] = value;
    setDraft({ ...draft, inputLoadingPulseKeyframes: keyframes });
  };

  const commitKeyframe = (index: number, value: string) => {
    const keyframes = commitInputLoadingKeyframe(draft.inputLoadingPulseKeyframes, index, value);
    savePatch({ inputLoadingPulseKeyframes: keyframes });
  };

  const easingOptions: Array<{ value: InputLoadingPulseEasing; label: string }> = [
    { value: 'linear', label: t('pulse_easing_linear') },
    { value: 'ease-out', label: t('pulse_easing_ease_out') },
    { value: 'spring', label: t('pulse_easing_spring') },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">{t('title_display_mode_settings')}</h3>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('label_default_style')}</label>
          <div className="grid grid-cols-2 gap-3">
            {(['original', 'bilingual', 'underline', 'clean'] as DisplayStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => savePatch({ displayStyle: style })}
                className={cn(
                  'rounded-md border px-4 py-3 text-left text-sm transition-colors',
                  draft.displayStyle === style
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300'
                    : 'border-border hover:bg-accent/50'
                )}
              >
                <div className="font-medium">{t(`style_${style}`)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {style === 'original' && t('style_original_desc')}
                  {style === 'bilingual' && t('style_bilingual_desc')}
                  {style === 'underline' && t('style_underline_desc')}
                  {style === 'clean' && t('style_clean_desc')}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
          <h3 className="text-lg font-semibold">{t('title_translation_loading_theme')}</h3>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['indigo', 'aurora', 'monochrome', 'cosmic'] as TranslationLoadingTheme[]).map((theme) => (
              <button
                key={theme}
                onClick={() => savePatch({ translationLoadingTheme: theme })}
                className={cn(
                  'rounded-md border px-4 py-3 text-left text-sm transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer',
                  draft.translationLoadingTheme === theme
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 ring-1 ring-indigo-500/20'
                    : 'border-border hover:bg-accent/50 hover:border-accent-foreground/10'
                )}
              >
                <div className="space-y-1">
                  <div className="font-semibold">{t(`theme_${theme}`)}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {t(`theme_${theme}_desc`)}
                  </div>
                </div>
                <div className={cn(
                  "h-6 w-6 rounded-full shrink-0 border border-black/10 dark:border-white/10 shadow-sm relative overflow-hidden",
                  theme === 'indigo' && "bg-gradient-to-r from-indigo-500 to-purple-500",
                  theme === 'aurora' && "bg-gradient-to-r from-emerald-400 to-cyan-500",
                  theme === 'monochrome' && "bg-gradient-to-r from-neutral-400 to-neutral-600 dark:from-neutral-600 dark:to-neutral-400",
                  theme === 'cosmic' && "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
                )}>
                  <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-semibold">{t('title_translation_tone')}</h3>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('label_translation_tone')}</label>
          <div className="grid grid-cols-2 gap-3">
            {(['normal', 'technical', 'tech_forward', 'humorous', 'literary', 'formal', 'colloquial'] as TranslationTone[]).map((tone) => (
              <button
                key={tone}
                onClick={() => savePatch({ translationTone: tone })}
                className={cn(
                  'rounded-md border px-4 py-3 text-left text-sm transition-colors',
                  draft.translationTone === tone
                    ? 'border-purple-500 bg-purple-50/50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300'
                    : 'border-border hover:bg-accent/50'
                )}
              >
                <div className="font-medium">{t(`tone_${tone}`)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t(`tone_${tone}_desc`)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-sky-500" />
          <h3 className="text-lg font-semibold">{t('title_input_loading_settings')}</h3>
        </div>

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
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('label_input_loading_pulse_duration')}</label>
            <NumberInput
              min={400}
              max={5000}
              step={100}
              value={draftDuration}
              onChange={(v) => {
                setDraftDuration(v);
                setDraft(prev => {
                  const next = { ...prev, inputLoadingPulseDurationMs: v };
                  onSave(next);
                  return next;
                });
              }}
            />
            <p className="text-xs text-muted-foreground">{t('hint_input_loading_pulse_duration')}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('label_input_loading_pulse_easing')}</label>
            <Select
              value={draft.inputLoadingPulseEasing}
              options={easingOptions}
              onChange={(value) => savePatch({ inputLoadingPulseEasing: value as InputLoadingPulseEasing })}
            />
            <p className="text-xs text-muted-foreground">{t('hint_input_loading_pulse_easing')}</p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
          <div className="text-xs text-muted-foreground mb-2">{t('label_input_loading_preview')}</div>
          <div
            className="translator-input-loading-preview text-sm font-medium"
            style={{
              '--translator-input-loading-color-0': draft.inputLoadingPulseKeyframes[0],
              '--translator-input-loading-color-50': draft.inputLoadingPulseKeyframes[1],
              '--translator-input-loading-color-100': draft.inputLoadingPulseKeyframes[2],
              '--translator-input-loading-duration': `${draft.inputLoadingPulseDurationMs}ms`,
              '--translator-input-loading-easing': getInputLoadingEasingValue(draft.inputLoadingPulseEasing),
            } as React.CSSProperties}
          >
            {t('input_loading_preview_text')}
          </div>
        </div>
      </div>
    </div>
  );
}
