import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { NumberInput } from '@/components/ui/number-input';
import type { GlobalSettings } from '@/types';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { DEFAULT_GLOBAL_PROMPT } from '@/lib/prompts';
import { getHoverShortcutOptions, getInputShortcutOptions } from '@/entrypoints/content/shortcut-utils';
import {
  FileText, Clock, Layers, RotateCcw, Keyboard, ExternalLink,
} from 'lucide-react';

const KEY_ICON_MAP: Record<string, string> = {
  Control: '⌃',
  Alt: '⌥',
  Shift: '⇧',
  Meta: '⌘',
  Escape: '⎋',
  Space: '␣',
};

function renderShortcutOption(label: string, value: string) {
  const icon = KEY_ICON_MAP[value];
  return (
    <span className="inline-flex items-center gap-2">
      {icon && (
        <kbd className={cn(
          'inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 rounded border border-border bg-muted',
          'text-[11px] font-sans font-medium text-foreground/80 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]'
        )}>
          {icon}
        </kbd>
      )}
      <span>{label}</span>
    </span>
  );
}

const IS_MAC = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');

const MAC_SYMBOL_MAP: Record<string, string> = {
  Command: '⌘',
  MacCtrl: '⌃',
  Ctrl: '⌃',
  Alt: '⌥',
  Option: '⌥',
  Shift: '⇧',
};

function formatShortcutTokens(raw: string, isMac: boolean): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return trimmed.split('+').map((rawPart) => {
    const part = rawPart.trim();
    if (isMac && MAC_SYMBOL_MAP[part]) return MAC_SYMBOL_MAP[part];
    return part.length > 1 ? part.charAt(0).toUpperCase() + part.slice(1) : part.toUpperCase();
  });
}

interface OptionsGeneralSettingsProps {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
}

