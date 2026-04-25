# 快捷键展示组件清洁度优化

## 补丁内容

review 提出三条改进建议，本补丁一次性吸收：

1. **`isMac` 提到模块级常量 `IS_MAC`**：原实现用 `useMemo([])`，与已存在的模块级 `MAC_SYMBOL_MAP` 风格不一致；提到模块级后省去一次 hook 调用，平台判定结果在整个组件实例间共享。增加 `typeof navigator !== 'undefined'` 守卫便于未来 SSR 场景。
2. **`useEffect` 依赖收敛为 `[]`**：`chrome.commands.getAll()` 的结果只取决于浏览器 `chrome://extensions/shortcuts` 配置，与 `settings.shortcutKey` 无关；同时 fallback 路径改为"读取失败时保留 useState 初值"，不再依赖 closure 中的 `settings.shortcutKey`，从而消除 stale closure 风险。语义更接近"挂载时读取一次实际生效快捷键"。
3. **删除冗余的 `Control` 映射**：Chrome `chrome.commands.getAll()` 返回的修饰符串约定使用 `Ctrl` 而非 `Control`，`Control` 这条映射永远命中不到，属于误导性死代码。

`bun compile` 通过；UI 行为与补丁前完全一致。

## 影响范围

- 修改文件: `src/components/options/general-settings.tsx`
