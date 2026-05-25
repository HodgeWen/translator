import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProviderEditForm } from './provider-edit-form';
import type { ProviderConfig, GlobalSettings } from '@/types';
import { t } from '@/lib/i18n';
import { Plus, Trash2 } from 'lucide-react';

interface OptionsProviderSettingsProps {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
  onError: (message: string) => void;
}

export function OptionsProviderSettings({ settings, onSave, onError }: OptionsProviderSettingsProps) {
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState(false);

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
  };

  const handleEditProvider = (provider: ProviderConfig) => {
    setEditingProvider({ ...provider });
    setIsAddingProvider(false);
  };

  const handleDeleteProvider = (providerId: string) => {
    const newProviders = settings.providers.filter((p) => p.id !== providerId);
    
    // 级联清理已失效的翻译服务
    const newServices = settings.services
      .map(service => {
        if (service.type === 'single') {
          return service.providerId === providerId ? null : service;
        } else {
          const nextPool = service.poolProviders.filter(p => p.providerId !== providerId);
          if (nextPool.length === 0) return null;
          return { ...service, poolProviders: nextPool };
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    // 若当前选中的服务被删除了，重新选中第一个服务
    let nextSelectedId = settings.selectedServiceId;
    if (!newServices.some(s => s.id === nextSelectedId)) {
      nextSelectedId = newServices[0]?.id || '';
    }

    onSave({
      ...settings,
      providers: newProviders,
      services: newServices,
      selectedServiceId: nextSelectedId
    });
  };

  const handleSaveProvider = (savedProvider: ProviderConfig) => {
    let newProviders: ProviderConfig[];
    if (isAddingProvider) {
      newProviders = [...settings.providers, savedProvider];
    } else {
      newProviders = settings.providers.map((p) => (p.id === savedProvider.id ? savedProvider : p));
    }

    onSave({ ...settings, providers: newProviders });
    setEditingProvider(null);
    setIsAddingProvider(false);
  };

  if (editingProvider) {
    return (
      <ProviderEditForm
        provider={editingProvider}
        isAddingProvider={isAddingProvider}
        nativeLanguage={settings.nativeLanguage}
        onSave={handleSaveProvider}
        onCancel={() => {
          setEditingProvider(null);
          setIsAddingProvider(false);
        }}
        onError={onError}
      />
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
