# Translator Extension Tweaks & Enhancements Design Spec

This document details the minor adjustments and enhancements to the translator extension, specifically fixing select clipping in settings, enabling model switching in real-time, utilizing standard number inputs for pool weights, and refining the translation prompt preset logic.

---

## 1. Goal Description

Implement four distinct user-experience and logical improvements:
- **UI Overflow Fix**: Fix dropdown clipping inside the advanced settings container on the Options tab.
- **On-the-fly Model Switch**: Enable quick, convenient model switching for `Single` provider translation services, both in the Popup interface and directly on Options service cards.
- **Number Input component for Pools**: Integrate the existing customized `@/components/ui/number-input.tsx` for pool provider weight configuration.
- **Dynamic Pool Weight & Percentage Calculation**: Remove maximum cap for pool weights. Calculate the exact traffic distribution mathematically (weight / total weight) and display percentage inline in real-time.
- **Prompt Preset & Format Consolidation**: Merge service-specific prompts dynamically with the robust `globalPrompt` to preserve tags and formatting directives, and clean up duplicate/redundant presets.

---

## 2. Detailed Technical Design

### A. Fix Options Panel Overflow (UI Clip)
- **Problem**: The collapsible container in `services-settings.tsx` for "服务高级配置" (Service Advanced Settings) has `overflow-hidden` applied:
  `<div className="border border-border rounded-md overflow-hidden bg-background">`
- **Solution**: Remove `overflow-hidden` so that absolute-positioned absolute dropdown menus (Select) can correctly render beyond the bounds of the collapsed container. Because this section uses conditional React rendering (`{advancedOpen && ...}`) instead of height transition animations, `overflow-hidden` is technically redundant.

### B. Dynamic Model Switching
1. **In Popup (`src/entrypoints/popup/main.tsx`)**:
   - If the currently active translation service (`activeServiceId`) is a `single` type:
     - Render a new row titled "翻译模型:" right below the active service selector.
     - Include a custom status badge or indicator dot and a `Select` component displaying models under `activeService.providerId`.
     - When changed, updates `activeService.modelId` in the local state copy of settings and persists it to chrome storage via `saveSettings(newSettings)`.
2. **In Options (`src/components/options/services-settings.tsx`)**:
   - Locate the service card renderer.
   - For `SingleService` cards, transform the static `模型: {service.modelId}` display into a compact `Select` dropdown displaying all models available for `service.providerId`.
   - Prevent select clicks from selecting the service card by wrapping the Select element in an `onClick={e => e.stopPropagation()}` container.
   - Trigger `onSave` upon changes to instantly persist model changes.

### C. Pool Weight and Percentage Display
- **Component Replacement**:
  In `services-settings.tsx`, replace the native numeric `<input type="number" />` with `NumberInput` imported from `@/components/ui/number-input.tsx`.
- **Properties**:
  - `min = 1`
  - No `max` property (unlimited upper bounds)
  - `size = "sm"`
- **Calculations**:
  - `TotalWeight = sum(poolProviders.weight)`
  - `Percentage = (item.weight / TotalWeight) * 100` formatted with `.toFixed(1)`
- **UI Presentation**:
  - Enhance the column layout of pool items. Use a slightly larger width container for weights (`w-32`).
  - Render the calculated percentage (`{percentage}%`) right above each weight input box label in a high-contrast mono font.

### D. Smart Prompt Merge & Preset Cleanup
- **API Prompt Construction (`src/lib/api.ts`)**:
  - Update how `basePrompt` is resolved:
    ```typescript
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
- **Bilingual Preset Removal**:
  - Remove `{ id: 'bilingual', name: '双语对照排版', ... }` from `SYSTEM_PRESETS` in:
    1. `src/components/options/services-settings.tsx`
    2. `src/components/options/presets-tones-settings.tsx`

---

## 3. Verification Plan

- **Manual UI Review**:
  - Verify that the Service Advanced Configuration collapsible dropdown displays options completely without clipping.
  - Verify that the Popup correctly displays the model selector row when a `Single` service is selected, and disappears when a `Pool` service is active.
  - Verify that selecting a different model in the Popup persists and updates the Options page card, and vice versa.
  - Verify that Pool Weights use the interactive +/- buttons and dynamically update percentage labels.
  - Test custom service prompts with/without templates, ensuring translation does not break HTML structure.
