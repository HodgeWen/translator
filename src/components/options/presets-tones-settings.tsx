import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { GlobalSettings, CustomTone } from '@/types';
import { t } from '@/lib/i18n';
import { useDebouncedSave } from '@/hooks/use-debounced-save';
import { DEFAULT_GLOBAL_PROMPT, TONE_INSTRUCTIONS } from '@/lib/prompts';
import { Plus, Trash2, Edit2, Lock, Sparkles, FileText, RotateCcw } from 'lucide-react';
import { SettingsCard } from './settings-card';

interface OptionsPresetsTonesSettingsProps {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
}

// 系统内置翻译风格（只读）的 id 列表，与 TONE_INSTRUCTIONS 保持同步。
// 注意：文案必须在组件内调用 t() 生成，否则切换语言后模块级缓存不会刷新。
const SYSTEM_TONE_IDS = Object.keys(TONE_INSTRUCTIONS) as Array<keyof typeof TONE_INSTRUCTIONS>;

export function OptionsPresetsTonesSettings({ settings, onSave }: OptionsPresetsTonesSettingsProps) {
  const [draftPrompt, setDraftPrompt] = useState(settings.globalPrompt);

  useEffect(() => { setDraftPrompt(settings.globalPrompt); }, [settings.globalPrompt]);

  const systemTones = SYSTEM_TONE_IDS.map(key => ({
    id: key,
    label: t(`tone_${key}`),
    desc: t(`tone_${key}_desc`),
    instruction: TONE_INSTRUCTIONS[key],
  }));

  // 全局提示词 textarea 逐字输入：同样走共享防抖，避免打满 sync 写入配额
  const debouncedSave = useDebouncedSave(settings, onSave);

  const [editingTone, setEditingTone] = useState<CustomTone | null>(null);
  const [isAddingTone, setIsAddingTone] = useState(false);

  // Custom Tones logic
  const handleAddTone = () => {
    setEditingTone({
      id: `custom_tone_${crypto.randomUUID().slice(0, 8)}`,
      name: t('title_add_tone'),
      promptInstruction: '',
    });
    setIsAddingTone(true);
  };

  const handleEditTone = (tone: CustomTone) => {
    setEditingTone({ ...tone });
    setIsAddingTone(false);
  };

  const handleDeleteTone = (id: string) => {
    const nextTones = settings.customTones.filter(tone => tone.id !== id);
    onSave({
      ...settings,
      customTones: nextTones
    });
  };

  const handleSaveTone = () => {
    if (!editingTone || !editingTone.name.trim() || !editingTone.promptInstruction.trim()) return;

    let nextTones: CustomTone[];
    if (isAddingTone) {
      nextTones = [...settings.customTones, editingTone];
    } else {
      nextTones = settings.customTones.map(tone => tone.id === editingTone.id ? editingTone : tone);
    }

    onSave({
      ...settings,
      customTones: nextTones
    });

    setEditingTone(null);
    setIsAddingTone(false);
  };

  return (
    <div className="space-y-10">
      {/* Section 1: Global Prompt */}
      <SettingsCard
        icon={<FileText className="h-5 w-5 text-indigo-500" />}
        title={t('title_global_prompt')}
        spaceClass="space-y-4"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSave({ ...settings, globalPrompt: DEFAULT_GLOBAL_PROMPT })}
            disabled={settings.globalPrompt === DEFAULT_GLOBAL_PROMPT}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t('btn_reset_default')}
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">{t('desc_global_prompt')}</p>
        <label htmlFor="global-prompt-input" className="sr-only">{t('title_global_prompt')}</label>
        <textarea
          id="global-prompt-input"
          value={draftPrompt}
          onChange={(e) => { setDraftPrompt(e.target.value); debouncedSave({ globalPrompt: e.target.value }); }}
          rows={8}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y font-mono"
        />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>{t('hint_prompt_vars')}</p>
          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{'{{targetLang}}'}</code>
        </div>
      </SettingsCard>

      {/* Section 2: Custom Tones */}
      <SettingsCard
        icon={<Sparkles className="h-5 w-5 text-violet-500" />}
        title={t('title_custom_tones')}
        actions={
          !editingTone ? (
            <Button onClick={handleAddTone} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="mr-1.5 h-4 w-4" />
              {t('btn_add_tone')}
            </Button>
          ) : null
        }
      >
        <p className="text-xs text-muted-foreground mt-1">{t('desc_custom_tones')}</p>

        {editingTone ? (
          <div className="rounded-md border border-border p-4 bg-muted/5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">{isAddingTone ? t('title_add_tone') : t('title_edit_tone')}</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingTone(null)} className="h-8">
                  {t('btn_cancel')}
                </Button>
                <Button size="sm" onClick={handleSaveTone} className="bg-indigo-600 hover:bg-indigo-700 text-white h-8">
                  {t('btn_save')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label htmlFor="tone-name-input" className="text-sm font-medium">{t('label_tone_name')}</label>
                <input
                  id="tone-name-input"
                  type="text"
                  value={editingTone.name}
                  onChange={e => setEditingTone({ ...editingTone, name: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="tone-instruction-input" className="text-sm font-medium">{t('label_tone_instruction')}</label>
                <Textarea
                  id="tone-instruction-input"
                  rows={3}
                  value={editingTone.promptInstruction}
                  onChange={e => setEditingTone({ ...editingTone, promptInstruction: e.target.value })}
                  placeholder={t('placeholder_tone_instruction')}
                  className="font-mono text-xs font-medium"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Render system built-in tones (read-only) */}
            {systemTones.map(tone => (
              <div key={tone.id} className="rounded-lg border border-border/80 p-4 bg-muted/20 flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-foreground/90">{tone.label}</h4>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border bg-background flex items-center">
                      <Lock className="h-2.5 w-2.5 mr-1" />
                      {t('badge_builtin_readonly')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tone.desc}</p>
                  <pre className="font-mono text-[10px] text-foreground/80 bg-muted/50 p-2.5 rounded border border-border/50 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{tone.instruction || t('tone_no_extra_instruction')}
                  </pre>
                </div>
              </div>
            ))}

            {/* Render custom tones */}
            <div className="pt-2">
              <h4 className="text-sm font-semibold mb-3">{t('title_custom_tones_section')}</h4>
              {settings.customTones.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-border rounded-lg bg-muted/5 text-xs text-muted-foreground">
                  {t('empty_no_tones')}
                </div>
              ) : (
                <div className="space-y-3">
                  {settings.customTones.map(tone => (
                    <div key={tone.id} className="rounded-lg border border-border p-4 bg-card flex items-center justify-between gap-4 hover:border-violet-500/30 transition-colors">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground">{tone.name}</h4>
                          <Badge variant="outline" className="text-[10px] text-violet-500 border-violet-200/50 bg-violet-500/5">
                            {t('title_custom_tones_section')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground/80 font-mono truncate">{tone.promptInstruction}</p>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleEditTone(tone)} className="h-8" aria-label={t('btn_edit')}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteTone(tone.id)} className="h-8" aria-label={t('btn_delete')}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SettingsCard>
    </div>
  );
}
