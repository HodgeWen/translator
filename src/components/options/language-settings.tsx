import { Select } from '@/components/ui/select'
import type { GlobalSettings } from '@/types'
import { t } from '@/lib/i18n'
import { LANGUAGE_OPTIONS } from '@/lib/languages'
import { Languages, Type } from 'lucide-react'

interface OptionsLanguageSettingsProps {
  settings: GlobalSettings
  onSave: (settings: GlobalSettings) => void
  onUILanguageChange: (lang: string) => Promise<void>
}

const UI_LANG_FOLLOW_NATIVE = '__follow_native__'

export function OptionsLanguageSettings({
  settings,
  onSave,
  onUILanguageChange
}: OptionsLanguageSettingsProps) {
  const handleUILanguageChange = async (lang: string) => {
    const actualLang = lang === UI_LANG_FOLLOW_NATIVE ? settings.nativeLanguage : lang
    const newSettings = { ...settings, uiLanguage: actualLang }
    await onSave(newSettings)
    await onUILanguageChange(actualLang)
  }

  const handleNativeLanguageChange = (value: string) => {
    const newSettings = { ...settings, nativeLanguage: value }
    onSave(newSettings)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Type className="h-4 w-4 text-violet-500" />
            {t('label_native_language')}
          </label>
          <Select
            value={settings.nativeLanguage}
            options={LANGUAGE_OPTIONS}
            onChange={handleNativeLanguageChange}
          />
          <p className="text-xs text-muted-foreground">{t('hint_native_language')}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Type className="h-4 w-4 text-sky-500" />
            {t('label_second_language')}
          </label>
          <Select
            value={settings.secondLanguage}
            options={LANGUAGE_OPTIONS}
            onChange={(value) => onSave({ ...settings, secondLanguage: value })}
          />
          <p className="text-xs text-muted-foreground">{t('hint_second_language')}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Languages className="h-4 w-4 text-indigo-500" />
            {t('label_ui_language')}
          </label>
          <Select
            value={
              settings.uiLanguage === settings.nativeLanguage
                ? UI_LANG_FOLLOW_NATIVE
                : settings.uiLanguage
            }
            options={[
              { value: UI_LANG_FOLLOW_NATIVE, label: t('option_follow_native_language') },
              { value: 'zh-CN', label: 'Chinese (Simplified) / 简体中文' },
              { value: 'en', label: 'English / 英文' }
            ]}
            onChange={handleUILanguageChange}
          />
          <p className="text-xs text-muted-foreground">{t('hint_ui_language')}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Type className="h-4 w-4 text-amber-500" />
            {t('label_input_translation_target_language')}
          </label>
          <Select
            value={settings.inputTranslationTargetLanguage}
            options={LANGUAGE_OPTIONS}
            onChange={(value) => onSave({ ...settings, inputTranslationTargetLanguage: value })}
          />
          <p className="text-xs text-muted-foreground">
            {t('hint_input_translation_target_language')}
          </p>
        </div>
      </div>
    </div>
  )
}
