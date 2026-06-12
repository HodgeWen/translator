import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { GlobalSettings, TranslationService, SingleService, PoolService } from '@/types';
import { t } from '@/lib/i18n';
import { Plus, Trash2, Edit2, Settings2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NumberInput } from '@/components/ui/number-input';

interface OptionsServicesSettingsProps {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
}

// 内置系统提示词预设，用于快捷填充
const SYSTEM_PRESETS = [
  { id: 'academic', name: '标准学术翻译', content: 'You are a professional academic translator. Translate the text into clear, precise, and formal academic prose, maintaining the scholarly tone and terminology.' }
];

export function OptionsServicesSettings({ settings, onSave }: OptionsServicesSettingsProps) {
  const [editingService, setEditingService] = useState<TranslationService | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  const poolProviders = editingService && editingService.type === 'pool' ? (editingService as PoolService).poolProviders : [];
  const totalWeight = poolProviders.reduce((sum, item) => sum + (item.weight || 0), 0);

  // 常用风格与语气选项列表，合并内置与自定义语气
  const toneOptions = [
    { value: 'personal_default', label: '使用个人默认' },
    { value: 'normal', label: t('tone_normal') },
    { value: 'technical', label: t('tone_technical') },
    { value: 'tech_forward', label: t('tone_tech_forward') },
    { value: 'humorous', label: t('tone_humorous') },
    { value: 'literary', label: t('tone_literary') },
    { value: 'formal', label: t('tone_formal') },
    { value: 'colloquial', label: t('tone_colloquial') },
    ...settings.customTones.map(t => ({ value: t.id, label: t.name }))
  ];

  const displayStyleOptions = [
    { value: 'personal_default', label: '使用个人默认' },
    { value: 'original', label: t('style_original') },
    { value: 'bilingual', label: t('style_bilingual') },
    { value: 'underline', label: t('style_underline') },
    { value: 'clean', label: t('style_clean') }
  ];

  const handleAdd = () => {
    const newService: SingleService = {
      id: crypto.randomUUID(),
      name: '新建翻译服务',
      type: 'single',
      providerId: settings.providers[0]?.id || '',
      modelId: settings.providers[0]?.models[0]?.id || '',
      fallbackEnabled: true,
      defaultDisplayStyle: 'personal_default',
      defaultTranslationTone: 'personal_default',
      promptMode: 'append',
      enablePolysemy: false,
    };
    setEditingService(newService);
    setIsAdding(true);
    setAdvancedOpen(false);
  };

  const handleEdit = (service: TranslationService) => {
    setEditingService(JSON.parse(JSON.stringify(service))); // 深度拷贝
    setIsAdding(false);
    setAdvancedOpen(false);
  };

  const handleDelete = (serviceId: string) => {
    const nextServices = settings.services.filter(s => s.id !== serviceId);
    // 若删除了当前选中的服务，重置为第一个
    let nextSelectedId = settings.selectedServiceId;
    if (nextSelectedId === serviceId) {
      nextSelectedId = nextServices[0]?.id || '';
    }
    onSave({
      ...settings,
      services: nextServices,
      selectedServiceId: nextSelectedId
    });
  };

  const handleSelectActive = (serviceId: string) => {
    onSave({
      ...settings,
      selectedServiceId: serviceId
    });
  };

  const handleSaveService = () => {
    if (!editingService || !editingService.name.trim()) return;

    let nextServices: TranslationService[];
    if (isAdding) {
      nextServices = [...settings.services, editingService];
    } else {
      nextServices = settings.services.map(s => s.id === editingService.id ? editingService : s);
    }

    // 默认选中新添加的服务
    const nextSelectedId = settings.selectedServiceId || editingService.id;

    onSave({
      ...settings,
      services: nextServices,
      selectedServiceId: nextSelectedId
    });

    setEditingService(null);
    setIsAdding(false);
  };

  const handleApplyPreset = (content: string) => {
    if (!editingService) return;
    setEditingService({
      ...editingService,
      prompt: content
    });
    setShowPresetMenu(false);
  };

  // 辅助获取 Provider 的 Model 选项
  const getModelOptions = (providerId: string) => {
    const provider = settings.providers.find(p => p.id === providerId);
    return provider?.models.map(m => ({ value: m.id, label: m.name })) || [];
  };

  // Pool 类型中添加一行 Provider-Model
  const handleAddPoolRow = () => {
    if (!editingService || editingService.type !== 'pool') return;
    const firstProvider = settings.providers[0];
    if (!firstProvider) return;

    const newRow = {
      providerId: firstProvider.id,
      modelId: firstProvider.models[0]?.id,
      weight: 1
    };

    setEditingService({
      ...editingService,
      poolProviders: [...editingService.poolProviders, newRow]
    });
  };

  const handleRemovePoolRow = (index: number) => {
    if (!editingService || editingService.type !== 'pool') return;
    const nextPool = editingService.poolProviders.filter((_, i) => i !== index);
    setEditingService({
      ...editingService,
      poolProviders: nextPool
    });
  };

  const handlePoolRowChange = (index: number, key: string, value: any) => {
    if (!editingService || editingService.type !== 'pool') return;
    const nextPool = [...editingService.poolProviders];

    if (key === 'providerId') {
      const provider = settings.providers.find(p => p.id === value);
      nextPool[index] = {
        providerId: value,
        modelId: provider?.models[0]?.id || '',
        weight: nextPool[index].weight
      };
    } else {
      nextPool[index] = {
        ...nextPool[index],
        [key]: value
      };
    }

    setEditingService({
      ...editingService,
      poolProviders: nextPool
    });
  };

  return (
    <div className="space-y-6">
      {editingService ? (
        <div className="rounded-lg border border-border p-6 bg-card space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {isAdding ? '添加翻译服务' : '编辑翻译服务'}
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingService(null)}>
                {t('btn_cancel')}
              </Button>
              <Button size="sm" onClick={handleSaveService} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {t('btn_save')}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">服务名称</label>
              <input
                type="text"
                value={editingService.name}
                onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">服务类型</label>
              <Select
                value={editingService.type}
                options={[
                  { value: 'single', label: '单提供商服务 (Single)' },
                  { value: 'pool', label: '加权负载翻译池 (Pool)' }
                ]}
                disabled={!isAdding}
                onChange={val => {
                  if (val === 'single') {
                    setEditingService({
                      ...editingService,
                      type: 'single',
                      providerId: settings.providers[0]?.id || '',
                      modelId: settings.providers[0]?.models[0]?.id || '',
                      fallbackEnabled: true
                    } as SingleService);
                  } else {
                    setEditingService({
                      ...editingService,
                      type: 'pool',
                      poolProviders: [
                        { providerId: settings.providers[0]?.id || '', modelId: settings.providers[0]?.models[0]?.id || '', weight: 1 }
                      ]
                    } as PoolService);
                  }
                }}
              />
            </div>
          </div>

          {/* Single Service Details */}
          {editingService.type === 'single' && (
            <div className="rounded-md border border-border p-4 bg-muted/10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">底层 Provider</label>
                  <Select
                    value={(editingService as SingleService).providerId}
                    options={settings.providers.map(p => ({ value: p.id, label: p.name }))}
                    onChange={val => {
                      const models = getModelOptions(val);
                      setEditingService({
                        ...editingService,
                        providerId: val,
                        modelId: models[0]?.value || ''
                      } as SingleService);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">翻译 Model</label>
                  <Select
                    value={(editingService as SingleService).modelId}
                    options={getModelOptions((editingService as SingleService).providerId)}
                    onChange={val => setEditingService({ ...editingService, modelId: val } as SingleService)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-sm font-medium">内部模型自动降级 (Fallback)</div>
                  <div className="text-xs text-muted-foreground">如果首选模型响应失败，尝试使用该 Provider 的其余模型作为备份</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingService({
                    ...editingService,
                    fallbackEnabled: !(editingService as SingleService).fallbackEnabled
                  } as SingleService)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    (editingService as SingleService).fallbackEnabled ? 'bg-indigo-500' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      (editingService as SingleService).fallbackEnabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Pool Service Details */}
          {editingService.type === 'pool' && (
            <div className="rounded-md border border-border p-4 bg-muted/10 space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">翻译池提供商与模型组合</label>
                <Button variant="outline" size="sm" onClick={handleAddPoolRow}>
                  添加提供商-模型
                </Button>
              </div>

              <div className="space-y-3">
                {(editingService as PoolService).poolProviders.map((row, index) => {
                  const percentage = totalWeight > 0 ? ((row.weight || 0) / totalWeight * 100).toFixed(1) : '0.0';
                  return (
                    <div key={index} className="flex gap-3 items-end bg-background p-3 rounded border border-border">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs text-muted-foreground">提供商</label>
                        <Select
                          value={row.providerId}
                          options={settings.providers.map(p => ({ value: p.id, label: p.name }))}
                          onChange={val => handlePoolRowChange(index, 'providerId', val)}
                        />
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs text-muted-foreground">模型 (选填)</label>
                        <Select
                          value={row.modelId || ''}
                          options={[{ value: '', label: '使用默认第一个' }, ...getModelOptions(row.providerId)]}
                          onChange={val => handlePoolRowChange(index, 'modelId', val || undefined)}
                        />
                      </div>

                      <div className="w-32 space-y-1.5" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <label>权重</label>
                          <span className="text-[10px] text-indigo-500 font-mono font-medium">
                            {percentage}%
                          </span>
                        </div>
                        <NumberInput
                          min={1}
                          max={100}
                          value={row.weight}
                          onChange={val => handlePoolRowChange(index, 'weight', val)}
                          className="w-full"
                        />
                      </div>

                      <Button
                        variant="destructive"
                        className="h-9 px-3 shrink-0"
                        onClick={() => handleRemovePoolRow(index)}
                        disabled={(editingService as PoolService).poolProviders.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsible Advanced Config Accordion */}
          <div className="border border-border rounded-md bg-background">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-foreground/80">
                <Settings2 className="h-4 w-4 text-indigo-500" />
                <span>服务高级配置</span>
              </div>
              {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {advancedOpen && (
              <div className="p-4 space-y-4 border-t border-border bg-card">
                {/* Service Specific Prompt */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium flex items-center gap-1">
                      自定义 Prompt
                    </label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={editingService.promptMode || 'append'}
                        options={[
                          { value: 'append', label: '非覆盖 (追加)' },
                          { value: 'override', label: '覆盖全局 Prompt' }
                        ]}
                        compact
                        className="w-[140px] h-7 text-xs"
                        onChange={val => setEditingService({
                          ...editingService,
                          promptMode: val as 'append' | 'override'
                        })}
                      />
                      <div className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/20"
                          onClick={() => setShowPresetMenu(!showPresetMenu)}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>应用预设</span>
                        </Button>

                      {showPresetMenu && (
                        <div className="absolute right-0 mt-1 w-64 rounded-md border border-border bg-popover shadow-lg z-50 py-1 overflow-hidden">
                          <div className="text-[10px] font-semibold text-muted-foreground px-3 py-1.5 bg-muted/30 border-b border-border">内置预设</div>
                          {SYSTEM_PRESETS.map(preset => (
                            <button
                              key={preset.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors border-b border-border/50 text-foreground"
                              onClick={() => handleApplyPreset(preset.content)}
                            >
                              <div className="font-semibold">{preset.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{preset.content}</div>
                            </button>
                          ))}

                          {settings.customPresetPrompts.length > 0 && (
                            <>
                              <div className="text-[10px] font-semibold text-muted-foreground px-3 py-1.5 bg-muted/30 border-b border-border">用户自定义</div>
                              {settings.customPresetPrompts.map(preset => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors border-b border-border/50 text-foreground"
                                  onClick={() => handleApplyPreset(preset.content)}
                                >
                                  <div className="font-semibold">{preset.name}</div>
                                  <div className="text-[10px] text-muted-foreground truncate">{preset.content}</div>
                                </button>
                              ))}
                            </>
                          )}

                          <div className="p-1.5 bg-muted/10 text-[10px] text-muted-foreground text-center">
                            可以在「预设与风格」Tab 中管理自定义提示词
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                  <Textarea
                    placeholder="留空以使用全局翻译提示词..."
                    value={editingService.prompt || ''}
                    onChange={e => setEditingService({ ...editingService, prompt: e.target.value })}
                    className="font-mono text-xs min-h-[80px]"
                  />
                </div>

                {/* Polysemy Switch */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div>
                    <div className="text-sm font-medium">启用多义词词典式翻译 (Polysemy)</div>
                    <div className="text-xs text-muted-foreground">当输入为单个词或短语时，自动提供词性、多义项对比及英文音标释义</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingService({
                      ...editingService,
                      enablePolysemy: !editingService.enablePolysemy
                    })}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      editingService.enablePolysemy ? 'bg-indigo-500' : 'bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        editingService.enablePolysemy ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {/* Cascade Default Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">服务默认展示样式</label>
                    <Select
                      value={editingService.defaultDisplayStyle}
                      options={displayStyleOptions}
                      onChange={val => setEditingService({
                        ...editingService,
                        defaultDisplayStyle: val as any
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">服务默认翻译语气</label>
                    <Select
                      value={editingService.defaultTranslationTone}
                      options={toneOptions}
                      onChange={val => setEditingService({
                        ...editingService,
                        defaultTranslationTone: val
                      })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">翻译服务配置</h3>
              <p className="text-xs text-muted-foreground">设置 Single (单服务商) 或 Pool (翻译池) 组合，作为主要的翻译通道</p>
            </div>
            <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Plus className="mr-1.5 h-4 w-4" />
              新建翻译服务
            </Button>
          </div>

          {settings.services.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-10 bg-muted/10">
              <Settings2 className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <div className="font-semibold text-muted-foreground">未配置任何翻译服务</div>
              <div className="text-xs text-muted-foreground mt-1 mb-4">请点击右上角新建一个翻译服务</div>
              <Button size="sm" onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                立即新建
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.services.map(service => {
                const isActive = settings.selectedServiceId === service.id;
                return (
                  <div
                    key={service.id}
                    onClick={() => handleSelectActive(service.id)}
                    className={cn(
                      'rounded-lg border p-4 transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 bg-card',
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 ring-1 ring-indigo-500/20 shadow-sm'
                        : 'border-border hover:bg-accent/40 bg-card'
                    )}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm text-foreground truncate">{service.name}</h4>
                        <Badge variant={service.type === 'pool' ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5">
                          {service.type === 'pool' ? 'Pool (翻译池)' : 'Single (单服务商)'}
                        </Badge>
                        {isActive && (
                          <Badge className="text-[10px] bg-emerald-600 dark:bg-emerald-600 text-white font-medium border-transparent">
                            当前使用中
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {service.type === 'single' ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>提供商:</span>
                            <span className="font-medium text-foreground/80">
                              {settings.providers.find(p => p.id === service.providerId)?.name || service.providerId}
                            </span>
                            <span>|</span>
                            <span>模型:</span>
                            <div onClick={e => e.stopPropagation()} className="inline-block">
                              <Select
                                value={service.modelId}
                                options={getModelOptions(service.providerId)}
                                onChange={val => {
                                  const nextServices = settings.services.map(s => {
                                    if (s.id === service.id && s.type === 'single') {
                                      return { ...s, modelId: val };
                                    }
                                    return s;
                                  });
                                  onSave({ ...settings, services: nextServices });
                                }}
                                compact
                                className="w-[180px]"
                              />
                            </div>
                            {service.fallbackEnabled && <span className="text-muted-foreground">(开启自动降级)</span>}
                          </div>
                        ) : (
                          <>
                            组合成员:{' '}
                            <span className="font-medium text-foreground/80">
                              {service.poolProviders.map(p => {
                                const name = settings.providers.find(prov => prov.id === p.providerId)?.name || p.providerId;
                                return `${name} (${p.weight}x)`;
                              }).join(', ')}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Badges for advanced configs */}
                      <div className="flex gap-1.5 flex-wrap pt-0.5">
                        {service.prompt && (
                          <Badge variant="outline" className="text-[9px] px-1.5 text-indigo-500 border-indigo-200/50 bg-indigo-500/5">
                            {service.promptMode === 'override' ? '覆盖 Prompt' : '追加 Prompt'}
                          </Badge>
                        )}
                        {service.defaultDisplayStyle !== 'personal_default' && (
                          <Badge variant="outline" className="text-[9px] px-1.5 text-amber-500 border-amber-200/50 bg-amber-500/5">
                            独立样式: {t(`style_${service.defaultDisplayStyle}`)}
                          </Badge>
                        )}
                        {service.defaultTranslationTone !== 'personal_default' && (
                          <Badge variant="outline" className="text-[9px] px-1.5 text-violet-500 border-violet-200/50 bg-violet-500/5">
                            独立语气: {toneOptions.find(t => t.value === service.defaultTranslationTone)?.label || service.defaultTranslationTone}
                          </Badge>
                        )}
                        {service.enablePolysemy && (
                          <Badge variant="outline" className="text-[9px] px-1.5 text-emerald-500 border-emerald-200/50 bg-emerald-500/5">
                            多义词翻译
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(service)} className="h-8">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(service.id)} className="h-8">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
