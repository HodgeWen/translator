import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { GlobalSettings, TranslationStyle } from '@/types';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { importSettings, isEncryptedExport } from '@/lib/storage';
import { DEFAULT_GLOBAL_PROMPT } from '@/lib/prompts';
import {
  Download, Upload, FileText, Zap, Clock, Layers, RotateCcw, Eye, EyeOff, Lock,
} from 'lucide-react';

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
  onError: (message: string) => void;
  onSuccess?: (message: string) => void;
  onImportSuccess: () => void;
}

export function OptionsGeneralSettings({ settings, onSave, onError, onSuccess, onImportSuccess }: OptionsGeneralSettingsProps) {
  const [actualShortcut, setActualShortcut] = useState<string>(settings.shortcutKey);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [showExportPassphrase, setShowExportPassphrase] = useState(false);
  const [pendingImportText, setPendingImportText] = useState<string | null>(null);
  const [pendingImportPassphrase, setPendingImportPassphrase] = useState('');
  const [showImportPassphrase, setShowImportPassphrase] = useState(false);

  const hasApiKey = useMemo(
    () => settings.providers.some((p) => p.apiKey?.trim()),
    [settings.providers]
  );

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

  const handleExport = async () => {
    try {
      const { exportSettings } = await import('@/lib/storage');
      const passphrase = exportPassphrase.trim();
      const usePassphrase = passphrase.length > 0;
      const json = await exportSettings(usePassphrase ? passphrase : undefined);
      const blob = new Blob([json], {
        type: usePassphrase ? 'application/octet-stream' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = usePassphrase
        ? `translator-settings-${date}.enc.json`
        : `translator-settings-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (usePassphrase) {
        onSuccess?.(t('toast_export_encrypted_remember'));
        setExportPassphrase('');
        setShowExportPassphrase(false);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : t('error_export_failed'));
    }
  };

  const runImport = async (text: string, passphrase?: string) => {
    try {
      await importSettings(text, passphrase);
      setPendingImportText(null);
      setPendingImportPassphrase('');
      setShowImportPassphrase(false);
      onImportSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'PASSPHRASE_REQUIRED') {
        onError(t('error_import_passphrase_required'));
      } else if (msg === 'DECRYPT_FAILED' || msg === 'UNSUPPORTED_ENCRYPTED_FORMAT') {
        onError(t('error_import_decrypt_failed'));
      } else {
        onError(msg || t('error_import_failed'));
      }
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('error_import_failed'));
      return;
    }

    if (isEncryptedExport(text)) {
      setPendingImportText(text);
      setPendingImportPassphrase('');
      setShowImportPassphrase(false);
      return;
    }
    await runImport(text);
  };

  const handleConfirmImport = async () => {
    if (!pendingImportText) return;
    const pass = pendingImportPassphrase.trim();
    if (!pass) {
      onError(t('error_import_passphrase_required'));
      return;
    }
    await runImport(pendingImportText, pass);
  };

  const handleCancelImport = () => {
    setPendingImportText(null);
    setPendingImportPassphrase('');
    setShowImportPassphrase(false);
  };

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
          value={settings.globalPrompt}
          onChange={(e) => onSave({ ...settings, globalPrompt: e.target.value })}
          rows={4}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y font-mono"
        />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>{t('hint_prompt_vars')}</p>
          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{'{{sourceLang}}'}</code>{' '}
          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{'{{targetLang}}'}</code>{' '}
          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{'{{text}}'}</code>
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
          <input
            type="number"
            min={5000}
            max={120000}
            step={1000}
            value={settings.requestTimeout}
            onChange={(e) => onSave({ ...settings, requestTimeout: Math.max(5000, Math.min(120000, parseInt(e.target.value) || 30000)) })}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
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
            <input
              type="number"
              min={1}
              max={20}
              value={settings.maxParagraphsPerRequest}
              onChange={(e) => onSave({ ...settings, maxParagraphsPerRequest: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)) })}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('label_max_text_length')}</label>
            <input
              type="number"
              min={100}
              max={10000}
              value={settings.maxTextLengthPerRequest}
              onChange={(e) => onSave({ ...settings, maxTextLengthPerRequest: Math.max(100, Math.min(10000, parseInt(e.target.value) || 2000)) })}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('label_max_concurrent')}</label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.maxConcurrentRequests}
              onChange={(e) => onSave({ ...settings, maxConcurrentRequests: Math.max(1, Math.min(10, parseInt(e.target.value) || 3)) })}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Default Style */}
      <div className="rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">{t('title_display_settings')}</h3>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('label_default_style')}</label>
          <div className="grid grid-cols-2 gap-3">
            {(['original', 'bilingual', 'underline', 'clean'] as TranslationStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => onSave({ ...settings, defaultStyle: style })}
                className={cn(
                  'rounded-md border px-4 py-3 text-left text-sm transition-colors',
                  settings.defaultStyle === style
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
            <span className="text-xs text-muted-foreground">{t('shortcut_hint')}</span>
          </div>
        </div>
      </div>

      {/* Backup / Restore */}
      <div className="rounded-lg border border-border p-6 space-y-5">
        <h3 className="text-lg font-semibold">{t('title_backup_restore')}</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            {t('label_export_passphrase')}
          </label>
          <div className="flex gap-2">
            <input
              type={showExportPassphrase ? 'text' : 'password'}
              value={exportPassphrase}
              onChange={(e) => setExportPassphrase(e.target.value)}
              className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              autoComplete="new-password"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setShowExportPassphrase((v) => !v)}
              title={showExportPassphrase ? t('btn_hide') : t('btn_show')}
            >
              {showExportPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className={cn(
            'text-xs',
            hasApiKey ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
          )}>
            {hasApiKey ? t('hint_export_passphrase_warn') : t('hint_export_passphrase')}
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-1.5 h-4 w-4" />
            {t('btn_export_settings')}
          </Button>
          <label className="cursor-pointer inline-flex">
            <input type="file" accept=".json,.enc.json,application/json" className="hidden" onChange={handleImport} />
            <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
              <Upload className="h-4 w-4" />
              {t('btn_import_settings')}
            </span>
          </label>
        </div>

        {pendingImportText && (
          <div className="rounded-md border border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-900/20 p-4 space-y-3">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              {t('label_import_passphrase')}
            </label>
            <div className="flex gap-2">
              <input
                type={showImportPassphrase ? 'text' : 'password'}
                value={pendingImportPassphrase}
                onChange={(e) => setPendingImportPassphrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmImport();
                  }
                }}
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                autoFocus
                autoComplete="off"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setShowImportPassphrase((v) => !v)}
                title={showImportPassphrase ? t('btn_hide') : t('btn_show')}
              >
                {showImportPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleConfirmImport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {t('btn_import_confirm')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelImport}>
                {t('btn_import_cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
