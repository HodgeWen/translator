# 优化消息提示与组件抽象

> 状态: 已执行

## 目标

将 popup 和 options 页面中的内联消息提示改为脱离文档流的 Toast 通知，避免消息出现时破坏页面布局。同时对两个页面进行组件抽象拆分，降低单文件行数，提升可维护性。

## 内容

1. 创建 `src/hooks/use-toast.ts`：提供 `useToast` hook，管理 Toast 队列（添加、自动移除、当前消息）。
2. 创建 `src/components/ui/toast.tsx`：`Toast` 组件，fixed 定位（top-4 right-4），z-50，不占用文档流；支持 success / error 变体，带进入/退出动画；自动 3s 消失。
3. 重构 `popup/main.tsx`：
   a. 使用 `useToast` + `Toast` 替换现有的内联 error 状态（`error`、`showErrorDetail`、`errorTimerRef` 等）以及 copied 提示。
   b. 将 Provider Pills 抽象为 `PopupProviderSelector` 组件。
   c. 将 Model Selector 抽象为 `PopupModelSelector` 组件。
   d. 将 Translation Result 区域抽象为 `PopupTranslationResult` 组件。
   e. 将 History List 抽象为 `PopupHistoryList` 组件。
   f. 保留 `sendMessage` helper 及核心 `App` 逻辑，单文件控制在合理行数。
4. 重构 `options/main.tsx`：
   a. 使用 `useToast` + `Toast` 替换现有的内联 `saved` / `error` 状态。
   b. 将 Providers Tab（列表 + 编辑表单）抽象为 `OptionsProviderSettings` 组件。
   c. 将 Model Queue Tab 抽象为 `OptionsModelQueue` 组件。
   d. 将 Language Tab 抽象为 `OptionsLanguageSettings` 组件。
   e. 将 General Tab 抽象为 `OptionsGeneralSettings` 组件。
   f. 保留 `KeyValueList`、tabs 导航及核心 `App` 状态管理，单文件控制在合理行数。
5. 验证 TypeScript 编译通过（`bun compile`）。

## 影响范围

- 新建：`src/hooks/use-toast.ts`
- 新建：`src/components/ui/toast.tsx`
- 新建：`src/components/popup/provider-selector.tsx`
- 新建：`src/components/popup/model-selector.tsx`
- 新建：`src/components/popup/translation-result.tsx`
- 新建：`src/components/popup/history-list.tsx`
- 新建：`src/components/options/key-value-list.tsx`
- 新建：`src/components/options/provider-settings.tsx`
- 新建：`src/components/options/model-queue.tsx`
- 新建：`src/components/options/language-settings.tsx`
- 新建：`src/components/options/general-settings.tsx`
- 修改：`src/entrypoints/popup/main.tsx`
- 修改：`src/entrypoints/options/main.tsx`
- 修改：`public/_locales/en/messages.json`
- 修改：`public/_locales/zh_CN/messages.json`

## 历史补丁
