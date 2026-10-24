import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { GlobalSettings } from '@/types';
import { cn } from '@/lib/utils';
import { SettingsCard } from './settings-card';
import { t } from '@/lib/i18n';
import { importSettings, isEncryptedExport } from '@/lib/storage';
import { Download, Upload, Lock } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';

interface OptionsBackupRestoreSettingsProps {
  settings: GlobalSettings;
  onError: (message: string) => void;
  onSuccess?: (message: string) => void;
  onImportSuccess: () => void;
}

export function OptionsBackupRestoreSettings({ settings, onError, onSuccess, onImportSuccess }: OptionsBackupRestoreSettingsProps) {
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [pendingImportText, setPendingImportText] = useState<string | null>(null);
  const [pendingImportPassphrase, setPendingImportPassphrase] = useState('');

  const hasApiKey = useMemo(
    () => settings.providers.some((p) => p.apiKey?.trim()),
    [settings.providers]
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
      const date = new Date().toLocaleString('sv-SE').replace(' ', '_').replace(/:/g, '-');
      a.download = usePassphrase
        ? `translator-settings-${date}.enc.json`
        : `translator-settings-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (usePassphrase) {
        onSuccess?.(t('toast_export_encrypted_remember'));
        setExportPassphrase('');
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
      onImportSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const code = err && typeof err === 'object' ? String((err as { code?: unknown }).code ?? '') : '';
      if (msg === 'PASSPHRASE_REQUIRED') {
        onError(t('error_import_passphrase_required'));
      } else if (msg === 'DECRYPT_FAILED' || msg === 'UNSUPPORTED_ENCRYPTED_FORMAT') {
        onError(t('error_import_decrypt_failed'));
      } else if (/^(SETTINGS_UNSUPPORTED_VERSION|SETTINGS_INVALID_PAYLOAD|INVALID_IMPORT_VERSION|VERSION_TOO_NEW|UNSUPPORTED_VERSION)$/.test(code || msg)) {
        // 备份文件版本高于当前扩展支持的版本（storage 抛出的稳定码是
        // SETTINGS_UNSUPPORTED_VERSION，旧正则只列了历史别名，导致本地化文案成了死代码）
        onError(t('error_invalid_import_version'));
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
  };

  return (
    <div className="space-y-6">
      <SettingsCard title={t('title_backup_restore')} icon={null} spaceClass="space-y-5">

        <div className="space-y-2">
          <label htmlFor="backup-export-passphrase" className="text-sm font-medium flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            {t('label_export_passphrase')}
          </label>
          <PasswordInput
            id="backup-export-passphrase"
            value={exportPassphrase}
            onChange={setExportPassphrase}
            autoComplete="new-password"
          />
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
            <label htmlFor="backup-import-passphrase" className="text-sm font-medium flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              {t('label_import_passphrase')}
            </label>
            <PasswordInput
              id="backup-import-passphrase"
              value={pendingImportPassphrase}
              onChange={setPendingImportPassphrase}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmImport();
                }
              }}
              autoFocus
              autoComplete="off"
              className="bg-background"
            />
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
      </SettingsCard>
    </div>
  );
}
