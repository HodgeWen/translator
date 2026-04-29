import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import '@/assets/styles.css';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Toast } from '@/components/ui/toast';
import { Select } from '@/components/ui/select';
import { PopupProviderSelector } from '@/components/popup/provider-selector';
import { PopupTranslationResult } from '@/components/popup/translation-result';
import type { ProviderConfig, ModelQueueItem, GlobalSettings, TranslationResponse, LangCode } from '@/types';
import { getSettings, saveSettings } from '@/lib/storage';
import { sendBgMessage } from '@/lib/messaging';
import { detectLanguage, detectLanguageLocal, shouldSkipTranslation } from '@/lib/lang-detect';
import { LANGUAGE_OPTIONS } from '@/lib/languages';
import { t, setUILanguage } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Settings, Languages } from 'lucide-react';

const TARGET_AUTO = 'auto' as const;
type TargetSelection = typeof TARGET_AUTO | LangCode;

// 预览路径只走本地检测，避免输入过程中向远端发请求泄露内容；
// 实际翻译时再走完整 detectLanguage（含用户配置的远端备用）。
async function resolveTargetLang(
  text: string,
  settings: GlobalSettings,
  options: { localOnly?: boolean } = {}
): Promise<LangCode> {
  const trimmed = text.trim();
  if (!trimmed) return settings.nativeLanguage;
  const detected = options.localOnly
    ? await detectLanguageLocal(trimmed)
    : await detectLanguage(trimmed);
  if (detected && shouldSkipTranslation(detected, settings.nativeLanguage)) {
    return settings.defaultSourceLanguage;
  }
  return settings.nativeLanguage;
}

