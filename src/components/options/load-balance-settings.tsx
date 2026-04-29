import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { GlobalSettings } from '@/types';
import { t } from '@/lib/i18n';
import { Scale } from 'lucide-react';

interface OptionsLoadBalanceSettingsProps {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
}

export function OptionsLoadBalanceSettings({ settings, onSave }: OptionsLoadBalanceSettingsProps) {
  const { loadBalance, providers } = settings;

  const toggleProvider = (providerId: string) => {
    const exists = loadBalance.providers.find(p => p.providerId === providerId);
    let newProviders;
    if (exists) {
      newProviders = loadBalance.providers.filter(p => p.providerId !== providerId);
    } else {
      newProviders = [...loadBalance.providers, { providerId, weight: 1 }];
    }
    onSave({
      ...settings,
      loadBalance: { ...loadBalance, providers: newProviders },
    });
  };

  const updateWeight = (providerId: string, weight: number) => {
    const newProviders = loadBalance.providers.map(p =>
      p.providerId === providerId ? { ...p, weight: Math.max(1, Math.min(100, weight)) } : p
    );
    onSave({
      ...settings,
      loadBalance: { ...loadBalance, providers: newProviders },
    });
  };

  const updateModelId = (providerId: string, modelId: string) => {
    const newProviders = loadBalance.providers.map(p =>
      p.providerId === providerId
        ? { ...p, modelId: modelId || undefined }
        : p
    );
    onSave({
      ...settings,
      loadBalance: { ...loadBalance, providers: newProviders },
    });
  };

  const toggleEnabled = () => {
    onSave({
      ...settings,
      loadBalance: { ...loadBalance, enabled: !loadBalance.enabled },
    });
  };

  const activeCount = loadBalance.providers.length;
  const totalWeight = loadBalance.providers.reduce((sum, p) => sum + p.weight, 0);

  return (
    <div className="space-y-6">
      {/* Global toggle */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-violet-500" />
            <h3 className="text-lg font-semibold">{t('title_load_balance')}</h3>
          </div>
          <button
            onClick={toggleEnabled}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              loadBalance.enabled ? 'bg-violet-500' : 'bg-muted'
            )}
            disabled={activeCount === 0}
            aria-pressed={loadBalance.enabled}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                loadBalance.enabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{t('desc_load_balance')}</p>
        {loadBalance.enabled && activeCount === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">{t('warn_no_lb_providers')}</p>
        )}
      </div>

      {/* Provider selection */}
      <div className="rounded-lg border border-border divide-y divide-border">
        {providers.map((provider) => {
          const lbEntry = loadBalance.providers.find(p => p.providerId === provider.id);
          const isActive = !!lbEntry;
          const weight = lbEntry?.weight ?? 1;
          const percentage = isActive && totalWeight > 0
            ? Math.round((weight / totalWeight) * 100)
            : 0;

          const modelOptions = [
            { value: '', label: t('lb_model_default') },
            ...provider.models.map(m => ({ value: m.id, label: m.name })),
          ];

          return (
            <div key={provider.id} className="p-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => toggleProvider(provider.id)}
                  className="h-4 w-4 rounded border-border accent-violet-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{provider.name}</span>
                    <div className="flex gap-1">
                      {provider.models.slice(0, 3).map(m => (
                        <Badge key={m.id} variant="secondary" className="text-[10px]">
                          {m.name}
                        </Badge>
                      ))}
                      {provider.models.length > 3 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{provider.models.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{provider.baseURL}</p>
                </div>
                {isActive && (
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs text-muted-foreground">{t('label_weight')}</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={weight}
                      onChange={(e) => updateWeight(provider.id, parseInt(e.target.value) || 1)}
                      className="w-16 h-7 rounded-md border border-input bg-transparent px-2 text-sm text-center"
                    />
                    <Badge variant="outline" className="text-[10px] font-mono min-w-[36px] justify-center">
                      {percentage}%
                    </Badge>
                  </div>
                )}
              </div>
              {isActive && provider.models.length > 1 && (
                <div className="mt-2 ml-8 flex items-center gap-2">
                  <label className="text-xs text-muted-foreground shrink-0">{t('lb_preferred_model')}</label>
                  <Select
                    value={lbEntry?.modelId ?? ''}
                    options={modelOptions}
                    onChange={(v) => updateModelId(provider.id, v)}
                    className="flex-1 max-w-[220px]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeCount > 0 && (
        <p className="text-xs text-muted-foreground">{t('hint_load_balance')}</p>
      )}
    </div>
  );
}
