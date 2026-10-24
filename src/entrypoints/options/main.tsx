import React, { useState, useEffect, useReducer, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import '@/assets/styles.css'
import { Toast } from '@/components/ui/toast'
import { OptionsProviderSettings } from '@/components/options/provider-settings'
import { OptionsServicesSettings } from '@/components/options/services-settings'
import { OptionsPresetsTonesSettings } from '@/components/options/presets-tones-settings'
import { OptionsLanguageSettings } from '@/components/options/language-settings'
import { OptionsGeneralSettings } from '@/components/options/general-settings'
import { OptionsDisplaySettings } from '@/components/options/display-settings'
import { OptionsBackupRestoreSettings } from '@/components/options/backup-restore-settings'
import { OptionsUserManual } from '@/components/options/user-manual'
// 统计分区按需加载：它静态引入 chart.js（体积占 options 包的大头），
// 但用户未必打开统计页。改成 lazy 后 chart.js 只在切到该 tab 时才解析执行，
// 首屏不再为一张可能看不到的图表付出解析成本。
const OptionsStatisticsSettings = React.lazy(() =>
  import('@/components/options/statistics-settings').then((m) => ({
    default: m.OptionsStatisticsSettings
  }))
)
import type { GlobalSettings } from '@/types'
import { cn } from '@/lib/utils'
import { useDarkMode } from '@/hooks/use-dark-mode'
import { getSettings, saveSettings, getSettingsDiagnostics, DEFAULT_SETTINGS } from '@/lib/storage'
import { t, setUILanguage } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import {
  Server,
  Globe,
  Palette,
  Database,
  BookOpen,
  Layers,
  Sparkles,
  BarChart3
} from 'lucide-react'
import { LogoIcon } from '@/components/logo-icon'

type Tab =
  | 'providers'
  | 'services'
  | 'presets'
  | 'language'
  | 'display'
  | 'general'
  | 'backup'
  | 'manual'
  | 'statistics'

/**
 * 判断保存失败是否由同步存储配额超限引起。
 * 兼容三种形态：带 code 的错误对象、Error.message、字符串特征串。
 */
function isQuotaExceededError(err: unknown): boolean {
  if (typeof err === 'string') {
    return /quota/i.test(err) || /QUOTA_EXCEEDED/i.test(err)
  }
  if (err && typeof err === 'object') {
    const code = (err as { code?: unknown }).code
    if (typeof code === 'string' && /QUOTA/i.test(code)) return true
    const message = err instanceof Error ? err.message : String(err)
    return /quota/i.test(message) || /QUOTA_EXCEEDED/i.test(message)
  }
  return false
}

/**
 * 把存储层的降级警告折叠成一条用户可读提示。
 * 只展示前 3 条并汇总剩余数量，避免警告很多时把 toast 撑爆。
 */
export function formatSettingsWarnings(warnings: Array<{ message: string }>): string {
  const head = warnings.slice(0, 3).map((w) => `• ${w.message}`)
  const rest = warnings.length - head.length
  const lines = [t('settings_warnings_prefix'), ...head]
  if (rest > 0) lines.push(t('settings_warnings_more').replace('{count}', String(rest)))
  return lines.join('\n')
}

/**
 * tablist 键盘导航（WAI-ARIA Tabs 模式）：
 * - ArrowRight / ArrowLeft 循环切换，Home / End 跳到首尾；
 * - 切换后焦点跟随新 tab（漫游 tabindex 下焦点必须手动移动）。
 * 只处理本组内的按键，避免影响 tabpanel 内的输入控件。
 */
function handleTabListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
  if (!keys.includes(event.key)) return
  const container = event.currentTarget
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
  if (buttons.length === 0) return
  const currentIndex = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true')
  const from = currentIndex === -1 ? 0 : currentIndex

  let next = from
  if (event.key === 'ArrowRight') next = (from + 1) % buttons.length
  else if (event.key === 'ArrowLeft') next = (from - 1 + buttons.length) % buttons.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = buttons.length - 1

  event.preventDefault()
  buttons[next]?.focus()
  buttons[next]?.click()
}

/** 懒加载分区的占位：与统计分区自身的加载态保持同一视觉，避免切换时闪白 */
function OptionsPanelLoading() {
  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <BarChart3 className="h-5 w-5 animate-pulse mr-2" />
      {t('loading')}
    </div>
  )
}

