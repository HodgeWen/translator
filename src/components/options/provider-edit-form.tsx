import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CodeEditor } from '@/components/code-editor';
import { NumberInput } from '@/components/ui/number-input';
import { KeyValueList } from './key-value-list';
import { ReasoningHelpModal } from './reasoning-help-modal';
import type { ProviderConfig } from '@/types';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { testProvider } from '@/lib/api';
import { getRandomGreeting } from '@/lib/greetings';
import { Plus, Trash2, Save, Eye, EyeOff, FileText, Sliders, ArrowUp, ArrowDown, Play, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface ProviderEditFormProps {
  provider: ProviderConfig;
  isAddingProvider: boolean;
  nativeLanguage: string;
  onSave: (provider: ProviderConfig) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

export function ProviderEditForm({
  provider: initialProvider,
  isAddingProvider,
  nativeLanguage,
  onSave,
  onCancel,
  onError,
}: ProviderEditFormProps) {
  const [editingProvider, setEditingProvider] = useState<ProviderConfig>({ ...initialProvider });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showReasoningHelp, setShowReasoningHelp] = useState(false);
  const testRunIdRef = useRef(0);
  const activeTestProviderIdRef = useRef<string | null>(null);
  const [testState, setTestState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; result: string; modelName: string; sourceLang: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const resetTestState = (providerId: string | null = null) => {
    testRunIdRef.current += 1;
    activeTestProviderIdRef.current = providerId;
    setTestState({ status: 'idle' });
  };

  const handleTest = async () => {
    const providerId = editingProvider.id;
    const runId = testRunIdRef.current + 1;
    testRunIdRef.current = runId;
    activeTestProviderIdRef.current = providerId;
    setTestState({ status: 'loading' });
    try {
      const greeting = getRandomGreeting();
      const result = await testProvider(editingProvider, greeting.text, nativeLanguage);
      if (testRunIdRef.current !== runId || activeTestProviderIdRef.current !== providerId) return;
      setTestState({
        status: 'success',
        result: result.text,
        modelName: result.modelName,
        sourceLang: greeting.lang,
        usage: result.usage,
      });
    } catch (err) {
      if (testRunIdRef.current !== runId || activeTestProviderIdRef.current !== providerId) return;
      setTestState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  const updateEditingProvider = (updates: Partial<ProviderConfig>) => {
    setEditingProvider((prev) => ({ ...prev, ...updates }));
  };

  const updateEditingModels = (models: ProviderConfig['models']) => {
    setEditingProvider((prev) => ({ ...prev, models }));
  };

  const handleSave = () => {
    if (!editingProvider.name.trim() || !editingProvider.baseURL.trim()) {
      onError(t('error_required_fields'));
      return;
    }
    onSave(editingProvider);
  };

  const temperature = editingProvider.temperature ?? 0.3;
  const topPEnabled = editingProvider.topP !== undefined;
  const topP = editingProvider.topP ?? 1.0;
  const stream = editingProvider.stream === true;

  return (
    <div className="rounded-lg border border-border p-6 space-y-6">
      <div className="flex items-center">
        <h3 className="text-lg font-semibold">
          {isAddingProvider ? t('title_add_provider') : t('title_edit_provider')}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('label_name')}</label>
          <input
            type="text"
            value={editingProvider.name}
            onChange={(e) => updateEditingProvider({ name: e.target.value })}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('label_base_url')}</label>
          <input
            type="text"
            value={editingProvider.baseURL}
            onChange={(e) => updateEditingProvider({ baseURL: e.target.value })}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t('label_api_key')}</label>
        <div className="flex gap-2">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={editingProvider.apiKey}
            onChange={(e) => updateEditingProvider({ apiKey: e.target.value })}
            placeholder={t('placeholder_api_key')}
            className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setShowApiKey(!showApiKey)}
            title={showApiKey ? t('btn_hide') : t('btn_show')}
          >
            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('hint_api_key')}</p>
      </div>

      <div className="space-y-2">
        <KeyValueList
          label={t('label_headers')}
          items={editingProvider.headers}
          onChange={(headers) => updateEditingProvider({ headers })}
        />
        <p className="text-xs text-muted-foreground">{t('hint_content_type_auto')}</p>
      </div>

      <KeyValueList
        label={t('label_query_params')}
        items={editingProvider.query}
        onChange={(query) => updateEditingProvider({ query })}
      />

      <div className="space-y-4 rounded-md border border-border p-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-medium">{t('label_sampling')}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm">{t('label_temperature')}</label>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {temperature.toFixed(2)}
            </Badge>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={temperature}
            onChange={(e) => updateEditingProvider({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <p className="text-xs text-muted-foreground">{t('hint_temperature')}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm">{t('label_top_p')}</label>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  'font-mono text-[11px]',
                  !topPEnabled && 'opacity-40'
                )}
              >
                {topP.toFixed(2)}
              </Badge>
              <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={topPEnabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateEditingProvider({ topP: editingProvider.topP ?? 1.0 });
                    } else {
                      updateEditingProvider({ topP: undefined });
                    }
                  }}
                  className="accent-indigo-500"
                />
                {t('label_top_p_enable')}
              </label>
            </div>
          </div>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={topP}
            disabled={!topPEnabled}
            onChange={(e) => updateEditingProvider({ topP: parseFloat(e.target.value) })}
            className="w-full accent-indigo-500 disabled:opacity-40"
          />
          <p className="text-xs text-muted-foreground">{t('hint_top_p')}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm">{t('label_max_tokens')}</label>
          <NumberInput
            min={1}
            allowEmpty
            placeholder="—"
            value={editingProvider.maxTokens}
            onChange={(v) => updateEditingProvider({ maxTokens: v })}
          />
          <p className="text-xs text-muted-foreground">{t('hint_max_tokens')}</p>
        </div>
      </div>

      <div className="rounded-md border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{t('label_stream')}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{t('hint_stream')}</div>
          </div>
          <button
            type="button"
            onClick={() => updateEditingProvider({ stream: !stream })}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              stream ? 'bg-indigo-500' : 'bg-muted'
            )}
            aria-pressed={stream}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                stream ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{t('label_extra_body')}</label>
          <button
            type="button"
            onClick={() => setShowReasoningHelp(true)}
            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center gap-1.5 cursor-pointer bg-indigo-50 dark:bg-indigo-950/20 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>配置指南: 如何控制大模型推理与思考深度</span>
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{t('hint_extra_body_override')}</p>
        <CodeEditor
          value={JSON.stringify(editingProvider.body, null, 2)}
          onChange={(value) => {
            try {
              const body = JSON.parse(value);
              updateEditingProvider({ body });
            } catch {
              // Ignore invalid JSON during typing
            }
          }}
          height="150px"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-500" />
          {t('label_provider_prompt')}
        </label>
        <textarea
          value={editingProvider.prompt || ''}
          onChange={(e) => updateEditingProvider({ prompt: e.target.value })}
          placeholder={t('placeholder_provider_prompt')}
          rows={4}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y"
        />
        <p className="text-xs text-muted-foreground">{t('hint_provider_prompt')}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t('label_models')}</label>
        <p className="text-xs text-muted-foreground">{t('hint_model_order')}</p>
        {editingProvider.models.map((model, index) => (
          <div key={index} className="flex gap-2 items-center">
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                className="h-3.5 w-5 flex items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-default"
                disabled={index === 0}
                onClick={() => {
                  const newModels = [...editingProvider.models];
                  [newModels[index - 1], newModels[index]] = [newModels[index], newModels[index - 1]];
                  updateEditingModels(newModels);
                }}
                title={t('btn_move_up')}
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="h-3.5 w-5 flex items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-default"
                disabled={index === editingProvider.models.length - 1}
                onClick={() => {
                  const newModels = [...editingProvider.models];
                  [newModels[index], newModels[index + 1]] = [newModels[index + 1], newModels[index]];
                  updateEditingModels(newModels);
                }}
                title={t('btn_move_down')}
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
            <input
              type="text"
              value={model.id}
              onChange={(e) => {
                const newModels = [...editingProvider.models];
                newModels[index] = { ...newModels[index], id: e.target.value };
                updateEditingModels(newModels);
              }}
              placeholder={t('label_model_id')}
              className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            />
            <input
              type="text"
              value={model.name}
              onChange={(e) => {
                const newModels = [...editingProvider.models];
                newModels[index] = { ...newModels[index], name: e.target.value };
                updateEditingModels(newModels);
              }}
              placeholder={t('label_display_name')}
              className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const newModels = editingProvider.models.filter((_, i) => i !== index);
                updateEditingModels(newModels);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => updateEditingModels([...editingProvider.models, { id: '', name: '' }])}
        >
          <Plus className="mr-1 h-3 w-3" />
          {t('btn_add_model')}
        </Button>
      </div>

      {/* Test Connectivity */}
      <div className="rounded-md border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{t('label_test_provider')}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{t('hint_test_provider')}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testState.status === 'loading'}
          >
            {testState.status === 'loading' ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-1.5 h-3.5 w-3.5" />
            )}
            {t('btn_test')}
          </Button>
        </div>

        {testState.status === 'success' && (
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">{t('test_success')}</span>
            </div>
            <div className="text-sm text-foreground">{testState.result}</div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <span className="truncate max-w-[120px]">{testState.modelName}</span>
              {testState.usage && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>Prompt {testState.usage.promptTokens}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>Output {testState.usage.completionTokens}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>Total {testState.usage.totalTokens}</span>
                </>
              )}
            </div>
          </div>
        )}

        {testState.status === 'error' && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              <span className="text-xs font-medium">{t('test_failed')}</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-300 break-all">{testState.message}</p>
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-border bg-background/95 backdrop-blur-sm rounded-b-lg">
        <div className="px-6 py-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => { onCancel(); resetTestState(); }}>
            {t('btn_cancel')}
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Save className="mr-1.5 h-4 w-4" />
            {t('btn_save')}
          </Button>
        </div>
      </div>

      {/* Reasoning and thinking parameters configuration help modal */}
      <ReasoningHelpModal
        isOpen={showReasoningHelp}
        onClose={() => setShowReasoningHelp(false)}
      />
    </div>
  );
}
