# Ctrl 切换恢复 + 译文占据原文 DOM 槽位修复样式偏差

## 补丁内容

### 用户反馈

> 再按 ctrl 时，不会恢复原文，而且最尴尬的是，译文和原文的样式不一样，主要是由于一些类似 `:not(:first-child)` 的选择器写法，导致样式具有偏差，所以我认为还是在一个专门的地方存储所有原文内容（元素），译文直接原封不动地替换位置，再按 `ctrl` 从这个地方还原回去。

两个问题串在一起，根因相互关联。

### 根因

#### 问题 1：再按 Ctrl 不恢复原文

`setupCtrlHover` 中 `keydown('Control')` 仅调用 `tryStartHoverFor`，没有任何 toggle / 恢复路径；`keyup('Control')` 也只清 hover 高亮（`clearHoverHighlight`），从未触达 `restoreElement`。换句话说：「按 Ctrl 翻译」是单向的，没有反向通道。

#### 问题 2：译文与原文样式不一致

旧 `applyOriginalStyle` / `applyCleanStyle` 实现：

```ts
el.setAttribute('data-translator-hidden', 'true');  // display:none，仍占 DOM 槽位
el.after(wrapper);                                   // wrapper 是原 el 后一个兄弟
```

CSS `display:none` 不影响 DOM 节点位置——原 `el` 仍是其父元素的子节点。结果：

| 原文 `el` | 译文 `wrapper` |
| --- | --- |
| `:nth-child(N)` | `:nth-child(N+1)` |
| 命中 `:first-child` | 不命中 |
| 不命中 `:not(:first-child)` | 命中 |
| 相邻兄弟 `+ p`、通用兄弟 `~ p` | 命中规则反向 |

站点的"首段无 margin-top"、"奇偶段交替底色"、"列表项首项无分隔线"等约定全部失效，译文呈现错位。

### 修复

按用户建议的方向「专门存储原文元素 + 译文占原位」实施，但**不引入额外 DOM 容器**——直接利用 `el.replaceWith(wrapper)` 让译文 wrapper 接管原 `el` 的 DOM 槽位，原 `el` 节点离开 DOM 树仅由 `state.elementMap` 持有引用作为存储；恢复时反向 `wrapper.replaceWith(el)`。这样译文与原文在 DOM 中是「位置等价」的两个节点，所有兄弟/位置类选择器对二者命中一致。

#### 改造点（`src/entrypoints/content/index.ts`）

1. **`wrapperToOriginal: WeakMap<HTMLElement, HTMLElement>`**：模块级 wrapper → 原 el 反查表。`WeakMap` 让 wrapper 被 GC 回收时映射自动失效，无需手动清理边界。

2. **`applyOriginalStyle` / `applyCleanStyle`**：
   - 删除 `el.setAttribute('data-translator-hidden', 'true')` 与 `el.after(wrapper)`；
   - 改为 `wrapperToOriginal.set(wrapper, el); el.replaceWith(wrapper);`；
   - `state.elementMap.set(el, ...)` 保留——`el` 节点对象引用即「专门的存储」，不会被 GC（被 elementMap 强引用）。

3. **`restoreElement` 的 `original` / `clean` 分支**：
   - 删除 `el.removeAttribute('data-translator-hidden')`；
   - 改为 `wrapper.replaceWith(el); wrapperToOriginal.delete(wrapper);` 把原 `el` 节点放回它当年的 DOM 槽位。

4. **新增 `findToggleTarget(target)` / `tryToggleRestore(target)`**：沿祖先链寻找已翻译的「逻辑段落 el」，统一两种命中形态：
   - `original` / `clean`：鼠标命中带 `[data-translator-clone]` 的 wrapper → `wrapperToOriginal` 反查回原 `el`；
   - `bilingual` / `underline`：原 `el` 仍在 DOM，命中其自身或其内部注入的 span/br 子节点 → 沿祖先链命中 `state.elementMap.has(cur)` 的元素。
   - 命中后同步 `restoreElement(toggleEl)`，并先 `clearHoverHighlight()` 防止残留 `[data-translator-hover-target]` 样式。

5. **`keydown('Control')` 增加 toggle 入口 + auto-repeat 防护**：
   - 模块级 `ctrlPressed: boolean`；按住期间 `keydown` 会以 ~33Hz 重复触发，新增 `if (ctrlPressed || e.repeat) return` 屏蔽，确保「松开后再次按下」才视作一次新按键，避免按住 Ctrl 不动持续 toggle。
   - 命中已翻译目标时优先 `tryToggleRestore(el)`，命中即 return；未命中再 `tryStartHoverFor(el)` 走原翻译路径。

6. **`keyup('Control')` / `window.blur`**：复位 `ctrlPressed = false` 后再 `clearHoverHighlight()`，对称地维护按键状态机。

#### 配套（`src/entrypoints/content/styles.css`）

- 文件头部 DOM 契约注释更新为「`replaceWith` 占位 + elementMap 存储 + `replaceWith` 还原」三段式说明，与代码一致。
- 删除「隐藏原元素」段落与 `[data-translator-hidden]` 规则——新流程下原 `el` 永远不再出现在 DOM 中（脱离 DOM 的节点不需要 CSS 隐藏），保留该规则会鼓励错误用法。

### 验证

- `bun compile` 通过（`strict` + `noUnusedLocals`）。
- 行为预期：
  - **样式**：在 Reddit / GitHub 等大量使用 `:first-child` / `:not(:first-child)` 站点上，译文段落与原文段落在父元素中的 `nth-child` 索引相同 → 站点的"首段无 margin-top"等规则对译文同样命中，视觉与原文一致。
  - **Ctrl toggle**：按 Ctrl + 悬停未翻译段落 → 200ms 后翻译；松开 Ctrl 再次按下、悬停同一段落（此时是 wrapper / 已注入的 bilingual 段落）→ 同步恢复原文；按住 Ctrl 不放不会触发反复 toggle（`ctrlPressed` 屏蔽 auto-repeat）。
  - **bilingual / underline**：DOM 上原 `el` 仍存在，`findToggleTarget` 沿祖先链命中 `elementMap` key，恢复路径走 `restoreElement` 内既有 `el.innerHTML = elState.originalHTML` 分支，行为不变。

## 影响范围

- 修改文件: `src/entrypoints/content/index.ts`
- 修改文件: `src/entrypoints/content/styles.css`
