#!/usr/bin/env bun
/**
 * 轮询 GitHub API，确认 Release 与 zip 资源已就绪（ESM，Bun 运行）
 * 用法: bun scripts/verify-release.mjs <X.Y.Z>
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const semverRe = /^\d+\.\d+\.\d+([-.+][0-9A-Za-z.-]+)?$/;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseRepo() {
  const url = execFileSync('git', ['remote', 'get-url', 'origin'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  const m = url.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (!m) {
    console.error('无法从 git remote 解析 GitHub owner/repo');
    process.exit(1);
  }
  return { owner: m[1], repo: m[2] };
}

const version = process.argv[2];
if (!version || !semverRe.test(version)) {
  console.error('用法: bun scripts/verify-release.mjs <X.Y.Z>');
  process.exit(1);
}

const { owner, repo } = parseRepo();
const tag = `v${version}`;
const api = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
const rounds = 24;
const delayMs = 5000;

for (let i = 0; i < rounds; i++) {
  const res = await fetch(api, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (res.ok) {
    /** @type {{ html_url: string; assets?: { name: string }[] }} */
    const data = await res.json();
    console.log('Release:', data.html_url);
    console.log('Assets:');
    for (const a of data.assets ?? []) {
      console.log(' -', a.name);
    }
    process.exit(0);
  }
  if (res.status !== 404) {
    console.error(await res.text());
    process.exit(1);
  }
  const n = i + 1;
  console.log(`等待 Release ${tag} … (${n}/${rounds})`);
  await new Promise((r) => setTimeout(r, delayMs));
}

console.error(`${rounds * (delayMs / 1000)}s 内未找到 ${tag}，请到 Actions 查看 workflow`);
process.exit(1);
