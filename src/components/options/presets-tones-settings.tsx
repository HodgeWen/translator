import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { GlobalSettings, PresetPrompt, CustomTone } from '@/types';
import { t } from '@/lib/i18n';
import { Plus, Trash2, Edit2, Lock, Sparkles, BookOpen } from 'lucide-react';

interface OptionsPresetsTonesSettingsProps {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
}

// 静态系统内置提示词预设
const SYSTEM_PRESETS: PresetPrompt[] = [
  {
    id: 'academic',
    name: '标准学术翻译',
    description: '将文本翻译成严谨、精确的学术论文或研究报告风格，优化专业术语表达。',
    content: 'You are a professional academic translator. Translate the text into clear, precise, and formal academic prose, maintaining the scholarly tone and terminology.',
    isSystem: true
  }
];

export function OptionsPresetsTonesSettings({ settings, onSave }: OptionsPresetsTonesSettingsProps) {
  const [editingPreset, setEditingPreset] = useState<PresetPrompt | null>(null);
  const [isAddingPreset, setIsAddingPreset] = useState(false);

  const [editingTone, setEditingTone] = useState<CustomTone | null>(null);
  const [isAddingTone, setIsAddingTone] = useState(false);

  // Prompt Presets logic
  const handleAddPreset = () => {
    setEditingPreset({
      id: crypto.randomUUID(),
      name: '自定义提示词预设',
      description: '请输入对该预设提示词的描述...',
      content: '',
    });
    setIsAddingPreset(true);
  };

  const handleEditPreset = (preset: PresetPrompt) => {
    setEditingPreset({ ...preset });
    setIsAddingPreset(false);
  };

  const handleDeletePreset = (id: string) => {
    const nextPresets = settings.customPresetPrompts.filter(p => p.id !== id);
    onSave({
      ...settings,
      customPresetPrompts: nextPresets
    });
  };

  const handleSavePreset = () => {
    if (!editingPreset || !editingPreset.name.trim() || !editingPreset.content.trim()) return;

    let nextPresets: PresetPrompt[];
    if (isAddingPreset) {
      nextPresets = [...settings.customPresetPrompts, editingPreset];
    } else {
      nextPresets = settings.customPresetPrompts.map(p => p.id === editingPreset.id ? editingPreset : p);
    }

    onSave({
      ...settings,
      customPresetPrompts: nextPresets
    });

    setEditingPreset(null);
    setIsAddingPreset(false);
  };

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
      {/* Section 1: Prompt Presets */}
      <div className="rounded-lg border border-border p-6 bg-card space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold">提示词预设 (Prompt Presets)</h3>
          </div>
          {!editingPreset && (
            <Button onClick={handleAddPreset} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="mr-1.5 h-4 w-4" />
              添加自定义预设
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          定义和保存常用的系统或高级自定义 Prompts，可在创建翻译服务的高级配置中快捷导入。
        </p>

        {editingPreset ? (
          <div className="rounded-md border border-border p-4 bg-muted/5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">{isAddingPreset ? '新建预设' : '编辑预设'}</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingPreset(null)} className="h-8">
                  {t('btn_cancel')}
                </Button>
                <Button size="sm" onClick={handleSavePreset} className="bg-indigo-600 hover:bg-indigo-700 text-white h-8">
                  {t('btn_save')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">预设名称</label>
                <input
                  type="text"
                  value={editingPreset.name}
                  onChange={e => setEditingPreset({ ...editingPreset, name: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">预设描述</label>
                <input
                  type="text"
                  value={editingPreset.description || ''}
                  onChange={e => setEditingPreset({ ...editingPreset, description: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt 内容</label>
                <Textarea
                  rows={4}
                  value={editingPreset.content}
                  onChange={e => setEditingPreset({ ...editingPreset, content: e.target.value })}
                  placeholder="输入 Prompt 预设内容..."
                  className="font-mono text-xs font-medium"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Render system static presets */}
            {SYSTEM_PRESETS.map(preset => (
              <div key={preset.id} className="rounded-lg border border-border/80 p-4 bg-muted/20 flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-foreground/90">{preset.name}</h4>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border bg-background flex items-center">
                      <Lock className="h-2.5 w-2.5 mr-1" />
                      系统内置 (只读)
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{preset.description}</p>
                  <pre className="font-mono text-[10px] text-foreground/80 bg-muted/50 p-2.5 rounded border border-border/50 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {preset.content}
                  </pre>
                </div>
              </div>
            ))}

            {/* Render custom presets */}
            {settings.customPresetPrompts.map(preset => (
              <div key={preset.id} className="rounded-lg border border-border p-4 bg-card flex items-start justify-between gap-4 hover:border-indigo-500/30 transition-colors">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-foreground">{preset.name}</h4>
                    <Badge variant="outline" className="text-[10px] text-indigo-500 border-indigo-200/50 bg-indigo-500/5">
                      自定义
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{preset.description}</p>
                  <pre className="font-mono text-[10px] text-foreground/80 bg-muted/50 p-2.5 rounded border border-border/50 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {preset.content}
                  </pre>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleEditPreset(preset)} className="h-8">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeletePreset(preset.id)} className="h-8">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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
          <div className="space-y-3">
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
