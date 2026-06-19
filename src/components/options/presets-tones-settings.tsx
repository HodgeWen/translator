import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { GlobalSettings, CustomTone } from '@/types';
import { t } from '@/lib/i18n';
import { DEFAULT_GLOBAL_PROMPT, TONE_INSTRUCTIONS } from '@/lib/prompts';
import { Plus, Trash2, Edit2, Lock, Sparkles, FileText, RotateCcw } from 'lucide-react';

interface OptionsPresetsTonesSettingsProps {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
}

// 系统内置翻译风格（只读），与 TONE_INSTRUCTIONS 保持同步
const SYSTEM_TONES = (Object.keys(TONE_INSTRUCTIONS) as Array<keyof typeof TONE_INSTRUCTIONS>).map(key => ({
  id: key,
  label: t(`tone_${key}`),
  desc: t(`tone_${key}_desc`),
  instruction: TONE_INSTRUCTIONS[key],
}));

export function OptionsPresetsTonesSettings({ settings, onSave }: OptionsPresetsTonesSettingsProps) {
  const [draftPrompt, setDraftPrompt] = useState(settings.globalPrompt);

  useEffect(() => { setDraftPrompt(settings.globalPrompt); }, [settings.globalPrompt]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSave = useCallback((patch: Partial<GlobalSettings>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSave({ ...settings, ...patch });
    }, 500);
  }, [settings, onSave]);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const [editingTone, setEditingTone] = useState<CustomTone | null>(null);
  const [isAddingTone, setIsAddingTone] = useState(false);

  // Custom Tones logic
  const handleAddTone = () => {
    setEditingTone({
      id: `custom_tone_${crypto.randomUUID().slice(0, 8)}`,
      name: '自定义语气风格',
      promptInstruction: '',
    });
    setIsAddingTone(true);
  };

  const handleEditTone = (tone: CustomTone) => {
    setEditingTone({ ...tone });
    setIsAddingTone(false);
  };

  const handleDeleteTone = (id: string) => {
    const nextTones = settings.customTones.filter(t => t.id !== id);
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
      nextTones = settings.customTones.map(t => t.id === editingTone.id ? editingTone : t);
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
      <div className="rounded-lg border border-border p-6 bg-card space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold">{t('title_global_prompt')}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSave({ ...settings, globalPrompt: DEFAULT_GLOBAL_PROMPT })}
            disabled={settings.globalPrompt === DEFAULT_GLOBAL_PROMPT}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t('btn_reset_default')}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t('desc_global_prompt')}</p>
        <textarea
          value={draftPrompt}
          onChange={(e) => { setDraftPrompt(e.target.value); debouncedSave({ globalPrompt: e.target.value }); }}
          rows={8}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y font-mono"
        />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>{t('hint_prompt_vars')}</p>
          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{'{{targetLang}}'}</code>
        </div>
      </div>

      {/* Section 2: Custom Tones */}
      <div className="rounded-lg border border-border p-6 bg-card space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            <h3 className="text-lg font-semibold">自定义语气风格 (Custom Translation Tones)</h3>
          </div>
          {!editingTone && (
            <Button onClick={handleAddTone} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="mr-1.5 h-4 w-4" />
              添加风格语气
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          定义属于你个人的个性化翻译语气风格。自定义语气将和系统默认翻译语气一同可供选择。
        </p>

        {editingTone ? (
          <div className="rounded-md border border-border p-4 bg-muted/5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">{isAddingTone ? '新建风格语气' : '编辑风格语气'}</h4>
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
                <label className="text-sm font-medium">风格名称 (例如: 学术风、文言文风)</label>
                <input
                  type="text"
                  value={editingTone.name}
                  onChange={e => setEditingTone({ ...editingTone, name: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">注入的 Prompt 指令 (例如: Translate in Classical Chinese style...)</label>
                <Textarea
                  rows={3}
                  value={editingTone.promptInstruction}
                  onChange={e => setEditingTone({ ...editingTone, promptInstruction: e.target.value })}
                  placeholder="输入该风格翻译需要遵循的具体 Prompt 指导指令..."
                  className="font-mono text-xs font-medium"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Render system built-in tones (read-only) */}
            {SYSTEM_TONES.map(tone => (
              <div key={tone.id} className="rounded-lg border border-border/80 p-4 bg-muted/20 flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-foreground/90">{tone.label}</h4>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border bg-background flex items-center">
                      <Lock className="h-2.5 w-2.5 mr-1" />
                      系统内置 (只读)
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tone.desc}</p>
                  <pre className="font-mono text-[10px] text-foreground/80 bg-muted/50 p-2.5 rounded border border-border/50 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{tone.instruction || '（无额外指令，使用默认自然翻译风格）'}
                  </pre>
                </div>
              </div>
            ))}

            {/* Render custom tones */}
            {settings.customTones.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-border rounded-lg bg-muted/5 text-xs text-muted-foreground">
                目前没有任何自定义语气风格，支持添加个性化的语气！
              </div>
            ) : (
              settings.customTones.map(tone => (
                <div key={tone.id} className="rounded-lg border border-border p-4 bg-card flex items-center justify-between gap-4 hover:border-violet-500/30 transition-colors">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-foreground">{tone.name}</h4>
                      <Badge variant="outline" className="text-[10px] text-violet-500 border-violet-200/50 bg-violet-500/5">
                        自定义语气
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground/80 font-mono truncate">{tone.promptInstruction}</p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleEditTone(tone)} className="h-8">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteTone(tone.id)} className="h-8">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
