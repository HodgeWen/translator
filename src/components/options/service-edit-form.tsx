import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { GlobalSettings, SingleService, PoolService, TranslationService } from '@/types'
import { t } from '@/lib/i18n'
import { Settings2, ChevronDown, ChevronUp } from 'lucide-react'
import { Switch, SwitchRow } from '@/components/ui/switch'
import { SettingsCard } from './settings-card'
import { ServiceDispatchSection } from './service-dispatch-section'

/** 分区小标题：仅做视觉分组，不改变数据结构 */
function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
<div
  id={id}
  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 pb-1 border-b border-border/60"
>
  {children}
</div>
  )
}

interface ServiceEditFormProps {
  settings: GlobalSettings
  /** 正在编辑的服务草稿（新增时是新建对象） */
  service: TranslationService
  isAdding: boolean
  advancedOpen: boolean
  /** 草稿变更：等价于原先的 setEditingService */
  onDraftChange: (service: TranslationService) => void
  onToggleAdvanced: () => void
  onSave: () => void
  onCancel: () => void
}

/**
 * 服务编辑表单：从 services-settings.tsx 拆出（原文件 806 行同时承担
 * 服务列表、表单、Pool 行编辑、校验与折叠状态，属巨型文件）。
 * 纯移动，行为与原实现一致。
 */