function App() {
  const { toast, showSuccess, showError, dismiss } = useToast();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [langVersion, setLangVersion] = useState(0);
  const [targetLangPreview, setTargetLangPreview] = useState<LangCode>('zh-CN');
  const [manualTarget, setManualTarget] = useState<TargetSelection>(TARGET_AUTO);
  const detectSeqRef = useRef(0);

  useEffect(() => {
    loadSettings();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.matches) {
      document.documentElement.classList.add('dark');
    }
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!settings) return;
    if (manualTarget !== TARGET_AUTO) {
      setTargetLangPreview(manualTarget);
      return;
    }
    const trimmed = inputText.trim();
    if (!trimmed) {
      setTargetLangPreview(settings.nativeLanguage);
      return;
    }
    const seq = ++detectSeqRef.current;
    const timer = window.setTimeout(async () => {
      const target = await resolveTargetLang(trimmed, settings, { localOnly: true });
      if (seq === detectSeqRef.current) {
        setTargetLangPreview(target);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [inputText, settings, manualTarget]);

  const loadSettings = async () => {
    try {
      const s = await getSettings();
      await setUILanguage(s.uiLanguage);
      setSettings(s);
      setTargetLangPreview(s.nativeLanguage);
      setLangVersion((v) => v + 1);
      const firstEnabled = s.modelQueue.find((m) => m.enabled);
      if (firstEnabled) {
        setSelectedProviderId(firstEnabled.providerId);
        setSelectedModelId(firstEnabled.modelId);
      } else if (s.providers.length > 0) {
        setSelectedProviderId(s.providers[0].id);
        if (s.providers[0].models.length > 0) {
          setSelectedModelId(s.providers[0].models[0].id);
        }
      }
    } catch {
      showError(t('error_load_settings'));
    }
  };

  const getSelectedProvider = (): ProviderConfig | undefined => {
    return settings?.providers.find((p) => p.id === selectedProviderId);
  };

  const handleProviderChange = async (providerId: string) => {
    setSelectedProviderId(providerId);
    const provider = settings?.providers.find((p) => p.id === providerId);
    if (!provider) return;

    const newModelId = provider.models.length > 0 ? provider.models[0].id : '';
    if (newModelId) {
      setSelectedModelId(newModelId);
    }

    if (!settings) return;

    const newQueue: ModelQueueItem[] = settings.modelQueue.map((item) => ({
      ...item,
      enabled: item.providerId === providerId && item.modelId === newModelId ? true : item.enabled,
    }));

    const selectedIndex = newQueue.findIndex(
      (item) => item.providerId === providerId && item.modelId === newModelId
    );
    if (selectedIndex > 0) {
      const [item] = newQueue.splice(selectedIndex, 1);
      newQueue.unshift(item);
    } else if (selectedIndex === -1 && newModelId) {
      newQueue.unshift({
        providerId: providerId,
        modelId: newModelId,
        enabled: true,
      });
    }

    const newSettings = { ...settings, modelQueue: newQueue };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModelId(modelId);
    if (!settings) return;

    const newQueue: ModelQueueItem[] = settings.modelQueue.map((item) => ({
      ...item,
      enabled: item.providerId === selectedProviderId && item.modelId === modelId ? true : item.enabled,
    }));

    const selectedIndex = newQueue.findIndex(
      (item) => item.providerId === selectedProviderId && item.modelId === modelId
    );
    if (selectedIndex > 0) {
      const [item] = newQueue.splice(selectedIndex, 1);
      newQueue.unshift(item);
    } else if (selectedIndex === -1) {
      newQueue.unshift({
        providerId: selectedProviderId,
        modelId: modelId,
        enabled: true,
      });
    }

    const newSettings = { ...settings, modelQueue: newQueue };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    if (!settings) return;
    setLoading(true);
    setResult('');

    try {
      const trimmed = inputText.trim();
      const targetLang =
        manualTarget !== TARGET_AUTO ? manualTarget : await resolveTargetLang(trimmed, settings);
      setTargetLangPreview(targetLang);
      const response = await sendBgMessage<TranslationResponse>({
        type: 'TRANSLATE',
        payload: {
          text: trimmed,
          targetLang,
        },
      });

      setResult(response.text);
    } catch (err) {
      showError(err instanceof Error ? err.message : t('error_translation_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    showSuccess(t('popup_copied'));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && pasted.trim()) {
      // 延迟触发以等待 state 更新
      window.setTimeout(() => {
        handleTranslate();
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTranslate();
    }
  };

  const provider = getSelectedProvider();

  const modelOptions = provider?.models.map((m) => ({ value: m.id, label: m.name })) ?? [];

  return (
    <div className="w-[380px] bg-background text-foreground flex flex-col" key={langVersion}>
      <Toast toast={toast} onDismiss={dismiss} />

      {/* Header */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-gradient-to-r from-indigo-500/5 to-violet-500/5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <Languages className="h-3.5 w-3.5 text-white" />
          </div>
          <h1 className="text-base font-semibold tracking-tight">{t('extName')}</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => chrome.runtime.openOptionsPage()}
          title={t('popup_open_settings')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Provider */}
      <div className="px-4 py-2 border-b border-border">
        <div className="text-[10px] font-medium text-muted-foreground mb-1">{t('popup_provider')}</div>
        <PopupProviderSelector
          providers={settings?.providers ?? []}
          selectedProviderId={selectedProviderId}
          onChange={handleProviderChange}
        />
      </div>

      {/* Model */}
      <div className="px-4 py-2 border-b border-border">
        <div className="text-[10px] font-medium text-muted-foreground mb-1">{t('popup_model')}</div>
        <Select
          value={selectedModelId}
          options={modelOptions}
          onChange={handleModelChange}
          disabled={!provider}
          placeholder={t('popup_model')}
        />
      </div>

      {/* Target Language Hint */}
      <div className="px-4 pt-2 pb-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 min-w-0">
            <Languages className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {t('popup_translate_to')}: {targetLangPreview}
            </span>
          </div>
          <Select
            value={manualTarget}
            options={[
              { value: TARGET_AUTO, label: t('popup_target_auto') },
              ...LANGUAGE_OPTIONS,
            ]}
            onChange={(v) => setManualTarget(v as TargetSelection)}
            className="w-[150px] shrink-0"
          />
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 ml-[18px]">
          {manualTarget === TARGET_AUTO ? t('popup_auto_detect_hint') : t('popup_manual_override_hint')}
        </div>
      </div>

      {/* Input Area */}
      <div className="px-4 py-2 flex-1 flex flex-col gap-2">
        <Textarea
          placeholder={t('popup_placeholder')}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          className="min-h-[80px] resize-none"
        />

        <Button
          onClick={handleTranslate}
          disabled={loading || !inputText.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('popup_translating')}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {t('popup_translate')}
            </>
          )}
        </Button>

        <PopupTranslationResult result={result} onCopy={handleCopy} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
