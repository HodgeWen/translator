import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@/assets/styles.css';
import { Toast } from '@/components/ui/toast';
import { OptionsProviderSettings } from '@/components/options/provider-settings';
import { OptionsLoadBalanceSettings } from '@/components/options/load-balance-settings';
import { OptionsLanguageSettings } from '@/components/options/language-settings';
import { OptionsGeneralSettings } from '@/components/options/general-settings';
import { OptionsDisplaySettings } from '@/components/options/display-settings';
import { OptionsBackupRestoreSettings } from '@/components/options/backup-restore-settings';
import { OptionsUserManual } from '@/components/options/user-manual';
import type { GlobalSettings } from '@/types';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/use-dark-mode';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '@/lib/storage';
import { t, setUILanguage } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { Languages, Server, Globe, Scale, Palette, Database, BookOpen } from 'lucide-react';

type Tab = 'providers' | 'loadbalance' | 'language' | 'display' | 'general' | 'backup' | 'manual';

function App() {
  const { toast, showSuccess, showError, dismiss } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('providers');
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [langVersion, setLangVersion] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  useDarkMode();

  const loadSettings = async () => {
    try {
      const s = await getSettings();
      await setUILanguage(s.uiLanguage);
      document.title = t('options_title');
      setSettings(s);
      setLangVersion((v) => v + 1);
    } catch {
      showError(t('error_load_settings'));
    }
  };

  const handleSave = async (newSettings: GlobalSettings) => {
    try {
      await saveSettings(newSettings);
      setSettings(newSettings);
    } catch (err) {
      showError(err instanceof Error ? err.message : t('error_save_failed'));
    }
  };

  const handleUILanguageChange = async (lang: string) => {
    await setUILanguage(lang);
    document.title = t('options_title');
    setLangVersion((v) => v + 1);
  };

  const handleImportSuccess = async () => {
    await loadSettings();
    showSuccess(t('options_imported'));
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'providers', label: t('tab_providers'), icon: <Server className="h-4 w-4" /> },
    { id: 'loadbalance', label: t('tab_load_balance'), icon: <Scale className="h-4 w-4" /> },
    { id: 'language', label: t('tab_language'), icon: <Languages className="h-4 w-4" /> },
    { id: 'display', label: t('tab_display'), icon: <Palette className="h-4 w-4" /> },
    { id: 'general', label: t('tab_general'), icon: <Globe className="h-4 w-4" /> },
    { id: 'backup', label: t('tab_backup_restore'), icon: <Database className="h-4 w-4" /> },
    { id: 'manual', label: t('tab_manual'), icon: <BookOpen className="h-4 w-4" /> },
  ];

  const i18nKey = langVersion;

  return (
    <div className="min-h-screen bg-background text-foreground" key={i18nKey}>
      <Toast toast={toast} onDismiss={dismiss} />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm">
              <Languages className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('options_title')}</h1>
              <p className="text-muted-foreground mt-1">{t('options_subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0',
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span className={cn(activeTab === tab.id ? 'text-indigo-500' : '')}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'providers' && (
          <OptionsProviderSettings
            settings={settings}
            onSave={handleSave}
            onError={showError}
          />
        )}

        {activeTab === 'loadbalance' && (
          <OptionsLoadBalanceSettings settings={settings} onSave={handleSave} />
        )}

        {activeTab === 'language' && (
          <OptionsLanguageSettings
            settings={settings}
            onSave={handleSave}
            onUILanguageChange={handleUILanguageChange}
          />
        )}

        {activeTab === 'display' && (
          <OptionsDisplaySettings settings={settings} onSave={handleSave} />
        )}

        {activeTab === 'general' && (
          <OptionsGeneralSettings
            settings={settings}
            onSave={handleSave}
          />
        )}

        {activeTab === 'backup' && (
          <OptionsBackupRestoreSettings
            settings={settings}
            onError={showError}
            onSuccess={showSuccess}
            onImportSuccess={handleImportSuccess}
          />
        )}

        {activeTab === 'manual' && <OptionsUserManual uiLanguage={settings.uiLanguage} />}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
