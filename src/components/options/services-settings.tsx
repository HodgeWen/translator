import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { GlobalSettings, TranslationService, SingleService } from '@/types'
import { t } from '@/lib/i18n'
import { Plus, Trash2, Edit2, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ServiceEditForm } from './service-edit-form'
import { getModelOptions } from './service-dispatch-section'

interface OptionsServicesSettingsProps {
  settings: GlobalSettings
  onSave: (settings: GlobalSettings) => void
}

/**
 * 翻译服务分区：只负责「服务列表 + 选中/增删」，编辑表单拆到 service-edit-form.tsx。
 * 拆分原因：原文件 806 行同时承担列表、表单、Pool 行编辑与折叠状态，
 * 一次修改要读完整文件才能判断影响面（坏味道：巨型文件）。
 */
export function OptionsServicesSettings({ settings, onSave }: OptionsServicesSettingsProps) {
  const [editingService, setEditingService] = useState<TranslationService | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // 列表徽标需要语气显示名；表单内部另有自己的一份（含 desc），两者用途不同
  const toneOptions = [
    { value: 'personal_default', label: t('label_use_personal_default') },
    { value: 'normal', label: t('tone_normal') },
    { value: 'technical', label: t('tone_technical') },
    { value: 'tech_forward', label: t('tone_tech_forward') },
    { value: 'humorous', label: t('tone_humorous') },
    { value: 'literary', label: t('tone_literary') },
    { value: 'formal', label: t('tone_formal') },
    { value: 'colloquial', label: t('tone_colloquial') },
    ...settings.customTones.map((tone) => ({ value: tone.id, label: tone.name }))
  ]

  const handleAdd = () => {
    const newService: SingleService = {
      id: crypto.randomUUID(),
      name: t('btn_new_service'),
      type: 'single',
      providerId: settings.providers[0]?.id || '',
      modelId: settings.providers[0]?.models[0]?.id || '',
      fallbackEnabled: true,
      defaultDisplayStyle: 'personal_default',
      defaultTranslationTone: 'personal_default',
      promptMode: 'append',
      enablePolysemy: false
    }
    setEditingService(newService)
    setIsAdding(true)
    setAdvancedOpen(false)
  }

  const handleEdit = (service: TranslationService) => {
    setEditingService(JSON.parse(JSON.stringify(service))) // 深度拷贝
    setIsAdding(false)
    setAdvancedOpen(false)
  }

  const handleDelete = (serviceId: string) => {
    const nextServices = settings.services.filter((s) => s.id !== serviceId)
    // 若删除了当前选中的服务，重置为第一个
    let nextSelectedId = settings.selectedServiceId
    if (nextSelectedId === serviceId) {
      nextSelectedId = nextServices[0]?.id || ''
    }
    onSave({
      ...settings,
      services: nextServices,
      selectedServiceId: nextSelectedId
    })
  }

  const handleSelectActive = (serviceId: string) => {
    onSave({
      ...settings,
      selectedServiceId: serviceId
    })
  }

  const handleSaveService = () => {
    if (!editingService || !editingService.name.trim()) return

    let nextServices: TranslationService[]
    if (isAdding) {
      nextServices = [...settings.services, editingService]
    } else {
      nextServices = settings.services.map((s) => (s.id === editingService.id ? editingService : s))
    }

    // 默认选中新添加的服务
    const nextSelectedId = settings.selectedServiceId || editingService.id

    onSave({
      ...settings,
      services: nextServices,
      selectedServiceId: nextSelectedId
    })

    setEditingService(null)
    setIsAdding(false)
  }

  return (
    <div className="space-y-6">
      {editingService ? (
        <ServiceEditForm
          settings={settings}
          service={editingService}
          isAdding={isAdding}
          advancedOpen={advancedOpen}
          onDraftChange={setEditingService}
          onToggleAdvanced={() => setAdvancedOpen((open) => !open)}
          onSave={handleSaveService}
          onCancel={() => setEditingService(null)}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{t('title_services_config')}</h3>
              <p className="text-xs text-muted-foreground">{t('desc_services_config')}</p>
            </div>
            <Button
              onClick={handleAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t('btn_new_service')}
            </Button>
          </div>

          {settings.services.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-10 bg-muted/10">
              <Settings2 className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <div className="font-semibold text-muted-foreground">
                {t('empty_no_service_title')}
              </div>
              <div className="text-xs text-muted-foreground mt-1 mb-4">
                {t('empty_no_service_desc')}
              </div>
              <Button
                size="sm"
                onClick={handleAdd}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {t('btn_create_now')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.services.map((service) => {
                const isActive = settings.selectedServiceId === service.id
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
                        <h4 className="font-semibold text-sm text-foreground truncate">
                          {service.name}
                        </h4>
                        <Badge
                          variant={service.type === 'pool' ? 'default' : 'secondary'}
                          className="text-[10px] px-2 py-0.5"
                        >
                          {service.type === 'pool'
                            ? t('service_type_pool')
                            : t('service_type_single')}
                        </Badge>
                        {isActive && (
                          <Badge className="text-[10px] bg-emerald-600 dark:bg-emerald-600 text-white font-medium border-transparent">
                            {t('badge_service_in_use')}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {service.type === 'single' ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{t('label_provider_inline')}</span>
                            <span className="font-medium text-foreground/80">
                              {settings.providers.find((p) => p.id === service.providerId)?.name ||
                                service.providerId}
                            </span>
                            <span>|</span>
                            <span>{t('label_model_inline')}</span>
                            <div onClick={(e) => e.stopPropagation()} className="inline-block">
                              <Select
                                value={service.modelId}
                                options={getModelOptions(settings, service.providerId)}
                                onChange={(val) => {
                                  const nextServices = settings.services.map((s) => {
                                    if (s.id === service.id && s.type === 'single') {
                                      return { ...s, modelId: val }
                                    }
                                    return s
                                  })
                                  onSave({ ...settings, services: nextServices })
                                }}
                                compact
                                className="w-[180px]"
                                ariaLabelledby="service-default-tone-label"
                              />
                            </div>
                            {service.fallbackEnabled && (
                              <span className="text-muted-foreground">
                                {t('badge_fallback_on')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            {t('label_pool_members_inline')}{' '}
                            <span className="font-medium text-foreground/80">
                              {service.poolProviders
                                .map((p) => {
                                  const name =
                                    settings.providers.find((prov) => prov.id === p.providerId)
                                      ?.name || p.providerId
                                  return `${name} (${p.weight}x)`
                                })
                                .join(', ')}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Badges for advanced configs */}
                      <div className="flex gap-1.5 flex-wrap pt-0.5">
                        {service.prompt && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 text-indigo-500 border-indigo-200/50 bg-indigo-500/5"
                          >
                            {service.promptMode === 'override'
                              ? t('label_prompt_override_tag')
                              : t('label_prompt_append_tag')}
                          </Badge>
                        )}
                        {service.defaultDisplayStyle !== 'personal_default' && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 text-amber-500 border-amber-200/50 bg-amber-500/5"
                          >
                            {t('badge_service_style')}: {t(`style_${service.defaultDisplayStyle}`)}
                          </Badge>
                        )}
                        {service.defaultTranslationTone !== 'personal_default' && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 text-violet-500 border-violet-200/50 bg-violet-500/5"
                          >
                            {t('badge_service_tone')}:{' '}
                            {toneOptions.find((opt) => opt.value === service.defaultTranslationTone)
                              ?.label || service.defaultTranslationTone}
                          </Badge>
                        )}
                        {service.enablePolysemy && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 text-emerald-500 border-emerald-200/50 bg-emerald-500/5"
                          >
                            {t('badge_popup_polysemy')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(service)}
                        className="h-8"
                        aria-label={t('btn_edit')}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(service.id)}
                        className="h-8"
                        aria-label={t('btn_delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
