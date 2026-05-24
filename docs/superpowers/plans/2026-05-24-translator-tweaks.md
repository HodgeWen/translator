# Translator Extension Tweaks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement four major micro-adjustments: resolve Options Select overflow clipping, introduce live model selection in Popup & Options cards, replace native inputs with NumberInput in translation pool, and dynamically compute traffic weight percentage.

**Architecture:** Modifying Options setting component React states to calculate dynamic sum ratios, adding selective sub-rows in Popup matching active service types, and rewriting core prompt rendering to conditionally cascade instructions.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, WXT.

---

### Task 1: Options Panel Collapsible Container Overflow Fix

**Files:**
- Modify: `src/components/options/services-settings.tsx:360-365`

- [ ] **Step 1: Locate and modify the collapsible settings panel container**
  Remove the `overflow-hidden` class name in the collapsible panel wrapper.

  Target:
  ```tsx
            {/* Collapsible Advanced Config Accordion */}
            <div className="border border-border rounded-md overflow-hidden bg-background">
  ```

  Replacement:
  ```tsx
            {/* Collapsible Advanced Config Accordion */}
            <div className="border border-border rounded-md bg-background">
  ```

- [ ] **Step 2: Run build to verify correct compile**
  Run: `bun compile`
  Expected: Compile successfully.

- [ ] **Step 3: Commit**
  ```bash
  git add src/components/options/services-settings.tsx
  git commit -m "fix(options): remove overflow-hidden from advanced settings wrapper to prevent dropdown clipping"
  ```

---

### Task 2: Prompt Preset Cleanup and Smart Global Format Merge

**Files:**
- Modify: `src/lib/api.ts:268-278`
- Modify: `src/components/options/services-settings.tsx:17-21`
- Modify: `src/components/options/presets-tones-settings.tsx:15-30`

- [ ] **Step 1: Clean up bilingual presets**
  Remove the bilingual preset from `src/components/options/services-settings.tsx` and `src/components/options/presets-tones-settings.tsx`.

  In `src/components/options/services-settings.tsx`:
  ```typescript
  // 内置系统提示词预设，用于快捷填充
  const SYSTEM_PRESETS = [
    { id: 'academic', name: '标准学术翻译', content: 'You are a professional academic translator. Translate the text into clear, precise, and formal academic prose, maintaining the scholarly tone and terminology.' }
  ];
  ```

  In `src/components/options/presets-tones-settings.tsx`:
  ```typescript
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
  ```

- [ ] **Step 2: Implement smart prompt template merging**
  In `src/lib/api.ts`, modify the `basePrompt` resolution logic. If `activeService.prompt` contains `{{targetLang}}`, it completely replaces the global prompt. Otherwise, it is appended to the bottom of the global prompt to safeguard core HTML formatting and tag translation constraints.

  Target:
  ```typescript
        // 拼装提示词与风格
        const basePrompt = activeService.prompt?.trim() || settings.globalPrompt;
  ```

  Replacement:
  ```typescript
        // 拼装提示词与风格
        let basePrompt = settings.globalPrompt;
        if (activeService.prompt?.trim()) {
          const servicePrompt = activeService.prompt.trim();
          if (servicePrompt.includes('{{targetLang}}')) {
            basePrompt = servicePrompt;
          } else {
            basePrompt = `${settings.globalPrompt}\n\nAdditional translation instructions for this service:\n${servicePrompt}`;
          }
        }
  ```