function App() {
  const { toast, showSuccess, showError, dismiss } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>('providers')
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS)
  // 语言切换后强制重渲染（不卸载子树，避免丢失表单草稿）
  const [, forceLangRender] = useReducer((n: number) => n + 1, 0)

  // 配色方案来自设置项；settings 始终有默认值，这里保留兜底以兼容异步加载
  const isDark = useDarkMode(settings?.colorScheme ?? 'system')

  const loadSettings = useCallback(async () => {
    try {
      const s = await getSettings()
      await setUILanguage(s.uiLanguage)
      document.title = t('options_title')
      setSettings(s)
      // t() 是普通函数而非 hook，语言包加载完成后必须触发一次重渲染
      forceLangRender()

      // 存储层做了条目级降级：非法 provider/service 会被丢弃而不是让全部配置归零。
      // 但「静默丢弃」等于悄悄删用户数据，必须显式告知，否则用户只会看到服务消失。
      const { warnings } = getSettingsDiagnostics()
      if (warnings.length > 0) {
        showError(formatSettingsWarnings(warnings))
      }
    } catch {
      showError(t('error_load_settings'))
    }
  }, [showError])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async (newSettings: GlobalSettings) => {
    try {
      await saveSettings(newSettings)
      setSettings(newSettings)
    } catch (err) {
      // 配额超限时给出可读文案，而不是把原始 message 直接抛给用户
      if (isQuotaExceededError(err)) {
        showError(t('error_settings_quota_exceeded'))
        return
      }
      showError(err instanceof Error ? err.message : t('error_save_failed'))
    }
  }

  const handleUILanguageChange = async (lang: string) => {
    await setUILanguage(lang)
    document.title = t('options_title')
    // 只重渲染、不重建子树：各组件内部 draft state 得以保留
    forceLangRender()
  }

  const handleImportSuccess = async () => {
    await loadSettings()
    showSuccess(t('options_imported'))
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'providers', label: t('tab_providers'), icon: <Server className="h-4 w-4" /> },
    { id: 'services', label: t('tab_services'), icon: <Layers className="h-4 w-4" /> },
    { id: 'presets', label: t('tab_presets'), icon: <Sparkles className="h-4 w-4" /> },
    { id: 'language', label: t('tab_language'), icon: <LogoIcon className="h-4 w-4" /> },
    { id: 'display', label: t('tab_display'), icon: <Palette className="h-4 w-4" /> },
    { id: 'general', label: t('tab_general'), icon: <Globe className="h-4 w-4" /> },
    { id: 'backup', label: t('tab_backup_restore'), icon: <Database className="h-4 w-4" /> },
    { id: 'manual', label: t('tab_manual'), icon: <BookOpen className="h-4 w-4" /> },
    { id: 'statistics', label: t('tab_statistics'), icon: <BarChart3 className="h-4 w-4" /> }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toast toast={toast} onDismiss={dismiss} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm">
              <LogoIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{t('options_title')}</h1>
                <span className="text-xs text-muted-foreground/60 font-mono mt-1.5">
                  v{chrome.runtime.getManifest().version}
                </span>
              </div>
              <p className="text-muted-foreground mt-1">{t('options_subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label={t('options_title')}
          className="flex gap-1 border-b border-border mb-6 overflow-x-auto"
          onKeyDown={handleTabListKeyDown}
        >
          {tabs.map((tab, index) => (
            // 面板按需渲染：只有当前激活的 tab 才指向存在的 panel，避免 aria-controls 悬空
            <button
              key={tab.id}
              id={`options-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={activeTab === tab.id ? `options-panel-${tab.id}` : undefined}
              // 漫游 tabindex：整组只保留一个可 Tab 进入的焦点，其余用方向键切换
              tabIndex={activeTab === tab.id ? 0 : -1}
              data-tab-index={index}
              onClick={() => {
                setActiveTab(tab.id)
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span className={cn(activeTab === tab.id ? 'text-indigo-500' : '')}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`options-panel-${activeTab}`}
          aria-labelledby={`options-tab-${activeTab}`}
        >
          {activeTab === 'providers' && (
            <OptionsProviderSettings settings={settings} onSave={handleSave} onError={showError} />
          )}

          {activeTab === 'services' && (
            <OptionsServicesSettings settings={settings} onSave={handleSave} />
          )}

          {activeTab === 'presets' && (
            <OptionsPresetsTonesSettings settings={settings} onSave={handleSave} />
          )}

          {activeTab === 'language' && (
            <OptionsLanguageSettings
              settings={settings}
              onSave={handleSave}
              onUILanguageChange={handleUILanguageChange}
            />
          )}

          {activeTab === 'display' && (
            <OptionsDisplaySettings settings={settings} onSave={handleSave} />
          )}

          {activeTab === 'general' && (
            <OptionsGeneralSettings settings={settings} onSave={handleSave} />
          )}

          {activeTab === 'backup' && (
            <OptionsBackupRestoreSettings
              settings={settings}
              onError={showError}
              onSuccess={showSuccess}
              onImportSuccess={handleImportSuccess}
            />
          )}

          {activeTab === 'manual' && <OptionsUserManual uiLanguage={settings.uiLanguage} />}

          {activeTab === 'statistics' && (
            <React.Suspense fallback={<OptionsPanelLoading />}>
              <OptionsStatisticsSettings isDark={isDark} />
            </React.Suspense>
          )}
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
