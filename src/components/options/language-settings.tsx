import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import type { GlobalSettings, LangDetectProvider } from '@/types';
import { t } from '@/lib/i18n';
import { LANGUAGE_OPTIONS } from '@/lib/languages';
import { Plus, Trash2, Languages, Type } from 'lucide-react';

interface OptionsLanguageSettingsProps {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
  onUILanguageChange: (lang: string) => Promise<void>;
}

export function OptionsLanguageSettings({ settings, onSave, onUILanguageChange }: OptionsLanguageSettingsProps) {
  const addDetectProvider = () => {
    const newProvider: LangDetectProvider = {
      id: crypto.randomUUID(),
      name: t('new_api_detector'),
      type: 'api',
      endpoint: '',
      timeout: 10000,
    };
    onSave({ ...settings, detectLangProviders: [...settings.detectLangProviders, newProvider] });
  };

  const addGoogleFreeProvider = () => {
    const exists = settings.detectLangProviders.some((p) => p.type === 'google_free');
    if (exists) return;
    const newProvider: LangDetectProvider = {
      id: crypto.randomUUID(),
      name: t('preset_google_free_name'),
      type: 'google_free',
      endpoint: 'https://translate.googleapis.com/translate_a/single',
      timeout: 10000,
    };
    onSave({ ...settings, detectLangProviders: [...settings.detectLangProviders, newProvider] });
  };

  const hasGoogleFree = settings.detectLangProviders.some((p) => p.type === 'google_free');

  const updateDetectProvider = (index: number, updates: Partial<LangDetectProvider>) => {
    const newProviders = [...settings.detectLangProviders];
    newProviders[index] = { ...newProviders[index], ...updates };
    onSave({ ...settings, detectLangProviders: newProviders });
  };

  const removeDetectProvider = (index: number) => {
    const newProviders = settings.detectLangProviders.filter((_, i) => i !== index);
    onSave({ ...settings, detectLangProviders: newProviders });
  };

  const handleUILanguageChange = async (lang: string) => {
    const newSettings = { ...settings, uiLanguage: lang };
    await onSave(newSettings);
    await onUILanguageChange(lang);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Languages className="h-4 w-4 text-indigo-500" />
            {t('label_ui_language')}
          </label>
          <Select
            value={settings.uiLanguage}
            options={[
              { value: 'zh-CN', label: 'Chinese (Simplified) / 简体中文' },
              { value: 'en', label: 'English / 英文' },
            ]}
            onChange={handleUILanguageChange}
          />
          <p className="text-xs text-muted-foreground">{t('hint_ui_language')}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4 text-violet-500" />
              {t('label_native_language')}
            </label>
            <Select
              value={settings.nativeLanguage}
              options={LANGUAGE_OPTIONS}
              onChange={(value) => onSave({ ...settings, nativeLanguage: value })}
            />
            <p className="text-xs text-muted-foreground">{t('hint_native_language')}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4 text-emerald-500" />
              {t('label_default_source_language')}
            </label>
            <Select
              value={settings.defaultSourceLanguage}
              options={LANGUAGE_OPTIONS}
              onChange={(value) => onSave({ ...settings, defaultSourceLanguage: value })}
            />
            <p className="text-xs text-muted-foreground">{t('hint_default_source_language')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('title_lang_detect_providers')}</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={addGoogleFreeProvider}
              disabled={hasGoogleFree}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t('btn_add_google_free_detector')}
            </Button>
            <Button size="sm" onClick={addDetectProvider} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="mr-1.5 h-4 w-4" />
              {t('btn_add_api_detector')}
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">{t('lang_detect_description')}</div>

        <div className="rounded-lg border border-border divide-y divide-border">
          {settings.detectLangProviders.map((provider, index) => (
            <div key={provider.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={provider.type === 'franc' ? 'default' : 'secondary'}>
                    {provider.type}
                  </Badge>
                  <span className="font-medium text-sm">{provider.name}</span>
                </div>
                {provider.type !== 'franc' && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeDetectProvider(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {provider.type === 'api' && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={provider.name}
                    onChange={(e) => updateDetectProvider(index, { name: e.target.value })}
                    placeholder={t('label_name')}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                  />
                  <input
                    type="text"
                    value={provider.endpoint || ''}
                    onChange={(e) => updateDetectProvider(index, { endpoint: e.target.value })}
                    placeholder={t('label_endpoint_url')}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                  />
                  <input
                    type="text"
                    value={provider.apiKey || ''}
                    onChange={(e) => updateDetectProvider(index, { apiKey: e.target.value })}
                    placeholder={t('label_api_key_optional')}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                  />
                  <input
                    type="number"
                    value={provider.timeout || 10000}
                    onChange={(e) => updateDetectProvider(index, { timeout: parseInt(e.target.value) || 10000 })}
                    placeholder={t('label_timeout')}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                  />
                </div>
              )}
              {provider.type === 'google_free' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t('hint_google_free_detector')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={provider.endpoint || ''}
                      onChange={(e) => updateDetectProvider(index, { endpoint: e.target.value })}
                      placeholder={t('label_endpoint_url')}
                      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                    />
                    <input
                      type="number"
                      value={provider.timeout || 10000}
                      onChange={(e) => updateDetectProvider(index, { timeout: parseInt(e.target.value) || 10000 })}
                      placeholder={t('label_timeout')}
                      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
