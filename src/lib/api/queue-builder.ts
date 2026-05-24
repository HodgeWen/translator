import type { GlobalSettings, TranslationService, ProviderConfig } from '@/types';

export interface ProviderModel {
  provider: ProviderConfig;
  model: { id: string; name: string };
}

const poolCounters = new Map<string, number>();

export function buildServiceQueue(settings: GlobalSettings, activeService: TranslationService): ProviderModel[] {
  // Clear stale keys from deleted/modified pools
  const activeKeys = new Set<string>();
  for (const s of settings.services) {
    if (s.type === 'pool') {
      for (const p of s.poolProviders) {
        activeKeys.add(`${s.id}:${p.providerId}`);
      }
    }
  }
  for (const key of poolCounters.keys()) {
    if (!activeKeys.has(key)) {
      poolCounters.delete(key);
    }
  }

  const queue: ProviderModel[] = [];
  const seen = new Set<string>();

  const addModel = (provider: ProviderConfig, model: { id: string; name: string }) => {
    const key = `${provider.id}:${model.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    queue.push({ provider, model });
  };

  if (activeService.type === 'single') {
    const provider = settings.providers.find(p => p.id === activeService.providerId);
    if (!provider) return [];

    const mainModel = provider.models.find(m => m.id === activeService.modelId);
    if (mainModel) {
      addModel(provider, mainModel);
    }

    if (activeService.fallbackEnabled) {
      // 在同 Provider 内部其余模型中降级
      for (const model of provider.models) {
        addModel(provider, model);
      }
    }
  } else if (activeService.type === 'pool') {
    const activeEntries = activeService.poolProviders.filter(entry => {
      return settings.providers.some(p => p.id === entry.providerId && p.models.length > 0);
    });

    if (activeEntries.length === 0) return [];

    // 加权轮询挑选首选成员
    let minRatio = Infinity;
    let pickedIdx = 0;
    for (let i = 0; i < activeEntries.length; i++) {
      const entry = activeEntries[i];
      const counterKey = `${activeService.id}:${entry.providerId}`;
      const count = poolCounters.get(counterKey) ?? 0;
      const ratio = count / entry.weight;
      if (ratio < minRatio) {
        minRatio = ratio;
        pickedIdx = i;
      }
    }

    const picked = activeEntries[pickedIdx];
    const pickedCounterKey = `${activeService.id}:${picked.providerId}`;
    poolCounters.set(pickedCounterKey, (poolCounters.get(pickedCounterKey) ?? 0) + 1);

    // 将首选成员及其模型排在最前
    const pickedProvider = settings.providers.find(p => p.id === picked.providerId);
    if (pickedProvider) {
      const prefModel = picked.modelId 
        ? pickedProvider.models.find(m => m.id === picked.modelId)
        : pickedProvider.models[0];
      if (prefModel) {
        addModel(pickedProvider, prefModel);
      }
      for (const m of pickedProvider.models) {
        addModel(pickedProvider, m);
      }
    }

    // 将 Pool 里的其余成员按顺序作为降级通道
    for (const entry of activeEntries) {
      if (entry.providerId === picked.providerId) continue;
      const provider = settings.providers.find(p => p.id === entry.providerId);
      if (!provider) continue;
      const prefModel = entry.modelId 
        ? provider.models.find(m => m.id === entry.modelId)
        : provider.models[0];
      if (prefModel) {
        addModel(provider, prefModel);
      }
      for (const m of provider.models) {
        addModel(provider, m);
      }
    }
  }

  return queue;
}