export function ServiceEditForm({
  settings,
  service,
  isAdding,
  advancedOpen,
  onDraftChange,
  onToggleAdvanced,
  onSave,
  onCancel
}: ServiceEditFormProps) {
  // 常用风格与语气选项列表，合并内置与自定义语气
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

  const displayStyleOptions = [
{ value: 'personal_default', label: t('label_use_personal_default') },
{ value: 'original', label: t('style_original') },
{ value: 'bilingual', label: t('style_bilingual') },
{ value: 'underline', label: t('style_underline') },
{ value: 'clean', label: t('style_clean') }
  ]

  return (
    <SettingsCard
      icon={null}
      title={isAdding ? t('title_add_service') : t('title_edit_service')}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onCancel()}>
            {t('btn_cancel')}
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {t('btn_save')}
          </Button>
        </div>
      }
    >

      {/* ── 基本 ── */}
      <div className="space-y-4">
        <SectionTitle id="service-section-basic">{t('title_services_config')}</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="service-name" className="text-sm font-medium">
              {t('label_service_name')}
            </label>
            <input
              id="service-name"
              type="text"
              value={service.name}
              onChange={(e) => onDraftChange({ ...service, name: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* 用 role="group" + aria-labelledby 命名；Select 也已支持 id/ariaLabelledby，此处保留 group 以兼容既有结构 */}
          <div className="space-y-2" role="group" aria-labelledby="service-type-label">
            <span id="service-type-label" className="text-sm font-medium block">
              {t('label_service_type')}
            </span>
            <Select
              value={service.type}
              options={[
                { value: 'single', label: t('service_type_single') },
                { value: 'pool', label: t('service_type_pool') }
              ]}
              disabled={!isAdding}
              onChange={(val) => {
                if (val === 'single') {
                  onDraftChange({
                    ...service,
                    type: 'single',
                    providerId: settings.providers[0]?.id || '',
                    modelId: settings.providers[0]?.models[0]?.id || '',
                    fallbackEnabled: true
                  } as SingleService)
                } else {
                  onDraftChange({
                    ...service,
                    type: 'pool',
                    poolProviders: [
                      {
                        providerId: settings.providers[0]?.id || '',
                        modelId: settings.providers[0]?.models[0]?.id || '',
                        weight: 1
                      }
                    ]
                  } as PoolService)
                }
              }}
              ariaLabelledby="service-type-label"
            />
            <p className="text-xs text-muted-foreground">{t('desc_services_config')}</p>
          </div>
        </div>
      </div>

      {/* ── 调度配置（Single / Pool）── */}
      <ServiceDispatchSection
        settings={settings}
        service={service}
        onDraftChange={onDraftChange}
      />

      {/* ── Prompt + 展示（折叠高级配置） ── */}
      <div className="border border-border rounded-md bg-background">
        <button
          type="button"
          onClick={() => onToggleAdvanced()}
          aria-expanded={advancedOpen}
          aria-controls="service-advanced-panel"
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 text-sm font-medium hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-foreground/80">
            <Settings2 className="h-4 w-4 text-indigo-500" />
            <span>{t('title_service_advanced')}</span>
          </div>
          {advancedOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {advancedOpen && (
          <div
            id="service-advanced-panel"
            className="p-4 space-y-5 border-t border-border bg-card"
          >
            {/* Prompt 分区 */}
            <div className="space-y-2" role="group" aria-labelledby="service-prompt-label">
              <SectionTitle id="service-section-prompt">
                {t('label_service_prompt')}
              </SectionTitle>
              <div className="flex justify-between items-center gap-3">
                <span id="service-prompt-label" className="text-sm font-medium">
                  {t('label_service_prompt')}
                </span>
                <Select
                  value={service.promptMode || 'append'}
                  options={[
                    { value: 'append', label: t('label_prompt_mode_append') },
                    { value: 'override', label: t('label_prompt_mode_override') }
                  ]}
                  compact
                  className="w-[150px] h-7 text-xs"
                  onChange={(val) =>
                    onDraftChange({
                      ...service,
                      promptMode: val as 'append' | 'override'
                    })
                  }
                  ariaLabelledby="service-prompt-label"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {service.promptMode === 'override'
                  ? t('desc_prompt_mode_override')
                  : t('desc_prompt_mode_append')}
              </p>
              <Textarea
                aria-labelledby="service-prompt-label"
                placeholder={
                  service.promptMode === 'override'
                    ? t('desc_prompt_mode_override')
                    : t('desc_prompt_mode_append')
                }
                value={service.prompt || ''}
                onChange={(e) =>
                  onDraftChange({ ...service, prompt: e.target.value })
                }
                className="font-mono text-xs min-h-[80px]"
              />
            </div>

            {/* 多义词开关（Popup 行为） */}
            <SwitchRow
              labelId="service-polysemy-label"
              label={t('label_enable_polysemy')}
              description={t('desc_enable_polysemy')}
              className="pt-3 border-t border-border/50"
            >
              <Switch
                checked={service.enablePolysemy}
                onChange={(checked) =>
                  onDraftChange({ ...service, enablePolysemy: checked })
                }
                labelledBy="service-polysemy-label"
              />
            </SwitchRow>

            {/* 展示分区：服务默认样式 / 语气 */}
            <div className="space-y-3 pt-3 border-t border-border/50">
              <SectionTitle id="service-section-display">
                {t('label_service_default_style')} / {t('label_service_default_tone')}
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="space-y-2"
                  role="group"
                  aria-labelledby="service-default-style-label"
                >
                  <span id="service-default-style-label" className="text-sm font-medium block">
                    {t('label_service_default_style')}
                  </span>
                  <Select
                    value={service.defaultDisplayStyle}
                    options={displayStyleOptions}
                    onChange={(val) =>
                      onDraftChange({
                        ...service,
                        defaultDisplayStyle: val as any
                      })
                    }
                    ariaLabelledby="service-default-style-label"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('desc_use_service_default_style')}
                  </p>
                </div>

                <div
                  className="space-y-2"
                  role="group"
                  aria-labelledby="service-default-tone-label"
                >
                  <span id="service-default-tone-label" className="text-sm font-medium block">
                    {t('label_service_default_tone')}
                  </span>
                  <Select
                    value={service.defaultTranslationTone}
                    options={toneOptions}
                    onChange={(val) =>
                      onDraftChange({
                        ...service,
                        defaultTranslationTone: val
                      })
                    }
                    ariaLabelledby="service-default-tone-label"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('desc_use_service_default_tone')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  )
}
