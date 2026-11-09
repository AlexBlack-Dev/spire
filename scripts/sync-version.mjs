import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = String(process.argv[2] ?? '').replace(/^v/, '');

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/sync-version.mjs <x.y.z>');
  process.exit(1);
}

const pending = [];

function queueJson(relPath, mutate) {
  const full = join(root, relPath);
  const parsed = JSON.parse(readFileSync(full, 'utf8'));
  mutate(parsed);
  pending.push([full, JSON.stringify(parsed, null, 2) + '\n']);
}

function queueText(relPath, transform) {
  const full = join(root, relPath);
  const text = readFileSync(full, 'utf8').replace(/^﻿/, '');
  pending.push([full, transform(text)]);
}

queueJson('package.json', (pkg) => { pkg.version = version; });
queueJson('package-lock.json', (lock) => {
  lock.version = version;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = version;
  }
});
queueJson(join('src-tauri', 'tauri.conf.json'), (tauri) => { tauri.version = version; });

queueText(join('src-tauri', 'Cargo.toml'), (cargo) => {
  if (!/^version\s*=\s*"[^"]+"/m.test(cargo)) {
    throw new Error('Cargo.toml: no "version" field found to replace');
  }
  return cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);
});

queueText(join('src-tauri', 'Cargo.lock'), (cargoLock) => {
  const re = /(\[\[package\]\]\r?\nname = "spire"\r?\nversion = ")[^"]+(")/;
  if (!re.test(cargoLock)) {
    throw new Error('Cargo.lock: "spire" package entry not found');
  }
  return cargoLock.replace(re, `$1${version}$2`);
});

for (const [target, content] of pending) {
  const tmp = target + '.sync-version.tmp';
  writeFileSync(tmp, content);
  renameSync(tmp, target);
}

console.log(`Version synced to ${version} (package.json, package-lock.json, tauri.conf.json, Cargo.toml, Cargo.lock)`);
