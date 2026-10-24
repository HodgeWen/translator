import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { LogoIcon } from '@/components/logo-icon'
import { t } from '@/lib/i18n'
import { Settings, Languages, Square } from 'lucide-react'
import type { TranslationTone } from '@/types'

interface PopupHeaderProps {
  pageTranslating: boolean
  onTogglePageTranslation: () => void
  currentTone: TranslationTone
  toneOptions: Array<{ value: string; label: string }>
  onToneChange: (tone: string) => void
}

/**
 * popup 顶栏：品牌、页面翻译开关、语气选择、打开设置。
 *
 * 从 entrypoints/popup/main.tsx（原 692 行）拆出，让 main.tsx 只保留
 * 翻译编排状态与输入区，顶栏布局修改不必再读整个文件。
 * 纯移动，props 与原有闭包变量一一对应，行为不变。
 */
export function PopupHeader({
  pageTranslating,
  onTogglePageTranslation,
  currentTone,
  toneOptions,
  onToneChange
}: PopupHeaderProps) {
  return (
    <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-gradient-to-r from-indigo-500/5 to-violet-500/5">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
          <LogoIcon className="h-3.5 w-3.5 text-white" />
        </div>
        <h1 className="text-base font-semibold tracking-tight">{t('extName')}</h1>
        <span className="text-[10px] text-muted-foreground/60 font-mono">v{chrome.runtime.getManifest().version}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant={pageTranslating ? 'outline' : 'secondary'}
          size="sm"
          className="h-7 shrink-0 gap-1 px-2.5 text-xs"
          onClick={onTogglePageTranslation}
          title={pageTranslating ? t('popup_stop_translation') : t('popup_translate_page')}
          aria-label={pageTranslating ? t('popup_stop_translation') : t('popup_translate_page')}
        >
          {pageTranslating ? (
            <Square className="fill-current text-red-500" />
          ) : (
            <Languages className="text-indigo-500" />
          )}
          {pageTranslating ? t('popup_stop_translation') : t('popup_translate_page')}
        </Button>
        <Select
          value={currentTone}
          options={toneOptions}
          onChange={onToneChange}
          className="w-[100px]"
          compact
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => chrome.runtime.openOptionsPage()}
          title={t('popup_open_settings')}
          aria-label={t('popup_open_settings')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