- [ ] **Step 3: Compile verification**
  Run: `bun compile`
  Expected: Success without compilation errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/options/services-settings.tsx src/components/options/presets-tones-settings.tsx src/lib/api.ts
  git commit -m "feat(prompt): smart cascade service prompts and purge duplicate bilingual presets"
  ```

---

### Task 3: Pool Service Weights with Custom NumberInput & Real-time Ratios

**Files:**
- Modify: `src/components/options/services-settings.tsx:310-357`

- [ ] **Step 1: Import NumberInput and compute pool total weight**
  Import the `NumberInput` component at the top of `src/components/options/services-settings.tsx`:
  ```typescript
  import { NumberInput } from '@/components/ui/number-input';
  ```

  And compute the total pool weight of the currently edited service inside the editing block:
  ```typescript
  const poolProviders = editingService.type === 'pool' ? (editingService as PoolService).poolProviders : [];
  const totalWeight = poolProviders.reduce((sum, item) => sum + (item.weight || 0), 0);
  ```

- [ ] **Step 2: Replace native inputs with NumberInput & display percentage**
  Change the weight column input component to `NumberInput` with no maximum restriction, and add an inline percentage badge computed as `(item.weight / totalWeight) * 100`.

  Target:
  ```tsx
                      <div className="w-24 space-y-1.5">
                        <label className="text-xs text-muted-foreground">权重 (1-100)</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={row.weight}
                          onChange={e => handlePoolRowChange(index, 'weight', parseInt(e.target.value) || 1)}
                          className="flex h-7 w-full rounded border border-input bg-transparent px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
  ```

  Replacement:
  ```tsx
                      <div className="w-32 space-y-1.5" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <label>权重</label>
                          <span className="text-[10px] text-indigo-500 font-mono font-medium">
                            {(totalWeight > 0 ? ((row.weight || 0) / totalWeight * 100) : 0).toFixed(1)}%
                          </span>
                        </div>
                        <NumberInput
                          min={1}
                          value={row.weight}
                          onChange={val => handlePoolRowChange(index, 'weight', val)}
                          size="sm"
                          className="w-full"
                        />
                      </div>
  ```

- [ ] **Step 3: Compile verification**
  Run: `bun compile`
  Expected: Success without compilation errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/options/services-settings.tsx
  git commit -m "feat(pool): integrate custom NumberInput and compute live traffic percentages for weights"
  ```

---

### Task 4: On-the-fly Model Switching in Popup & Service Cards

**Files:**
- Modify: `src/entrypoints/popup/main.tsx`
- Modify: `src/components/options/services-settings.tsx`

- [ ] **Step 1: Implement model selector row in Popup**
  Add live model switching row below the service selector row in `src/entrypoints/popup/main.tsx` if the active service is of type `single`.

  In `src/entrypoints/popup/main.tsx` add handler:
  ```typescript
    const handleModelChange = async (modelId: string) => {
      if (!settings || !activeService || activeService.type !== 'single') return;
      const updatedServices = settings.services.map((s) => {
        if (s.id === activeService.id) {
          return { ...s, modelId };
        }
        return s;
      });
      const newSettings = { ...settings, services: updatedServices };
      setSettings(newSettings);
      await saveSettings(newSettings);
    };
  ```

  In JSX below `Services Selector Row`:
  ```tsx
        {/* Single Service Model Selector Row */}
        {activeService && activeService.type === 'single' && (
          <div className="px-4 py-1.5 border-b border-border flex items-center justify-between gap-3 bg-muted/5">
            <span className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              翻译模型:
            </span>
            <Select
              value={activeService.modelId}
              options={settings.providers.find(p => p.id === activeService.providerId)?.models.map(m => ({ value: m.id, label: m.name })) || []}
              onChange={handleModelChange}
              placeholder="选择模型"
              className="flex-1 max-w-[280px]"
              compact
            />
          </div>
        )}
  ```

- [ ] **Step 2: Implement on-the-fly model switching in Option service cards**
  Transform the static model label on `Single` cards into an interactive inline Select.

  Target in card list:
  ```tsx
                        {service.type === 'single' ? (
                          <>
                            提供商:{' '}
                            <span className="font-medium text-foreground/80">
                              {settings.providers.find(p => p.id === service.providerId)?.name || service.providerId}
                            </span>{' '}
                            | 模型:{' '}
                            <span className="font-medium text-foreground/80">{service.modelId}</span>
                            {service.fallbackEnabled && ' (开启自动降级)'}
                          </>
                        )
  ```

  Replacement:
  ```tsx
                        {service.type === 'single' ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>提供商:</span>
                            <span className="font-medium text-foreground/80">
                              {settings.providers.find(p => p.id === service.providerId)?.name || service.providerId}
                            </span>
                            <span>|</span>
                            <span>模型:</span>
                            <div onClick={e => e.stopPropagation()} className="inline-block">
                              <Select
                                value={service.modelId}
                                options={getModelOptions(service.providerId)}
                                onChange={val => {
                                  const nextServices = settings.services.map(s => {
                                    if (s.id === service.id && s.type === 'single') {
                                      return { ...s, modelId: val };
                                    }
                                    return s;
                                  });
                                  onSave({ ...settings, services: nextServices });
                                }}
                                compact
                                className="w-[180px]"
                              />
                            </div>
                            {service.fallbackEnabled && <span className="text-muted-foreground">(开启自动降级)</span>}
                          </div>
                        )
  ```

- [ ] **Step 3: Compile verification**
  Run: `bun compile`
  Expected: Success without compilation errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/entrypoints/popup/main.tsx src/components/options/services-settings.tsx
  git commit -m "feat(ui): dynamic model switcher inline popup and settings card list"
  ```
