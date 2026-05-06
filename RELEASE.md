# 发布流程

本仓库通过 [`.github/workflows/release.yml`](.github/workflows/release.yml) 自动化发版。
**任何代理（人类 / AI）执行发版前，请完整阅读本文档**，避免误操作产生无效 tag 或脏 commit。

## TL;DR

```bash
# 在 main 分支上完成所有功能 commit 后，
# 选择一种方式发布：

# 方式 A（推荐，最简）：本地打 tag 推送
git tag v<X.Y.Z>
git push origin v<X.Y.Z>

# 方式 B：在 GitHub Actions 页面手动触发
#   Actions → Release → Run workflow → 选 patch / minor / major
```

CI 会自动完成：构建 Chrome / Firefox zip → 生成分类 release notes →
创建 GitHub Release 并附 zip 资源。

---

## 设计概览

| 触发方式 | 谁来 bump 版本 | 谁来 commit/打 tag | 谁来构建 + 发布 |
|---|---|---|---|
| `push tag v*` | **本地手动**（也可省略，CI 会临时同步） | **本地手动** | CI |
| `workflow_dispatch` | CI（基于 `release_type`） | CI | CI |

两种方式共用同一 job，最终都会创建一个 GitHub Release，附带：

- `translator-extension-<version>-chrome.zip`
- `translator-extension-<version>-firefox.zip`
- `translator-extension-<version>-sources.zip`（Firefox AMO 审核用）

`manifest.version` 由 `wxt.config.ts` 从 `package.json#version` 读取，
**只需维护 `package.json` 一处版本号**。

---

## 前提条件

发版前请确认：

