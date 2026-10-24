import type { ReactNode } from 'react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { NumberInput } from '@/components/ui/number-input'
import { Switch, SwitchRow } from '@/components/ui/switch'
import type { GlobalSettings, SingleService, PoolService, TranslationService } from '@/types'
import { t } from '@/lib/i18n'
import { Trash2 } from 'lucide-react'

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

/** Provider → Model 选项。列表视图与服务表单共用 */
export function getModelOptions(settings: GlobalSettings, providerId: string) {
  const provider = settings.providers.find((p) => p.id === providerId)
  return provider?.models.map((m) => ({ value: m.id, label: m.name })) || []
}

interface ServiceDispatchProps {
  settings: GlobalSettings
  service: TranslationService
  onDraftChange: (service: TranslationService) => void
}

/**
 * 服务的调度配置区（Single：服务商/模型/降级；Pool：成员与权重）。
 *
 * 从 service-edit-form.tsx 拆出：该表单原本 521 行，把「基本字段 + 调度配置 +
 * Prompt 折叠面板」三块并列塞在一个 return 里，调度区的 Pool 行编辑
 * （增删行、改权重、按权重算百分比）与表单字段渲染是完全不同的两件事。
 *
 * 纯移动，props 与原有闭包变量一一对应，行为不变。
 */
export function ServiceDispatchSection({ settings, service, onDraftChange }: ServiceDispatchProps) {
  // Pool 权重百分比需要总和；仅在 pool 类型下计算
  const poolProviders = service.type === 'pool' ? (service as PoolService).poolProviders : []
  const totalWeight = poolProviders.reduce((sum, item) => sum + (item.weight || 0), 0)

  const handleAddPoolRow = () => {
    if (service.type !== 'pool') return
    const firstProvider = settings.providers[0]
    if (!firstProvider) return

    const newRow = {
      providerId: firstProvider.id,
      modelId: firstProvider.models[0]?.id,
      weight: 1
    }

    onDraftChange({
      ...service,
      poolProviders: [...service.poolProviders, newRow]
    })
  }

  const handleRemovePoolRow = (index: number) => {
    if (service.type !== 'pool') return
    const nextPool = service.poolProviders.filter((_, i) => i !== index)
    onDraftChange({
      ...service,
      poolProviders: nextPool
    })
  }

  const handlePoolRowChange = (index: number, key: string, value: any) => {
    if (service.type !== 'pool') return
    const nextPool = [...service.poolProviders]

    if (key === 'providerId') {
      const provider = settings.providers.find((p) => p.id === value)
      nextPool[index] = {
        providerId: value,
        modelId: provider?.models[0]?.id || '',
        weight: nextPool[index].weight
      }
    } else {
      nextPool[index] = {
        ...nextPool[index],
        [key]: value
      }
    }

    onDraftChange({
      ...service,
      poolProviders: nextPool
    })
  }

  return (
    <>
    {/* ── 调度：Single 详情 ── */}
    {service.type === 'single' && (
      <div className="rounded-md border border-border p-4 bg-muted/10 space-y-4">
        <SectionTitle id="service-section-dispatch-single">
          {t('label_underlying_provider')}
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2" role="group" aria-labelledby="service-provider-label">
            <span id="service-provider-label" className="text-sm font-medium block">
              {t('label_underlying_provider')}
            </span>
            <Select
              value={(service as SingleService).providerId}
              options={settings.providers.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(val) => {
                const models = getModelOptions(settings, val)
                onDraftChange({
                  ...service,
                  providerId: val,
                  modelId: models[0]?.value || ''
                } as SingleService)
              }}
              ariaLabelledby="service-provider-label"
            />
          </div>

          <div className="space-y-2" role="group" aria-labelledby="service-model-label">
            <span id="service-model-label" className="text-sm font-medium block">
              {t('label_translation_model')}
            </span>
            <Select
              value={(service as SingleService).modelId}
              options={getModelOptions(settings, (service as SingleService).providerId)}
              onChange={(val) =>
                onDraftChange({ ...service, modelId: val } as SingleService)
              }
              ariaLabelledby="service-model-label"
            />
          </div>
        </div>

        <SwitchRow
          labelId="service-fallback-label"
          label={t('label_model_fallback')}
          description={t('desc_model_fallback')}
          className="pt-2 border-t border-border/50"
        >
          <Switch
            checked={(service as SingleService).fallbackEnabled}
            onChange={(checked) =>
              onDraftChange({
                ...service,
                fallbackEnabled: checked
              } as SingleService)
            }
            labelledBy="service-fallback-label"
          />
        </SwitchRow>
      </div>
    )}

    {/* ── 调度：Pool 详情 ── */}
    {service.type === 'pool' && (
      <div className="rounded-md border border-border p-4 bg-muted/10 space-y-4">
        <SectionTitle id="service-section-dispatch-pool">
          {t('label_pool_members')}
        </SectionTitle>
        <div className="flex justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">{t('desc_load_balance')}</p>
          <Button variant="outline" size="sm" onClick={handleAddPoolRow}>
            {t('btn_add_pool_member')}
          </Button>
        </div>

        <div className="space-y-3">
          {(service as PoolService).poolProviders.map((row, index) => {
            const percentage =
              totalWeight > 0 ? (((row.weight || 0) / totalWeight) * 100).toFixed(1) : '0.0'
            return (
              <div
                key={index}
                className="flex gap-3 items-end bg-background p-3 rounded border border-border"
              >
                <div
                  className="flex-1 space-y-1.5"
                  role="group"
                  aria-labelledby={`pool-provider-label-${index}`}
                >
                  <span
                    id={`pool-provider-label-${index}`}
                    className="text-xs text-muted-foreground block"
                  >
                    {t('label_underlying_provider')}
                  </span>
                  <Select
                    value={row.providerId}
                    options={settings.providers.map((p) => ({ value: p.id, label: p.name }))}
                    onChange={(val) => handlePoolRowChange(index, 'providerId', val)}
                    ariaLabelledby={`pool-provider-label-${index}`}
                  />
                </div>

                <div
                  className="flex-1 space-y-1.5"
                  role="group"
                  aria-labelledby={`pool-model-label-${index}`}
                >
                  <span
                    id={`pool-model-label-${index}`}
                    className="text-xs text-muted-foreground block"
                  >
                    {t('label_translation_model')}
                  </span>
                  <Select
                    value={row.modelId || ''}
                    options={[
                      { value: '', label: t('label_use_first_model') },
                      ...getModelOptions(settings, row.providerId)
                    ]}
                    onChange={(val) =>
                      handlePoolRowChange(index, 'modelId', val || undefined)
                    }
                    ariaLabelledby={`pool-model-label-${index}`}
                  />
                </div>

                <div
                  className="w-32 space-y-1.5"
                  role="group"
                  aria-labelledby={`pool-weight-label-${index}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span id={`pool-weight-label-${index}`}>{t('label_weight')}</span>
                    <span className="text-[10px] text-indigo-500 font-mono font-medium">
                      {percentage}%
                    </span>
                  </div>
                  <NumberInput
                    min={1}
                    max={100}
                    value={row.weight}
                    onChange={(val) => handlePoolRowChange(index, 'weight', val)}
                    className="w-full"
                  />
                </div>

                <Button
                  variant="destructive"
                  className="h-9 px-3 shrink-0"
                  onClick={() => handleRemovePoolRow(index)}
                  disabled={(service as PoolService).poolProviders.length <= 1}
                  aria-label={t('btn_delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    )}

    </>
  )
}
