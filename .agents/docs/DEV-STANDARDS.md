# 开发规范

## 命名

- React 组件文件与组件名 `PascalCase`；函数/变量 `camelCase`；类型/接口 `PascalCase`
- 测试文件放 `tests/<name>.test.ts`

## 目录与代码结构

- 所有源码在 `src/`（WXT `srcDir`），入口按 `src/entrypoints/{background,content,popup,options}` 切分，UI 分区组件对应放 `src/components/{ui,options,popup}`
- 核心逻辑在 `src/lib/`（api、cache、storage、schema、i18n 等），跨入口共享
- 路径别名：`@/*` → `src/*`；`@/components/*`、`@/lib/*`、`@/hooks/*`、`@/types/*`

## 代码风格

- 格式化用 oxfmt（`.oxfmtrc.json`），不要手工对格式另立约定
- TypeScript `strict`，`noUnusedLocals` / `noUnusedParameters` 为 `true`，未使用变量会报错
- 注释用中文，保持现有文件风格
- Tailwind 类名合并一律用 `cn(...)`（clsx + tailwind-merge）
- 颜色通过 `@theme` 自定义变量定义（如 `--color-primary`），暗色模式由 `.dark` 类切换

## 测试

- 单测在 `tests/`，用 `bun:test`
- 局部验证：`bun test tests/<file>`（相关用例）+ `bun compile`（tsc 类型检查）
- 全量：`bun compile && bun test`。默认只在 CI / 收口阶段跑

## 数据与存储

- 配置读写走 `src/lib/storage.ts`，结构以 `src/lib/schema.ts` 的 Zod schema 为准；改配置结构必须同步 schema
- IndexedDB 表结构集中在 `src/lib/cache.ts`；翻译缓存键为 `(textHash, targetLang, promptSalt)`

## 版本与发布

- 版本号只改 `package.json#version`（manifest.version 自动跟随）；发版流程见根目录 `RELEASE.md`：`bun scripts/release.mjs X.Y.Z` → `bun scripts/verify-release.mjs X.Y.Z`

## 明确禁止

- cooking `spec.md` 缺少可被 `spec-files.mjs parse` 通过的「影响文件」章节
- 裸字符串拼接 Tailwind 类名（必须用 `cn(...)`）
- 无 ESLint 配置，不要自行引入新的 lint 规则或格式化约定