1. 当前在 `main` 分支，且工作区干净（`git status` 无变更）。
2. 本地已 `git pull --ff-only` 与远程同步。
3. 所有要进入本次 release 的 commit 已经合并到 `main`。
4. 决定使用的版本号符合 [SemVer](https://semver.org/lang/zh-CN/)：
   - `patch`（修补、文档、性能）→ `0.1.0` → `0.1.1`
   - `minor`（向后兼容的新功能）→ `0.1.1` → `0.2.0`
   - `major`（不向后兼容的变更）→ `0.9.x` → `1.0.0`
   - 预发布 → `1.0.0-rc.1`、`1.0.0-beta.2`（含 `-` 后缀的 tag 会自动标为 pre-release）

> 错误示例：`0.2`、`v1.2.3.4`、`1.2.3-` 均会被工作流拒绝。

---

## 方式 A：推送 tag 触发（推荐）

适用场景：你已经在本地把要发布的内容合并进 `main` 并且 `package.json#version`
已是目标版本（或者你不在乎本地是否同步）。

### 标准步骤

```bash
# 0. 确认在 main 且工作区干净
git checkout main && git pull --ff-only && git status

# 1. 同步 package.json 版本号到目标版本（推荐显式做，便于历史追溯）
#    例如发布 0.1.2:
node -e "
  const fs=require('fs'),p=require('./package.json');
  p.version='0.1.2';
  fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n');
"
git add package.json
git commit -m 'chore(release): v0.1.2'

# 2. 打带签注的 tag
git tag -a v0.1.2 -m 'Release v0.1.2'

# 3. 同时推送 commit 和 tag
git push origin main --follow-tags
```

> 也可以省略步骤 1：若只 `git tag v0.1.2 && git push origin v0.1.2`，
> CI 会在构建时**临时**把 `package.json#version` 同步到 `0.1.2`（不 commit）。
> 这种做法 zip 产物文件名仍正确，但仓库内 `package.json` 与 tag 不一致，
> 不建议长期使用。

### tag 命名规则

- 必须以 `v` 开头：`v1.2.3` ✅、`1.2.3` ❌
- 必须是合法 SemVer：`v1.2.3-rc.1` ✅、`v1.2` ❌
- 含 `-` 后缀的 tag 会被自动标记为 pre-release。

---

## 方式 B：Actions 页面手动触发

适用场景：你想让 CI 全程托管 bump、commit、打 tag、push。

1. 打开 GitHub → 仓库 → **Actions** → 左侧选 **Release** → 右上 **Run workflow**。
2. 填写参数：

   | 字段 | 含义 | 默认 |
   |---|---|---|
   | `release_type` | `patch` / `minor` / `major` | `patch` |
   | `custom_version` | 自定义版本号（如 `1.2.3`，**不带 v 前缀**）。填写后会**忽略** `release_type` | 空 |
   | `prerelease` | 勾选则发布为 pre-release | `false` |
   | `dry_run` | 勾选则**仅构建并预览 release notes，不打 tag、不发布** | `false` |

3. 点 **Run workflow**。CI 会：
   - 计算下一版本号（如 `patch` 表示 `0.1.1` → `0.1.2`）。
   - bump `package.json#version`，commit 一次 `chore(release): vX.Y.Z`。
   - 打 tag、push commit + tag 到 `main`。
   - 构建 zip + 生成 notes + 创建 Release。

### 首次发版前请用 dry-run 试跑

```
release_type: patch
dry_run:      ✅
```

CI 会构建 zip、生成 notes，并把它们作为 workflow artifact 上传（30 天保留），
但**不会**创建 tag、不会改 main、不会发 Release。可以在 job summary 里直接看
notes 预览，确认无误后再正式跑一次（不勾 dry_run）。

---

## release notes 自动生成规则

工作流根据 commit message 前缀分组生成 notes，**强烈建议遵循
[Conventional Commits](https://www.conventionalcommits.org/zh-hans/)**：

| commit 前缀 | 归类章节 |
|---|---|
| `feat:` / `feat(scope):` | Features |
| `fix:` | Bug Fixes |
| `perf:` | Performance |
| `refactor:` | Refactors |
| `docs:` | Docs |
| `chore:` / `build:` / `ci:` / `style:` / `test:` / `revert:` | Chore / CI |
| 其他不符合约定的 | Other |

每行格式：`- <commit subject> (<short hash>)`。

commit 范围：上一个 `v*` tag 到本次 tag/HEAD。**首次发版**没有上一个 tag，
会列出仓库全部历史，这是预期行为，从第二次发版开始 notes 自然清爽。

notes 末尾自动追加：

- 「下载」段：明确列出 chrome / firefox / sources 三个 zip 包名。
- 「Full changelog」对比链接（指向 `<prev_tag>...<new_tag>` 的 GitHub compare 页面）。

---

## 产物与下载

CI 创建的 GitHub Release 会附三份 zip：

| 文件 | 用途 |
|---|---|
| `translator-extension-<v>-chrome.zip` | Chrome / Edge / Brave 等 Chromium 浏览器商店上传或开发者模式安装 |
| `translator-extension-<v>-firefox.zip` | Firefox 商店（AMO）上传或开发者模式安装 |
| `translator-extension-<v>-sources.zip` | Firefox AMO 审核要求的源码包，普通用户不需要 |

同时会作为 workflow artifact 保留 30 天（含 `RELEASE_NOTES.md`），便于回查。

---

## 故障排查

### `tag v0.1.2 已存在`
本地或远程已存在同名 tag。要么换版本号；要么先删除：

```bash
git tag -d v0.1.2                     # 删本地
git push origin :refs/tags/v0.1.2     # 删远程（同时会让对应 Release 变成 draft）
```

### `custom_version 不是合法 semver`
版本号必须满足正则 `^[0-9]+\.[0-9]+\.[0-9]+([-.+][0-9A-Za-z.-]+)?$`。
**不要带 `v` 前缀**，正确：`1.2.3`、`1.2.3-rc.1`、`1.2.3+build.5`。

### `tag <X> 不符合 v<semver> 格式`
push tag 模式下，tag 必须以 `v` 开头且后接合法 SemVer。重命名 tag 后重新 push。

### Release 创建失败 / `permission denied`
检查仓库 Settings → Actions → General → Workflow permissions：
确保 `Read and write permissions` 开启（workflow 需要 `contents: write` 权限）。
如果 `main` 启用了分支保护，需要给 `github-actions[bot]` 放行直接 push。

### 构建产物缺失
查看 workflow 日志中 `Build Chrome zip` / `Build Firefox zip` 步骤。
常见原因：依赖安装失败、`wxt.config.ts` 出错。本地用 `bun zip && bun zip:firefox`
复现即可。

---

## 取消 / 回滚一次发布

如果发布后发现严重问题：

```bash
# 1. 删除 GitHub Release（在 Releases 页面手动 Delete，或用 API）
# 2. 删除远程 tag
git push origin :refs/tags/v0.1.2
# 3. 删除本地 tag
git tag -d v0.1.2
# 4. 如有必要，revert 那次 chore(release) commit
git revert <commit-sha>
git push origin main
```

之后发新的修复版本（建议直接 bump `patch`，例如 `0.1.2` → `0.1.3`），
**不要复用同一个版本号**——商店与缓存可能已经记录了旧 zip 的哈希。

---

## 给 AI 代理的执行清单

如果你是 AI 代理被要求"发布版本"，请按以下顺序执行：

1. **确认意图**：明确要发布的版本号或 bump 类型（patch/minor/major）。
2. **检查前提**：`git status` 工作区干净；`git rev-parse --abbrev-ref HEAD` 在 main；
   `git pull --ff-only` 与远程同步。
3. **核对版本**：`node -p "require('./package.json').version"` 读当前版本，
   与目标版本对比，确认 bump 方向合理。
4. **优选方式 A**（推送 tag）：编辑 `package.json#version` → commit `chore(release): vX.Y.Z`
   → `git tag -a vX.Y.Z -m 'Release vX.Y.Z'` → `git push origin main --follow-tags`。
5. **轮询验证**：通过 GitHub REST API（公开仓库无需 token）查询：
   ```bash
   curl -s "https://api.github.com/repos/<owner>/<repo>/actions/workflows" \
     | jq '.workflows[] | select(.name=="Release") | .id'
   curl -s "https://api.github.com/repos/<owner>/<repo>/actions/workflows/<id>/runs?per_page=3"
   curl -s "https://api.github.com/repos/<owner>/<repo>/releases/tags/vX.Y.Z"
   ```
   确认 workflow `conclusion=success` 且 release `assets` 有 3 个 zip。
6. **报告结果**：返回 Release URL、workflow run URL、三个 zip 的下载链接。

**禁止行为**：

- 禁止在 dirty 工作区直接打 tag（污染版本对应的代码快照）。
- 禁止跳过 commit 直接打 tag（会让 `package.json#version` 与 tag 不一致）。
- 禁止复用已存在的版本号或对已发布版本做强制覆盖。
- 禁止不与用户确认就直接发 major 版本。
