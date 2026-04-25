# Ctrl+Hover 短按可触发 + 翻译期间高亮持续 0.25s

## 补丁内容

### 用户反馈

> 使用 ctrl + 鼠标悬浮翻译时，如果鼠标快速松掉，就不会翻译，只有按长一点时间才会翻译，另外我希望 ctrl 翻译未完成时，高亮不要消失，且高亮至少持续 0.25s，这样交互体验更好。

两个体验问题，根因都在 hover 状态机的清理路径过于「激进」。

### 根因

#### 问题 A：Ctrl 短按即松开不触发翻译

防抖阶段（按下 Ctrl 后 200ms 内）一旦触发 `keyup('Control')`：

```ts
document.addEventListener('keyup', (e) => {
  if (e.key !== 'Control') return;
  ctrlPressed = false;
  clearHoverHighlight();   // ← 这里把 hoverTimer 一起 clearTimeout 掉
});
```

而 `clearHoverHighlight()` 内部 `window.clearTimeout(hoverTimer)`，意味着：

| 时序 | 旧行为 |
| --- | --- |
| 0ms 按 Ctrl，鼠标已悬停在 P 上 | `keydown('Control')` → `tryStartHoverFor` → 计时 200ms |
| 80ms 松开 Ctrl | `keyup` → `clearHoverHighlight` → `clearTimeout(hoverTimer)` |
| 200ms | 计时器从未 fire，**翻译永远不会发生** |

用户必须按住 Ctrl 至少 200ms，才能让计时器 fire。这违背"轻点 Ctrl 即翻译"的肌肉记忆。

#### 问题 B：高亮在翻译进行中被中断 / 闪一下就消失

旧 `hoverTimer` 回调一进来就立刻 `removeAttribute(HOVER_HIGHLIGHT_ATTR)`：

```ts
hoverTimer = window.setTimeout(async () => {
  hoverTimer = null;
  // ...
  paragraph.removeAttribute(HOVER_HIGHLIGHT_ATTR);  // ← 翻译还没开始就清了高亮
  hoverTarget = null;
  await ensureCtrlHoverSettings();
  await translateSingleElement(paragraph, true);
}, HOVER_DEBOUNCE_MS);
```

200ms 一到立即去掉高亮，再异步发翻译请求。结果：

- 翻译期间页面无任何反馈（高亮已消失，又没有 loading），用户怀疑"是不是没生效"；
- 翻译瞬间命中缓存（< 50ms 完成）时，高亮存在时长 < 200ms，体验上是"一闪而过"。

#### 问题 A、B 的共因

`clearHoverHighlight` 把"防抖期清理"与"完整清理"耦合在同一个函数里，所有调用点（`mouseout` / `keyup` / `blur` / 路径切换）都会附带清掉计时器与 attribute。需要把两阶段拆开：

- **防抖阶段（hoverTimer != null）**：可被 `mouseout` / `blur` / 切段落取消，因为还没真正发起翻译；
- **翻译阶段（hoverTimer == null 但 hoverTarget != null）**：所有"取消"路径都要短路，让翻译跑完。

### 修复

#### 改造 `src/entrypoints/content/index.ts`

1. **新常量 `HOVER_MIN_VISIBLE_MS = 250`**：高亮命中段落到清除的最小总时长。

2. **`clearHoverHighlight` → `cancelHoverDebounce`（重命名 + 语义收窄）**：
   ```ts
   function cancelHoverDebounce(): void {
     if (hoverTimer === null) return;   // 翻译阶段直接短路
     // ...移除高亮 + clearTimeout
   }
   ```
   函数名直接表达"只在防抖阶段生效"，`if (hoverTimer === null) return` 是核心防护：翻译已 fire 后，所有调用点（`mouseout` / `blur` / `tryToggleRestore` 内的预清理）都不再误清。

