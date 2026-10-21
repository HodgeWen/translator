import React, { useEffect, useState } from 'react';
import { Select } from '@/components/ui/select';
import { NumberInput } from '@/components/ui/number-input';
import { ColorPaletteInput } from '@/components/options/color-palette-input';
import type { GlobalSettings, InputLoadingPulseEasing, DisplayStyle, TranslationLoadingTheme } from '@/types';
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

  // 合并系统预设翻译风格与用户自定义语气
  const systemTones = [
    { value: 'normal', label: t('tone_normal'), desc: t('tone_normal_desc') },
    { value: 'technical', label: t('tone_technical'), desc: t('tone_technical_desc') },
    { value: 'tech_forward', label: t('tone_tech_forward'), desc: t('tone_tech_forward_desc') },
    { value: 'humorous', label: t('tone_humorous'), desc: t('tone_humorous_desc') },
    { value: 'literary', label: t('tone_literary'), desc: t('tone_literary_desc') },
    { value: 'formal', label: t('tone_formal'), desc: t('tone_formal_desc') },
    { value: 'colloquial', label: t('tone_colloquial'), desc: t('tone_colloquial_desc') },
  ];

  const customTones = settings.customTones.map(ct => ({
    value: ct.id,
    label: ct.name,
    desc: ct.promptInstruction
  }));

  const allTones = [...systemTones, ...customTones];

  return (
    <div className="space-y-6">
      {/* 1. Display Style Settings Card */}
      <div className="rounded-lg border border-border p-6 bg-card space-y-6">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">{t('title_display_mode_settings')}</h3>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium">全局翻译展示样式</label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => savePatch({ overrideDisplayStyleEnabled: false })}
              className={cn(
                'rounded-md border p-4 text-left text-sm transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer',
                !draft.overrideDisplayStyleEnabled
                  ? 'border-indigo-500 bg-indigo-50/20 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 ring-1 ring-indigo-500/20 shadow-sm'
                  : 'border-border hover:bg-accent/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                  !draft.overrideDisplayStyleEnabled ? "border-indigo-500 bg-indigo-500 text-white" : "border-muted-foreground/60"
                )}>
                  {!draft.overrideDisplayStyleEnabled && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="font-semibold">使用服务默认</div>
                  <div className="text-xs text-muted-foreground mt-0.5">由各服务的“高级配置”中单独指定的展示样式决定</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => savePatch({ overrideDisplayStyleEnabled: true })}
              className={cn(
                'rounded-md border p-4 text-left text-sm transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer',
                draft.overrideDisplayStyleEnabled
                  ? 'border-indigo-500 bg-indigo-50/20 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 ring-1 ring-indigo-500/20 shadow-sm'
                  : 'border-border hover:bg-accent/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                  draft.overrideDisplayStyleEnabled ? "border-indigo-500 bg-indigo-500 text-white" : "border-muted-foreground/60"
                )}>
                  {draft.overrideDisplayStyleEnabled && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="font-semibold">自定义全局覆盖</div>
                  <div className="text-xs text-muted-foreground mt-0.5">无视服务内单独指定的样式，强制所有服务统一使用选中样式</div>
                </div>
              </div>
            </button>
          </div>

          {draft.overrideDisplayStyleEnabled && (
            <div className="rounded-md border border-border p-4 bg-muted/10 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">选择自定义全局展示样式</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['original', 'bilingual', 'underline', 'clean'] as DisplayStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => savePatch({ customDisplayStyle: style })}
                    className={cn(
                      'rounded-md border px-4 py-3 text-left text-sm transition-colors cursor-pointer bg-background',
                      draft.customDisplayStyle === style
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 ring-1 ring-indigo-500/20'
                        : 'border-border hover:bg-accent/50'
                    )}
                  >
                    <div className="font-semibold">{t(`style_${style}`)}</div>
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
          )}
        </div>
      </div>

      {/* 2. Loading Theme Settings Card */}
      <div className="rounded-lg border border-border p-6 bg-card space-y-6">
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
                  'rounded-md border px-4 py-3 text-left text-sm transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer bg-background',
                  draft.translationLoadingTheme === theme
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 ring-1 ring-indigo-500/20'
                    : 'border-border hover:bg-accent/50'
                )}
              >
                <div className="space-y-1">
                  <div className="font-semibold">{t(`theme_${theme}`)}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {t(`theme_${theme}_desc`)}
                  </div>
                </div>
                <div className={cn(
                  "h-6 w-6 rounded-full shrink-0 border border-black/10 dark:border-white/10 shadow-sm",
                  theme === 'indigo' && "bg-[#a5a8e0]",
                  theme === 'aurora' && "bg-[#8dc2b3]",
                  theme === 'monochrome' && "bg-neutral-400 dark:bg-neutral-500",
                  theme === 'cosmic' && "bg-[#d6a7b7]"
                )} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Translation Tone Settings Card */}
      <div className="rounded-lg border border-border p-6 bg-card space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-semibold">{t('title_translation_tone')}</h3>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium">全局翻译风格语气</label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => savePatch({ overrideTranslationToneEnabled: false })}
              className={cn(
                'rounded-md border p-4 text-left text-sm transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer bg-background',
                !draft.overrideTranslationToneEnabled
                  ? 'border-indigo-500 bg-indigo-50/20 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 ring-1 ring-indigo-500/20 shadow-sm'
                  : 'border-border hover:bg-accent/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                  !draft.overrideTranslationToneEnabled ? "border-indigo-500 bg-indigo-500 text-white" : "border-muted-foreground/60"
                )}>
                  {!draft.overrideTranslationToneEnabled && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="font-semibold">使用服务默认</div>
                  <div className="text-xs text-muted-foreground mt-0.5">由当前所选翻译服务的高级配置指定语气</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => savePatch({ overrideTranslationToneEnabled: true })}
              className={cn(
                'rounded-md border p-4 text-left text-sm transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer bg-background',
                draft.overrideTranslationToneEnabled
                  ? 'border-indigo-500 bg-indigo-50/20 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 ring-1 ring-indigo-500/20 shadow-sm'
                  : 'border-border hover:bg-accent/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                  draft.overrideTranslationToneEnabled ? "border-indigo-500 bg-indigo-500 text-white" : "border-muted-foreground/60"
                )}>
                  {draft.overrideTranslationToneEnabled && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="font-semibold">自定义全局覆盖</div>
                  <div className="text-xs text-muted-foreground mt-0.5">覆盖服务内指定的语气，统一使用选中的风格语气</div>
                </div>
              </div>
            </button>
          </div>

          {draft.overrideTranslationToneEnabled && (
            <div className="rounded-md border border-border p-4 bg-muted/10 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="text-xs font-semibold text-purple-500 uppercase tracking-wider">选择自定义全局翻译风格语气</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allTones.map((tone) => (
                  <button
                    key={tone.value}
                    onClick={() => savePatch({ customTranslationTone: tone.value })}
                    className={cn(
                      'rounded-md border px-4 py-3 text-left text-sm transition-colors cursor-pointer bg-background',
                      draft.customTranslationTone === tone.value
                        ? 'border-purple-500 bg-purple-50/50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 ring-1 ring-purple-500/20'
                        : 'border-border hover:bg-accent/50'
                    )}
                  >
                    <div className="font-semibold">{tone.label}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {tone.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Input Loading Settings Card */}
      <div className="rounded-lg border border-border p-6 bg-card space-y-6">
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
