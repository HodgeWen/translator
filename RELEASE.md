# 发版

引用本文件后直接执行下面命令。CI：[`.github/workflows/release.yml`](.github/workflows/release.yml)。

## 一键发版

```bash
git checkout main && git pull --ff-only
bun scripts/release.mjs X.Y.Z    # 替换版本号，不要带 v
```

逻辑：`release.mjs`（ESM，`bun` 运行）会先 `pull`；若有未提交改动则 `git add -A`
并用**中文约定式**自动生成一条 `feat`/`docs`/`ci`/`chore` 类消息再提交；然后 bump
`package.json#version`、`chore(release): v*`、打 tag、`git push origin main --follow-tags`，触发 CI。

## 等 Release 建好（约 24×5s）

```bash
bun scripts/verify-release.mjs X.Y.Z
```

## 备选

```bash
bun run release -- X.Y.Z
bun run release:verify -- X.Y.Z
```

## 规矩

- 版本号为 SemVer，`X.Y.Z` 不带 `v`。
- 预发布：`0.2.0-rc.1` 等含 `-` 即可，CI 会标 pre-release。
- `main`、tag 不能与已有版本冲突。
