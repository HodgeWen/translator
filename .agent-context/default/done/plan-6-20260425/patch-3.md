# Ctrl+Hover 翻译"先悬停后按键"姿势失效

## 补丁内容

### 用户反馈

> 我按 ctrl + 鼠标悬浮没用啊

### 根因

`src/entrypoints/content/index.ts` 中 `setupCtrlHover` 仅在 `mouseover` 事件上同步检查 `e.ctrlKey`：

```ts
document.addEventListener('mouseover', (e) => {
  if (!e.ctrlKey) return;
  // ...
});
```

`mouseover` 仅在**鼠标进入新元素时**触发。这意味着两种使用姿势中只有一种工作：

| 姿势 | 行为 |
| --- | --- |
| 先按 Ctrl，再移动到段落 | ✅ `mouseover` 触发时 `ctrlKey=true`，正常进入判定 |
| **先悬停在段落上，再按下 Ctrl** | ❌ `mouseover` 早已派发完毕，按键不会重发该事件 |

而后者恰恰是最自然的阅读姿势：用户读到一段不懂的内容，决定按 Ctrl 翻译。patch-2 漏掉了这条路径，导致用户主观感受"按 Ctrl + 悬浮没用"。

### 修复

抽取 `tryStartHoverFor(target)` 把原 `mouseover` 内的判定与计时逻辑收成纯函数，让两条触发路径共用：

1. **mousemove（passive）**：模块级 `lastMouseX/lastMouseY` 跟踪最近鼠标坐标。`passive: true` 不阻断滚动；处理函数仅做两次赋值，无判定开销。
2. **mouseover**（已有）：`ctrlKey` 命中时调用 `tryStartHoverFor(e.target)`，覆盖"先按键再悬停"的姿势。
3. **keydown('Control')**（新增）：通过 `document.elementFromPoint(lastMouseX, lastMouseY)` 反查当前鼠标下元素，调用 `tryStartHoverFor(el)`，覆盖"先悬停再按键"的姿势。`lastMouseX < 0` 时（用户尚未移动过鼠标）直接 return，避免在屏幕左上角误命中。

`mouseout`、`keyup('Control')`、`window.blur` 三条清理路径不变，仍由原代码兜底。

`bun compile` 通过；无新增 i18n key、无样式改动。

## 影响范围

- 修改文件: `src/entrypoints/content/index.ts`
