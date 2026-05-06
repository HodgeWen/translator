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
  console.log('→ 检测到未提交变更，自动暂存并提交（中文约定式 commit）');
  git(['add', '-A'], true);
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
