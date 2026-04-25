# 清理 block-detect 中 data-translator-hidden 死分支

## 补丁内容

### 背景

patch-5 已彻底移除 `[data-translator-hidden]` 的所有写入点（`applyOriginalStyle` / `applyCleanStyle` 改为 `el.replaceWith(wrapper)`）和对应 CSS 规则。但 `src/lib/block-detect.ts` 的 `hasExcludedAncestor` 仍保留对该属性的祖先检查：

```ts
if (cur.hasAttribute?.('data-translator-processed')) return true;
if (cur.hasAttribute?.('data-translator-clone')) return true;
if (cur.hasAttribute?.('data-translator-hidden')) return true;  // ← 死分支
```

新 DOM 契约下，`original` / `clean` 模式的原 `el` 节点离开 DOM、不会再有任何元素带这个属性，该检查永远不会命中——属于 patch-5 应一并清理而漏掉的清洁度问题。本补丁顺手清掉，让 block-detect 的祖先排除规则与新 DOM 契约保持一致，避免后续误读为「这里仍有需要兼容的旧形态」。

### 修复

`src/lib/block-detect.ts` `hasExcludedAncestor` 内移除 `data-translator-hidden` 检查（1 行）。

### 验证

- `bun compile` 通过；lint 无新增告警。
- 行为零变化（删除的是死分支）。

## 影响范围

- 修改文件: `src/lib/block-detect.ts`
