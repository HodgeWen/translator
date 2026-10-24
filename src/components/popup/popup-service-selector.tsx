import { Select } from '@/components/ui/select'
import { Layers } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { GlobalSettings, SingleService } from '@/types'

interface PopupServiceSelectorProps {
  settings: GlobalSettings
  activeServiceId: string
  activeService: GlobalSettings['services'][number] | undefined
  onServiceChange: (serviceId: string) => void
  onModelChange: (modelId: string) => void
}

/**
 * 服务 / 模型选择行（从 popup/main.tsx 拆出）。
 * 纯展示 + 回调，选择逻辑仍由 main.tsx 持有。
 */
export function PopupServiceSelector({
  settings,
  activeServiceId,
  activeService,
  onServiceChange,
  onModelChange
}: PopupServiceSelectorProps) {
  return (
    <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-3 bg-muted/10">
      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
        <Layers className="h-3.5 w-3.5 text-indigo-500" />
        {t('popup_service_label')}:
      </span>
      <Select
        value={activeServiceId}
        options={settings.services.map((s) => ({
          value: s.id,
          label: `${s.name} (${s.type === 'pool' ? t('popup_service_pool_tag') : t('popup_service_single_tag')})`
        }))}
        onChange={onServiceChange}
        placeholder={t('popup_select_service')}
        className="flex-1 min-w-0"
        compact
      />
      {activeService && activeService.type === 'single' && (
        <>
          <span className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t('popup_model')}:
          </span>
          <Select
            value={activeService.modelId}
            options={
              settings.providers
                .find((p) => p.id === (activeService as SingleService).providerId)
                ?.models.map((m) => ({ value: m.id, label: m.name })) || []
            }
            onChange={onModelChange}
            placeholder={t('popup_model')}
            className="flex-1 min-w-0"
            compact
          />
        </>
      )}
      {activeService && activeService.type === 'pool' && (
        <span className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {t('popup_service_pool_tag')}
        </span>
      )}
    </div>
  )
}
