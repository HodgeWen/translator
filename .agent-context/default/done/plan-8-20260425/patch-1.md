# 手动目标语言覆盖 / Google 公共检测 / CJK 字符集兜底

## 补丁内容

plan-8 实施后用户测试反馈："输入中文翻译还是中文"。根因：`franc-min` 仅在文本 ≥ 10 字符时可靠，短中文输入会回退 `null`，`resolveTargetLang` fallback 到母语，导致目标语言==源语言，模型保持原样。本补丁三件事：

1. **字符集快速兜底**：`src/lib/lang-detect.ts` 新增 `detectByCharset(text)`，在 `detectWithFranc` 短文本分支与 `und` 分支都调用之；按字符占比识别日文（假名 ≥ 10%）/ 韩文（谚文 ≥ 30%）/ 中文（CJK 表意 ≥ 30%）。这样即使输入只有一两个汉字也能正确判定。
2. **内置 Google 公共检测**：`LangDetectProvider.type` 扩展 `'google_free'`，`detectWithGoogleFree` 通过 GET `translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=...`，从响应数组的 `[2]` 槽位读取检测语种。设置页"语言检测服务商"标题旁新增"添加 Google（免 key）"按钮，**已存在时禁用**，避免重复。Google 检测器卡片支持自定义 endpoint / timeout 与删除。
3. **popup 手动目标语言覆盖**：hint 行右侧新增紧凑 Select，选项为「自动 + LANGUAGE_OPTIONS」，默认 `auto`；选择具体语言后 `handleTranslate` 与防抖 `useEffect` 都跳过 `resolveTargetLang`，直接使用所选值。**仅 popup 组件 state，不持久化**，符合"本次会话生效"诉求；副标行根据状态切换文案。

附带提取共享语言列表到 `src/lib/languages.ts`，供 popup 与 options 复用，避免重复维护。

## 影响范围

- 新增文件: `src/lib/languages.ts`
- 修改文件: `src/types/index.ts`
- 修改文件: `src/lib/schema.ts`
- 修改文件: `src/lib/lang-detect.ts`
- 修改文件: `src/entrypoints/popup/main.tsx`
- 修改文件: `src/components/options/language-settings.tsx`
- 修改文件: `public/_locales/en/messages.json`
- 修改文件: `public/_locales/zh_CN/messages.json`
