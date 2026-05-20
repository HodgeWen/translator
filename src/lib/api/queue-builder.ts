import type { GlobalSettings, ProviderConfig } from '@/types';

export interface ProviderModel {
  provider: ProviderConfig;
  model: { id: string; name: string };
}

// ─── Fallback Queue ──────────────────────────────────────────────────────
// 顺序：选中的模型 → 同 provider 剩余模型（按配置顺序）→ 其他 provider 所有模型（按 provider 配置顺序）

export function buildFallbackQueue(settings: GlobalSettings): ProviderModel[] {
  const { providers, selectedProviderId, selectedModelId } = settings;
  const queue: ProviderModel[] = [];
  const seen = new Set<string>();

  const addModel = (provider: ProviderConfig, model: { id: string; name: string }) => {
    const key = `${provider.id}:${model.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    queue.push({ provider, model });
  };

  // 1. 选中的模型
  const selectedProvider = providers.find(p => p.id === selectedProviderId);
  if (selectedProvider) {
    const selectedModel = selectedProvider.models.find(m => m.id === selectedModelId);
    if (selectedModel) {
      addModel(selectedProvider, selectedModel);
    }
    // 2. 同 provider 剩余模型
    for (const model of selectedProvider.models) {
      addModel(selectedProvider, model);
    }
  }

  // 3. 其他 provider 所有模型
  for (const provider of providers) {
    for (const model of provider.models) {
      addModel(provider, model);
    }
  }

  return queue;
}

// ─── Load Balance (Weighted Round-Robin) ─────────────────────────────────
// 模块级计数器：跟踪各 provider 已分配次数，实现加权轮询。
const lbCounter = new Map<string, number>();

export function pickLoadBalanceQueue(settings: GlobalSettings): ProviderModel[] {
  const { loadBalance, providers } = settings;
  const activeEntries = loadBalance.providers.filter(lbp => {
    return providers.some(p => p.id === lbp.providerId && p.models.length > 0);
  });

  if (activeEntries.length === 0) return [];

  // 清理已删除 provider 残留在 lbCounter 的计数，防止 SW 长期存活时缓慢泄漏。
  const activeIds = new Set(activeEntries.map(e => e.providerId));
  for (const id of lbCounter.keys()) {
    if (!activeIds.has(id)) lbCounter.delete(id);
  }

  // 加权轮询：选 counter/weight 最小的 provider
  let minRatio = Infinity;
  let pickedIdx = 0;
  for (let i = 0; i < activeEntries.length; i++) {
    const entry = activeEntries[i];
    const count = lbCounter.get(entry.providerId) ?? 0;
    const ratio = count / entry.weight;
    if (ratio < minRatio) {
      minRatio = ratio;
      pickedIdx = i;
    }
  }

  const picked = activeEntries[pickedIdx];
  lbCounter.set(picked.providerId, (lbCounter.get(picked.providerId) ?? 0) + 1);

  // 构建单个 provider 的模型队列：选中模型优先 → 其余按配置顺序
  const buildProviderModels = (
    provider: ProviderConfig,
    lbEntry: { modelId?: string }
  ): ProviderModel[] => {
    const result: ProviderModel[] = [];
    const seen = new Set<string>();

    // 优先使用指定模型
    if (lbEntry.modelId) {
      const selectedModel = provider.models.find(m => m.id === lbEntry.modelId);
      if (selectedModel) {
        seen.add(selectedModel.id);
        result.push({ provider, model: selectedModel });
      }
    }

    // 剩余模型按配置顺序
    for (const model of provider.models) {
      if (!seen.has(model.id)) {
        seen.add(model.id);
        result.push({ provider, model });
      }
    }

    return result;
  };

  const queue: ProviderModel[] = [];
  const seenKeys = new Set<string>();

  const addModels = (models: ProviderModel[]) => {
    for (const pm of models) {
      const key = `${pm.provider.id}:${pm.model.id}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        queue.push(pm);
      }
    }
  };

  // 先放选中的 provider
  const pickedProvider = providers.find(p => p.id === picked.providerId);
  if (pickedProvider) {
    addModels(buildProviderModels(pickedProvider, picked));
  }

  // 再放其余参与负载的 provider
  for (const entry of activeEntries) {
    if (entry.providerId === picked.providerId) continue;
    const provider = providers.find(p => p.id === entry.providerId);
    if (!provider) continue;
    addModels(buildProviderModels(provider, entry));
  }

  return queue;
}
