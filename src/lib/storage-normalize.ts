import type { ValidatedSettings, SettingsWarning } from './schema';

// provider 历史数据归一化 + 悬空引用诊断。
// 这两块都是「读入用户配置后、交给上层之前」的纯函数转换，与 chrome.storage
// 分片布局无关，因此从 storage.ts 拆出；storage.ts 仍在读取/保存/导入的同一
// 位置调用它们，行为不变。

type ValidatedProvider = ValidatedSettings['providers'][number];

// 旧版 provider 的 body.* 采样字段一次性平滑迁移到独立字段（幂等）。
// 同时清理 headers 中冗余的默认 Content-Type（请求层会自动注入）。
const MIGRATIONS: { key: keyof ValidatedProvider; bodyKey: string; type: 'number' | 'boolean' }[] = [
  { key: 'temperature', bodyKey: 'temperature', type: 'number' },
  { key: 'topP', bodyKey: 'top_p', type: 'number' },
  { key: 'maxTokens', bodyKey: 'max_tokens', type: 'number' },
  { key: 'stream', bodyKey: 'stream', type: 'boolean' },
];

// 幂等性说明：第二次执行时 headers 里已无 application/json、body 里采样字段已删除、
// temperature/topP/maxTokens/stream 已是独立字段，因此结果与第一次完全一致。
function normalizeProvider(provider: ValidatedProvider): ValidatedProvider {
  const body = { ...provider.body };
  const headers = { ...provider.headers };

  for (const headerKey of Object.keys(headers)) {
    const val = headers[headerKey];
    if (
      headerKey.toLowerCase() === 'content-type' &&
      typeof val === 'string' &&
      val.toLowerCase() === 'application/json'
    ) {
      delete headers[headerKey];
    }
  }

  const migrated: Partial<Pick<ValidatedProvider, 'temperature' | 'topP' | 'maxTokens' | 'stream'>> = {};
  for (const { key, bodyKey, type } of MIGRATIONS) {
    if (provider[key] === undefined && typeof (body as Record<string, unknown>)[bodyKey] === type) {
      (migrated as Record<string, unknown>)[key] = (body as Record<string, unknown>)[bodyKey];
    }
    if (typeof (body as Record<string, unknown>)[bodyKey] === type) {
      delete (body as Record<string, unknown>)[bodyKey];
    }
  }

  return {
    ...provider,
    headers,
    body,
    ...migrated,
    stream: (migrated.stream ?? provider.stream ?? false) as boolean,
  };
}

export function normalizeSettings(settings: ValidatedSettings): ValidatedSettings {
  return {
    ...settings,
    providers: settings.providers.map(normalizeProvider),
  };
}

/**
 * 悬空引用诊断：丢弃非法 provider/service 后，selectedProviderId、selectedModelId、
 * selectedServiceId 以及 service 内引用的 providerId 可能指向已不存在的条目。
 * 这里只做提示（不擅自改写用户选择），方便 UI 提示「所选服务商已失效」。
 */
export function collectDanglingReferenceWarnings(settings: ValidatedSettings): SettingsWarning[] {
  const warnings: SettingsWarning[] = [];
  const providerIds = new Set(settings.providers.map((provider) => provider.id));

  if (settings.selectedProviderId && !providerIds.has(settings.selectedProviderId)) {
    warnings.push({
      code: 'SETTINGS_DANGLING_REFERENCE',
      path: 'selectedProviderId',
      message: `当前选中的服务商 ${settings.selectedProviderId} 已不存在`,
    });
  }

  settings.services.forEach((service, index) => {
    const refs =
      service.type === 'single'
        ? [service.providerId]
        : service.poolProviders.map((entry) => entry.providerId);
    const missing = refs.filter((id) => !providerIds.has(id));
    if (missing.length > 0) {
      warnings.push({
        code: 'SETTINGS_DANGLING_REFERENCE',
        path: `services[${index}]`,
        message: `服务 ${service.id} 引用的服务商已不存在：${missing.join(', ')}`,
      });
    }
  });

  return warnings;
}