export function OptionsGeneralSettings({ settings, onSave }: OptionsGeneralSettingsProps) {
  const [actualShortcut, setActualShortcut] = useState<string>(settings.shortcutKey);

  // Local draft state for text/number inputs to avoid hitting chrome.storage.sync rate limits
  const [draftPrompt, setDraftPrompt] = useState(settings.globalPrompt);
  const [draftTimeout, setDraftTimeout] = useState(settings.requestTimeout);
  const [draftMaxParagraphs, setDraftMaxParagraphs] = useState(settings.maxParagraphsPerRequest);
  const [draftMaxTextLength, setDraftMaxTextLength] = useState(settings.maxTextLengthPerRequest);
  const [draftMaxConcurrent, setDraftMaxConcurrent] = useState(settings.maxConcurrentRequests);

  useEffect(() => { setDraftPrompt(settings.globalPrompt); }, [settings.globalPrompt]);
  useEffect(() => { setDraftTimeout(settings.requestTimeout); }, [settings.requestTimeout]);
  useEffect(() => { setDraftMaxParagraphs(settings.maxParagraphsPerRequest); }, [settings.maxParagraphsPerRequest]);
  useEffect(() => { setDraftMaxTextLength(settings.maxTextLengthPerRequest); }, [settings.maxTextLengthPerRequest]);
  useEffect(() => { setDraftMaxConcurrent(settings.maxConcurrentRequests); }, [settings.maxConcurrentRequests]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSave = useCallback((patch: Partial<GlobalSettings>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSave({ ...settings, ...patch });
    }, 500);
  }, [settings, onSave]);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  useEffect(() => {
    let cancelled = false;
    chrome.commands.getAll((commands) => {
      if (cancelled) return;
      if (chrome.runtime.lastError) return;
      const cmd = commands.find((c) => c.name === 'toggle-translate');
      if (cmd) setActualShortcut(cmd.shortcut ?? '');
    });
    return () => { cancelled = true; };
  }, []);

  const shortcutTokens = useMemo(
    () => formatShortcutTokens(actualShortcut, IS_MAC),
    [actualShortcut]
  );
  const inputShortcutOptions = getInputShortcutOptions(IS_MAC).map((option) => ({
    value: option.value,
    label: renderShortcutOption(t(option.labelKey), option.value),
  }));
  const hoverShortcutOptions = getHoverShortcutOptions(IS_MAC).map((option) => ({
    value: option.value,
    label: renderShortcutOption(t(option.labelKey), option.value),
  }));

  return (
    <div className="space-y-6">
      {/* Global Prompt */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold">{t('title_global_prompt')}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSave({ ...settings, globalPrompt: DEFAULT_GLOBAL_PROMPT })}
            disabled={settings.globalPrompt === DEFAULT_GLOBAL_PROMPT}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t('btn_reset_default')}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t('desc_global_prompt')}</p>
        <textarea
          value={draftPrompt}
          onChange={(e) => { setDraftPrompt(e.target.value); debouncedSave({ globalPrompt: e.target.value }); }}
          rows={4}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y font-mono"
        />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>{t('hint_prompt_vars')}</p>
          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{'{{sourceLang}}'}</code>{' '}
          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{'{{targetLang}}'}</code>
        </div>
      </div>

      {/* Request Settings */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-cyan-500" />
          <h3 className="text-lg font-semibold">{t('title_request_settings')}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t('desc_request_settings')}</p>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('label_request_timeout')}</label>
          <NumberInput
            min={5000}
            max={120000}
            step={1000}
            value={draftTimeout}
            onChange={(v) => { setDraftTimeout(v); debouncedSave({ requestTimeout: v }); }}
          />
        </div>
      </div>

      {/* Aggregation Settings */}
      <div className="rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-violet-500" />
          <h3 className="text-lg font-semibold">{t('title_aggregation')}</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{t('label_aggregate_enabled')}</div>
            <div className="text-xs text-muted-foreground">{t('desc_aggregate_enabled')}</div>
          </div>
          <button
            onClick={() => onSave({ ...settings, aggregateEnabled: !settings.aggregateEnabled })}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              settings.aggregateEnabled ? 'bg-indigo-500' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                settings.aggregateEnabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('label_max_paragraphs')}</label>
            <NumberInput
              min={1}
              max={20}
              value={draftMaxParagraphs}
              onChange={(v) => { setDraftMaxParagraphs(v); debouncedSave({ maxParagraphsPerRequest: v }); }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('label_max_text_length')}</label>
            <NumberInput
              min={100}
              max={10000}
              step={100}
              value={draftMaxTextLength}
              onChange={(v) => { setDraftMaxTextLength(v); debouncedSave({ maxTextLengthPerRequest: v }); }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('label_max_concurrent')}</label>
            <NumberInput
              min={1}
              max={10}
              value={draftMaxConcurrent}
              onChange={(v) => { setDraftMaxConcurrent(v); debouncedSave({ maxConcurrentRequests: v }); }}
            />
          </div>
        </div>
      </div>

      {/* Shortcut Settings */}
      <div className="rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5 text-sky-500" />
          <h3 className="text-lg font-semibold">{t('title_shortcut_settings')}</h3>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('label_keyboard_shortcut')}</label>
          <div className="flex items-center gap-3 flex-wrap">
            {shortcutTokens.length === 0 ? (
              <span className={cn(
                'inline-flex items-center rounded-md border border-dashed border-border',
                'px-2.5 py-1 text-xs text-muted-foreground italic'
              )}>
                {t('shortcut_unbound')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                {shortcutTokens.map((token, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-muted-foreground/60 text-xs select-none">+</span>}
                    <kbd className={cn(
                      'inline-flex items-center justify-center',
                      'min-w-[1.75rem] h-7 px-1.5',
                      'rounded-md border border-border bg-background',
                      'text-xs font-sans font-medium text-foreground/90',
                      'shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]',
                      'dark:shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.4)]',
                      IS_MAC && token.length === 1 ? 'text-sm' : ''
                    )}>
                      {token}
                    </kbd>
                  </React.Fragment>
                ))}
              </span>
            )}
            <button
              onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
            >
              {t('shortcut_hint')}
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-sky-500" />
              {t('label_hover_shortcut_key')}
            </label>
            <Select
              value={settings.hoverShortcutKey}
              options={hoverShortcutOptions}
              onChange={(value) => onSave({ ...settings, hoverShortcutKey: value })}
            />
            <p className="text-xs text-muted-foreground">{t('hint_single_key_shortcut')}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-rose-500" />
              {t('label_input_shortcut_key')}
            </label>
            <Select
              value={settings.inputShortcutKey}
              options={inputShortcutOptions}
              onChange={(value) => onSave({ ...settings, inputShortcutKey: value })}
            />
            <p className="text-xs text-muted-foreground">{t('hint_input_shortcut_key')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
