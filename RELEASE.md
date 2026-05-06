# 发版

引用本文件即可直接发版。CI 工作流见 [`.github/workflows/release.yml`](.github/workflows/release.yml)。

## 0. 前提（必须全部通过）

```bash
git checkout main && git pull --ff-only
[ -z "$(git status --porcelain)" ] || { echo 'dirty workspace'; exit 1; }
```

## 1. 发版（把 `X.Y.Z` 替换为目标版本号）

```bash
V=X.Y.Z

node -e "const f=require('fs'),p=require('./package.json');p.version='$V';f.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
git add package.json
git commit -m "chore(release): v$V"
git tag -a "v$V" -m "Release v$V"
git push origin main --follow-tags
```

push tag 会自动触发 CI：构建 Chrome / Firefox zip → 生成分类 release notes
→ 创建 GitHub Release 并附 zip。

## 2. 验证（约 90s 后）

```bash
REPO=$(git remote get-url origin | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?#\1#')

sleep 90
curl -s "https://api.github.com/repos/$REPO/releases/tags/v$V" \
  | python3 -c "import sys,json;r=json.load(sys.stdin);print('url:',r.get('html_url'));print('assets:');[print(' -',a['name']) for a in r.get('assets',[])]"
```

期望输出：1 个 release URL + 3 个 zip（`*-chrome.zip`、`*-firefox.zip`、`*-sources.zip`）。

## 约束

- `X.Y.Z` 必须是合法 SemVer，**不要带 `v` 前缀**（脚本会自动加）。
- 预发布用 `0.1.2-rc.1` 这类含 `-` 后缀的版本号，CI 会自动标 pre-release。
- 已存在的版本号不可复用；发错了请 bump 一个新的 patch，不要改写历史。
- 禁止在 dirty 工作区或非 `main` 分支打 tag。
