import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CodeEditor } from '@/components/code-editor';
import { KeyValueList } from './key-value-list';
import type { ProviderConfig, GlobalSettings } from '@/types';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Save, Eye, EyeOff, FileText, Sliders, ArrowUp, ArrowDown } from 'lucide-react';

interface OptionsProviderSettingsProps {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
  onError: (message: string) => void;
}

export function OptionsProviderSettings({ settings, onSave, onError }: OptionsProviderSettingsProps) {
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleAddProvider = () => {
    const newProvider: ProviderConfig = {
      id: crypto.randomUUID(),
      name: t('new_provider'),
      baseURL: 'https://api.openai.com/v1/chat/completions',
      apiKey: '',
      headers: {},
      query: {},
      body: {},
      temperature: 0.3,
      stream: false,
      models: [{ id: 'gpt-4o', name: 'GPT-4o' }],
    };
    setEditingProvider(newProvider);
    setIsAddingProvider(true);
    setShowApiKey(false);
  };

  const handleEditProvider = (provider: ProviderConfig) => {
    setEditingProvider({ ...provider });
    setIsAddingProvider(false);
    setShowApiKey(false);
  };

  const handleDeleteProvider = (providerId: string) => {
    const newProviders = settings.providers.filter((p) => p.id !== providerId);
    // 同时清理负载均衡中对该 provider 的引用
    const newLbProviders = settings.loadBalance.providers.filter(p => p.providerId !== providerId);
    onSave({
      ...settings,
      providers: newProviders,
      loadBalance: { ...settings.loadBalance, providers: newLbProviders },
    });
  };

  const handleSaveProvider = () => {
    if (!editingProvider) return;
    if (!editingProvider.name.trim() || !editingProvider.baseURL.trim()) {
      onError(t('error_required_fields'));
      return;
    }

    let newProviders: ProviderConfig[];
    if (isAddingProvider) {
      newProviders = [...settings.providers, editingProvider];
    } else {
      newProviders = settings.providers.map((p) => (p.id === editingProvider.id ? editingProvider : p));
    }

    onSave({ ...settings, providers: newProviders });
    setEditingProvider(null);
    setIsAddingProvider(false);
  };

  const updateEditingProvider = (updates: Partial<ProviderConfig>) => {
    if (!editingProvider) return;
    setEditingProvider({ ...editingProvider, ...updates });
  };

  const updateEditingModels = (models: ProviderConfig['models']) => {
    if (!editingProvider) return;
    setEditingProvider({ ...editingProvider, models });
  };

  if (editingProvider) {
    const temperature = editingProvider.temperature ?? 0.3;
    const topPEnabled = editingProvider.topP !== undefined;
    const topP = editingProvider.topP ?? 1.0;
    const maxTokensInput = editingProvider.maxTokens === undefined ? '' : String(editingProvider.maxTokens);
    const stream = editingProvider.stream === true;

    return (
      <div className="rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold">
            {isAddingProvider ? t('title_add_provider') : t('title_edit_provider')}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('label_name')}</label>
            <input
              type="text"
              value={editingProvider.name}
              onChange={(e) => updateEditingProvider({ name: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('label_base_url')}</label>
            <input
              type="text"
              value={editingProvider.baseURL}
              onChange={(e) => updateEditingProvider({ baseURL: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('label_api_key')}</label>
          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={editingProvider.apiKey}
              onChange={(e) => updateEditingProvider({ apiKey: e.target.value })}
              placeholder={t('placeholder_api_key')}
              className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setShowApiKey(!showApiKey)}
              title={showApiKey ? t('btn_hide') : t('btn_show')}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('hint_api_key')}</p>
        </div>

        <div className="space-y-2">
          <KeyValueList
            label={t('label_headers')}
            items={editingProvider.headers}
            onChange={(headers) => updateEditingProvider({ headers })}
          />
          <p className="text-xs text-muted-foreground">{t('hint_content_type_auto')}</p>
        </div>

        <KeyValueList
          label={t('label_query_params')}
          items={editingProvider.query}
          onChange={(query) => updateEditingProvider({ query })}
        />

        <div className="space-y-4 rounded-md border border-border p-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-medium">{t('label_sampling')}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm">{t('label_temperature')}</label>
              <Badge variant="secondary" className="font-mono text-[11px]">
                {temperature.toFixed(2)}
              </Badge>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={temperature}
              onChange={(e) => updateEditingProvider({ temperature: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm">{t('label_top_p')}</label>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    'font-mono text-[11px]',
                    !topPEnabled && 'opacity-40'
                  )}
                >
                  {topP.toFixed(2)}
                </Badge>
                <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={topPEnabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateEditingProvider({ topP: editingProvider.topP ?? 1.0 });
                      } else {
                        updateEditingProvider({ topP: undefined });
                      }
                    }}
                    className="accent-indigo-500"
                  />
                  {t('label_top_p_enable')}
                </label>
              </div>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={topP}
              disabled={!topPEnabled}
              onChange={(e) => updateEditingProvider({ topP: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 disabled:opacity-40"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm">{t('label_max_tokens')}</label>
            <input
              type="number"
              min={1}
              value={maxTokensInput}
              placeholder="—"
              onChange={(e) => {
                const v = e.target.value.trim();
                if (v === '') {
                  updateEditingProvider({ maxTokens: undefined });
                } else {
                  const n = parseInt(v, 10);
                  if (Number.isFinite(n) && n > 0) {
                    updateEditingProvider({ maxTokens: n });
                  }
                }
              }}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>
        </div>

        <div className="rounded-md border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('label_stream')}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t('hint_stream')}</div>
            </div>
            <button
              type="button"
              onClick={() => updateEditingProvider({ stream: !stream })}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                stream ? 'bg-indigo-500' : 'bg-muted'
              )}
              aria-pressed={stream}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  stream ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('label_extra_body')}</label>
          <p className="text-xs text-muted-foreground">{t('hint_extra_body_override')}</p>
          <CodeEditor
            value={JSON.stringify(editingProvider.body, null, 2)}
            onChange={(value) => {
              try {
                const body = JSON.parse(value);
                updateEditingProvider({ body });
              } catch {
                // Ignore invalid JSON during typing
              }
            }}
            height="150px"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" />
            {t('label_provider_prompt')}
          </label>
          <textarea
            value={editingProvider.prompt || ''}
            onChange={(e) => updateEditingProvider({ prompt: e.target.value })}
            placeholder={t('placeholder_provider_prompt')}
            rows={4}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y"
          />
          <p className="text-xs text-muted-foreground">{t('hint_provider_prompt')}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('label_models')}</label>
          <p className="text-xs text-muted-foreground">{t('hint_model_order')}</p>
          {editingProvider.models.map((model, index) => (
            <div key={index} className="flex gap-2 items-center">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  className="h-3.5 w-5 flex items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-default"
                  disabled={index === 0}
                  onClick={() => {
                    const newModels = [...editingProvider.models];
                    [newModels[index - 1], newModels[index]] = [newModels[index], newModels[index - 1]];
                    updateEditingModels(newModels);
                  }}
                  title={t('btn_move_up')}
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="h-3.5 w-5 flex items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-default"
                  disabled={index === editingProvider.models.length - 1}
                  onClick={() => {
                    const newModels = [...editingProvider.models];
                    [newModels[index], newModels[index + 1]] = [newModels[index + 1], newModels[index]];
                    updateEditingModels(newModels);
                  }}
                  title={t('btn_move_down')}
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <input
                type="text"
                value={model.id}
                onChange={(e) => {
                  const newModels = [...editingProvider.models];
                  newModels[index] = { ...newModels[index], id: e.target.value };
                  updateEditingModels(newModels);
                }}
                placeholder={t('label_model_id')}
                className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              />
              <input
                type="text"
                value={model.name}
                onChange={(e) => {
                  const newModels = [...editingProvider.models];
                  newModels[index] = { ...newModels[index], name: e.target.value };
                  updateEditingModels(newModels);
                }}
                placeholder={t('label_display_name')}
                className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const newModels = editingProvider.models.filter((_, i) => i !== index);
                  updateEditingModels(newModels);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => updateEditingModels([...editingProvider.models, { id: '', name: '' }])}
          >
            <Plus className="mr-1 h-3 w-3" />
            {t('btn_add_model')}
          </Button>
        </div>

        {/* Sticky save bar */}
        <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-border bg-background/95 backdrop-blur-sm rounded-b-lg">
          <div className="px-6 py-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditingProvider(null); setIsAddingProvider(false); }}>
              {t('btn_cancel')}
            </Button>
            <Button size="sm" onClick={handleSaveProvider} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Save className="mr-1.5 h-4 w-4" />
              {t('btn_save')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleAddProvider} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="mr-1.5 h-4 w-4" />
          {t('btn_add_provider')}
        </Button>
      </div>
      <div className="space-y-3">
        {settings.providers.map((provider) => (
          <div
            key={provider.id}
            className="rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{provider.name}</h3>
                  {provider.apiKey && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
                      API Key
                    </Badge>
                  )}
                  {provider.prompt && (
                    <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400">
                      Custom Prompt
                    </Badge>
                  )}
                  {provider.stream === true && (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
                      {t('badge_stream')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{provider.baseURL}</p>
                <div className="flex gap-1 mt-2">
                  {provider.models.map((m) => (
                    <Badge key={m.id} variant="secondary" className="text-[10px]">
                      {m.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEditProvider(provider)}>
                  {t('btn_edit')}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteProvider(provider.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
