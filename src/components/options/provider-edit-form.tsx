import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CodeEditor } from '@/components/code-editor';
import { NumberInput } from '@/components/ui/number-input';
import { KeyValueList } from './key-value-list';
import { Switch, SwitchRow } from '@/components/ui/switch';
import { ReasoningHelpModal } from './reasoning-help-modal';
import type { ColorScheme, ProviderConfig } from '@/types';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Save, FileText, Sliders, ArrowUp, ArrowDown, Globe } from 'lucide-react';
import { PresetUrlsModal } from './preset-urls-modal';
import { ProviderTestPanel } from './provider-test-panel';
import { PasswordInput } from '@/components/ui/password-input';

/**
 * 接口地址校验：必须是带协议的合法 URL（与 schema 的 `z.string().url()` 对齐）。
 * 抽成纯函数便于单测，也避免表单与 schema 的口径漂移。
 */
export function isValidEndpointUrl(baseURL: string): boolean {
  try {
    const url = new URL(baseURL.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

interface ProviderEditFormProps {
  provider: ProviderConfig;
  isAddingProvider: boolean;
  nativeLanguage: string;
  /** 界面语言：用于弹窗内技术文档的双语提示 */
  uiLanguage?: string;
  /** 界面配色偏好，透传给内嵌 CodeMirror 主题 */
  colorScheme?: ColorScheme;
  onSave: (provider: ProviderConfig) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

export function ProviderEditForm({
  provider: initialProvider,
  isAddingProvider,
  nativeLanguage,
  uiLanguage,
  colorScheme = 'system',
  onSave,
  onCancel,
  onError,
}: ProviderEditFormProps) {
  const [editingProvider, setEditingProvider] = useState<ProviderConfig>({ ...initialProvider });
  const [showReasoningHelp, setShowReasoningHelp] = useState(false);
  const [showPresetUrlsModal, setShowPresetUrlsModal] = useState(false);
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
    // schema 要求合法 URL，但表单此前只校验非空：用户填 `example.com`（漏协议）
    // 能通过表单，随后被 Zod 丢弃，provider 与 API Key 一起静默消失。
    // 这里提前拦截，给出可操作的提示。
    if (!isValidEndpointUrl(editingProvider.baseURL)) {
      onError(t('error_invalid_base_url'));
      return;
    }
    onSave(editingProvider);
  };

  // 弹窗内正文技术文档暂只提供中文，这里把界面语言透传下去做双语提示
  const isZh = (uiLanguage ?? 'zh-CN').startsWith('zh');

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
          <div className="flex items-center h-5">
            <label htmlFor="provider-name" className="text-sm font-medium">{t('label_name')}</label>
          </div>
          <input
            id="provider-name"
            type="text"
            value={editingProvider.name}
            onChange={(e) => updateEditingProvider({ name: e.target.value })}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between h-5">
            <label htmlFor="provider-base-url" className="text-sm font-medium">{t('label_base_url')}</label>
            <button
              type="button"
              onClick={() => setShowPresetUrlsModal(true)}
              className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{t('label_preset_urls')}</span>
            </button>
          </div>
          <input
            id="provider-base-url"
            type="text"
            value={editingProvider.baseURL}
            onChange={(e) => updateEditingProvider({ baseURL: e.target.value })}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="provider-api-key" className="text-sm font-medium">{t('label_api_key')}</label>
        <PasswordInput
          id="provider-api-key"
          value={editingProvider.apiKey}
          onChange={(apiKey) => updateEditingProvider({ apiKey })}
          placeholder={t('placeholder_api_key')}
        />
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
            <span id="provider-temperature-label" className="text-sm">{t('label_temperature')}</span>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {temperature.toFixed(2)}
            </Badge>
          </div>
          <input
            type="range"
            aria-labelledby="provider-temperature-label"
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
            <span id="provider-top-p-label" className="text-sm">{t('label_top_p')}</span>
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
            aria-labelledby="provider-top-p-label"
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

        <div className="space-y-2" role="group" aria-labelledby="provider-max-tokens-label">
          <span id="provider-max-tokens-label" className="text-sm block">{t('label_max_tokens')}</span>
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
        <SwitchRow
          labelId="provider-stream-label"
          label={t('label_stream')}
          description={<span className="mt-0.5 inline-block">{t('hint_stream')}</span>}
        >
          <Switch
            checked={stream}
            onChange={(checked) => updateEditingProvider({ stream: checked })}
            labelledBy="provider-stream-label"
          />
        </SwitchRow>
      </div>

      <div className="space-y-2" role="group" aria-labelledby="provider-extra-body-label">
        <div className="flex items-center justify-between">
          <div id="provider-extra-body-label" className="text-sm font-medium">{t('label_extra_body')}</div>
          <button
            type="button"
            onClick={() => setShowReasoningHelp(true)}
            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center gap-1.5 cursor-pointer bg-indigo-50 dark:bg-indigo-950/20 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{isZh ? '配置指南：如何控制大模型推理与思考深度' : 'Guide: controlling model reasoning depth'}</span>
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{t('hint_extra_body_override')}</p>
        <CodeEditor
          colorScheme={colorScheme}
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


      <div className="space-y-2" role="group" aria-labelledby="provider-models-label">
        <div id="provider-models-label" className="text-sm font-medium">{t('label_models')}</div>
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
              aria-label={t('label_model_id')}
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
              aria-label={t('label_display_name')}
              value={model.name}
              onChange={(e) => {
                const newModels = [...editingProvider.models];
                newModels[index] = { ...newModels[index], name: e.target.value };
                updateEditingModels(newModels);
              }}
              placeholder={t('label_display_name')}
              className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            />
            <label
              className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
              title={t('hint_supports_vision')}
            >
              <input
                type="checkbox"
                checked={model.supportsVision === true}
                onChange={(e) => {
                  const newModels = [...editingProvider.models];
                  newModels[index] = { ...newModels[index], supportsVision: e.target.checked };
                  updateEditingModels(newModels);
                }}
                className="accent-indigo-500"
              />
              {t('label_supports_vision')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t('btn_delete')}
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
          onClick={() => updateEditingModels([...editingProvider.models, { id: '', name: '', supportsVision: false }])}
        >
          <Plus className="mr-1 h-3 w-3" />
          {t('btn_add_model')}
        </Button>
      </div>

      {/* 连通性测试：独立组件，自带竞态作废逻辑 */}
      <ProviderTestPanel provider={editingProvider} nativeLanguage={nativeLanguage} />

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-border bg-background/95 backdrop-blur-sm rounded-b-lg">
        <div className="px-6 py-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
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
        uiLanguage={uiLanguage}
      />

      {/* Preset URLs list lookup modal */}
      <PresetUrlsModal
        isOpen={showPresetUrlsModal}
        onClose={() => setShowPresetUrlsModal(false)}
      />
    </div>
  );
}
