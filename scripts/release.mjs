#!/usr/bin/env bun
/**
 * 发版脚本（ESM，Bun 运行）
 * 用法: bun scripts/release.mjs <X.Y.Z>
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const semverRe = /^\d+\.\d+\.\d+([-.+][0-9A-Za-z.-]+)?$/;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function git(args, inherit = false) {
  execFileSync('git', args, {
    cwd: root,
    stdio: inherit ? 'inherit' : ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
}

function gitOut(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
  }).trim();
}

function gitTryOut(args) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
}

function pickCommitMessage(files) {
  const has = (re) => files.some((f) => re.test(f));
  if (files.length > 0 && files.every((f) => f.endsWith('.md'))) {
    return 'docs: 更新 Markdown 文档';
  }
  if (
    files.length > 0 &&
    files.every((f) => /^(package\.json|bun\.lock)$/.test(f))
  ) {
    return 'chore(deps): 更新依赖或锁文件';
  }

  const tags = [];
  if (has(/^\.github\//)) tags.push('CI');
  if (files.some((f) => f === 'wxt.config.ts')) tags.push('WXT 配置');
  if (has(/^public\/_locales\//)) tags.push('多语言资源');
  if (has(/^src\//)) tags.push('扩展源码');
  if (has(/^scripts\//)) tags.push('脚本工具');
  if (tags.length) return `chore: 同步本地变更（${tags.join('、')}）`;
  return 'chore: 同步工作区未提交变更';
}

function assertMain() {
  const b = gitOut(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (b !== 'main') {
    console.error(`当前分支为 ${b}，请在 main 上发版`);
    process.exit(1);
  }
}

function assertCleanForRelease(version) {
  const tag = `v${version}`;
  try {
    gitOut(['rev-parse', '--verify', `refs/tags/${tag}`]);
    console.error(`本地已存在 tag ${tag}`);
    process.exit(1);
  } catch {
    // ok
  }
  const remote = gitTryOut(['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]);
  if (remote) {
    console.error(`远程已存在 tag ${tag}`);
    process.exit(1);
  }
}

const version = process.argv[2];
if (!version || !semverRe.test(version)) {
  console.error('用法: bun scripts/release.mjs <X.Y.Z>');
  process.exit(1);
}

assertMain();
assertCleanForRelease(version);

console.log('→ git pull --ff-only');
git(['pull', '--ff-only'], true);

const dirty = gitOut(['status', '--porcelain']);
if (dirty) {
  // 安全闸门：发版只允许带上 package.json / bun.lock 这类版本相关变更。
  // 此前用 `git add -A` 会把工作区任意改动（含调试代码、临时文件）一并提交并发布。
  // 解析 `git status --porcelain`：格式是 "XY <path>" 或重命名时的 "XY <old> -> <new>"。
  // 注意三点：
  // 1) 只允许「修改」类状态（M / A 等），删除（D）或冲突（U）不能过白名单 ——
  //    否则 `D  package.json` 会被当成合法变更提交，随后读 package.json 直接崩。
  // 2) 路径可能带引号并含空格，不能简单 `.* -> ` 截断（会切坏路径）。
  // 3) 重命名取新路径（后段）作为实际落盘文件。
  const dirtyFiles = dirty
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2);
      let rest = line.slice(3);
      // git 对含特殊字符的路径加引号，去掉外层引号
      if (rest.startsWith('"') && rest.endsWith('"')) rest = rest.slice(1, -1);
      // 重命名/复制：取箭头后的新路径
      const arrow = rest.indexOf(' -> ');
      if (arrow !== -1) rest = rest.slice(arrow + 4);
      return { status, path: rest };
    });

  const ALLOWED = /^(package\.json|bun\.lock)$/;
  const ALLOWED_STATUS = /^[MARCT]$/;
  const unexpected = dirtyFiles.filter(({ status, path }) => {
    // 任一位是 D / U 都视为不允许（删除或冲突）
    if (/[DU]/.test(status)) return true;
    if (!ALLOWED_STATUS.test(status.trim())) return true;
    return !ALLOWED.test(path);
  });

  if (unexpected.length > 0) {
    console.error('工作区存在未提交变更，发版前请先手动提交或还原：');
    for (const f of unexpected) console.error(`  - ${f.status} ${f.path}`);
    console.error('（发版脚本只自动提交 package.json / bun.lock 的版本变更）');
    process.exit(1);
  }

  console.log('→ 检测到版本相关变更，自动暂存并提交（中文约定式 commit）');
  git(['add', 'package.json', 'bun.lock'], true);
  const files = gitOut(['diff', '--cached', '--name-only'])
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (files.length === 0) {
    console.error('暂存后无文件，请检查 .gitignore');
    process.exit(1);
  }
  const msg = pickCommitMessage(files);
  console.log(`→ git commit -m "${msg}"`);
  git(['commit', '-m', msg], true);
}

const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const prevPkgVersion = pkg.version;
if (pkg.version !== version) {
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

const tag = `v${version}`;
const releaseMsg = `chore(release): ${tag}`;

console.log('→ git add package.json');
git(['add', 'package.json'], true);
const bumped = gitOut(['diff', '--cached', '--name-only'])
  .split('\n')
  .some((line) => line.trim() === 'package.json');

if (!bumped) {
  console.log(`→ package.json 已是 ${prevPkgVersion}，跳过 bumps commit`);
} else {
  console.log(`→ git commit -m "${releaseMsg}"`);
  git(['commit', '-m', releaseMsg], true);
}

console.log(`→ git tag -a ${tag} -m "Release ${tag}"`);
git(['tag', '-a', tag, '-m', `Release ${tag}`], true);

console.log('→ git push origin main --follow-tags');
git(['push', 'origin', 'main', '--follow-tags'], true);

console.log(`\n已推送 ${tag}，CI 将构建并发布 Release。验证: bun scripts/verify-release.mjs ${version}`);