3. **`hoverTimer` 回调改造为「保持高亮直到翻译完成 + 最小可见时长」**：
   ```ts
   const startedAt = performance.now();
   hoverTimer = window.setTimeout(async () => {
     hoverTimer = null;
     if (hoverTarget !== paragraph) return;
     if (state.elementMap.has(paragraph) || paragraph.hasAttribute('data-translator-pending')) {
       paragraph.removeAttribute(HOVER_HIGHLIGHT_ATTR);
       if (hoverTarget === paragraph) hoverTarget = null;
       return;
     }
     try {
       await ensureCtrlHoverSettings();
       await translateSingleElement(paragraph, true);
     } finally {
       const elapsed = performance.now() - startedAt;
       const wait = Math.max(0, HOVER_MIN_VISIBLE_MS - elapsed);
       if (wait > 0) {
         await new Promise<void>((resolve) => window.setTimeout(resolve, wait));
       }
       paragraph.removeAttribute(HOVER_HIGHLIGHT_ATTR);
       if (hoverTarget === paragraph) hoverTarget = null;
     }
   }, HOVER_DEBOUNCE_MS);
   ```
   - 进入翻译前**不再**预清 attribute；
   - 用 `try / finally` 保证翻译成功 / 异常 / 缓存命中三种路径都走相同清理；
   - `wait = HOVER_MIN_VISIBLE_MS - elapsed` 保证从「按 Ctrl 命中段落」到「清高亮」总耗时 ≥ 250ms。注意 `startedAt` 起点是 hover 命中时刻（包含 200ms 防抖），所以等价于「翻译至少展示 ~50ms」或「整体最少 250ms」，与用户表述一致；
   - `original` / `clean` 模式下 `applyTranslation` 已通过 `el.replaceWith(wrapper)` 让 paragraph 离开 DOM，attribute 随节点离开自然消失，finally 里的 `removeAttribute` 是幂等保险；`bilingual` / `underline` 模式 paragraph 仍在 DOM，必须主动清。

4. **`keyup('Control')` 仅复位 `ctrlPressed`，不再做任何清理**：让短按（200ms 内松开）也能让 200ms 防抖触发的翻译完成；翻译期间松键不会中断高亮。这与 patch-5 加入的"再按 Ctrl 恢复"toggle 语义协调——`keyup` 只负责"允许下一次 keydown 视为新按键"。

5. **`mouseout` / `window.blur` 改调 `cancelHoverDebounce`**：保留"防抖期内移开鼠标 / 切窗口取消翻译"的语义，但不会误中断已 fire 的翻译。

6. **`tryStartHoverFor` 切换段落分支不复用 `cancelHoverDebounce`**：注释强调原因——切到新段落时旧 paragraph 即使处于翻译阶段，也应让旧候选脱离 hover 状态机（清旧 attribute、把 hoverTarget 指向新段落），翻译完成的 finally 通过 `if (hoverTarget === paragraph) hoverTarget = null` 与 `removeAttribute` 幂等调用兼容这种"旧候选已被替换"场景。

### 验证

- `bun compile` 通过。
- 行为预期（覆盖矩阵）：

  | 场景 | 旧行为 | 新行为 |
  | --- | --- | --- |
  | 按 Ctrl + 悬停 P，80ms 松开 Ctrl，鼠标不动 | 不翻译 | 200ms 时翻译，高亮持续到完成 + ≥ 250ms 总时长 |
  | 按住 Ctrl 悬停 P 翻译中 ，半途松 Ctrl | 高亮立刻消失 | 高亮保持到翻译完成 |
  | 按住 Ctrl 悬停 P 翻译中，鼠标移开 P | 高亮立刻消失 | 高亮保持到翻译完成（mouseout 防抖期已过，cancel 短路） |
  | 按 Ctrl 悬停 P，50ms 内鼠标移开（防抖期内） | 取消翻译 | 取消翻译（不变，符合预期） |
  | 翻译命中缓存 50ms 完成 | 高亮 < 250ms | 高亮 ≥ 250ms（finally 等待补足） |
  | 翻译失败 / 抛错 | 高亮残留 | finally 也清理（与成功路径一致） |
  | original/clean 模式翻译完成 | paragraph 离开 DOM，attribute 跟随消失 | 同上 + finally `removeAttribute` 幂等保险 |

## 影响范围

- 修改文件: `src/entrypoints/content/index.ts`
