# 隐私防护 / 阈值收紧 / 文案告知

## 补丁内容

针对 review 阶段提出的 3 个中等问题：

### M1 隐私：popup 预览阶段不再发起远端检测

之前 `popup/main.tsx` 防抖 `useEffect` 直接调用 `detectLanguage`，意味着用户每停顿 200ms 输入都可能把内容发送到用户配置的远端检测器（含 `google_free`）。这与"输入即译"的体验诉求矛盾，且未事先告知用户。

修改方式：
- `src/lib/lang-detect.ts` 新增导出函数 `detectLanguageLocal(text)`，**只走 franc-min + CJK 字符集兜底，不读 settings、不发任何请求**。
- `src/entrypoints/popup/main.tsx`：`resolveTargetLang` 增加 `options: { localOnly?: boolean }` 参数；防抖预览路径传 `localOnly: true`；`handleTranslate` 保持原行为（用户主动点翻译时才走完整链路，包含远端备用）。

副作用：当文本本地无法识别（非 CJK 且 < 10 字符），预览阶段会回退到母语；用户点击翻译按钮时若已配置远端检测器，仍能识别——按需付出隐私代价。

### M2 文案：明确告知 Google 公共端点会上送内容

i18n 键 `hint_google_free_detector` 增强：增加"查询文本会发送至 Google 服务器，请避免输入敏感内容"的明示告警，方便用户在添加该检测器时即获得知情同意。

### M3 阈值：日文 kana 占比 0.1 → 0.25

`detectByCharset` 中假名占比阈值从 0.1 提升到 0.25。理由：日文文本的假名密度通常 30-60%，0.1 太宽容，会把"中文夹少量日文片段"误判为日文。0.25 是更稳健的中间值。同时为三条阈值补充注释说明取值依据。

## 影响范围

- 修改文件: `src/lib/lang-detect.ts`
- 修改文件: `src/entrypoints/popup/main.tsx`
- 修改文件: `public/_locales/en/messages.json`
- 修改文件: `public/_locales/zh_CN/messages.json`
