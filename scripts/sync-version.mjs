import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/sync-version.mjs <x.y.z>');
  process.exit(1);
}

const packagePath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
pkg.version = version;
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

const tauriPath = join(root, 'src-tauri', 'tauri.conf.json');
const tauri = JSON.parse(readFileSync(tauriPath, 'utf8'));
tauri.version = version;
writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');

console.log(`Version synced to ${version}`);