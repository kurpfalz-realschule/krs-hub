import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = resolve(root, '_site');

const files = [
  'index.html',
  'krs-native.js',
  'tenant.js',
  'manifest.json',
  'sw.js',
  'logo-krs.png',
  'offline.html',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
];
const directories = ['modules', 'notizen', 'hilfe'];

await rm(site, { recursive: true, force: true });
await mkdir(site, { recursive: true });

for (const file of files) {
  await cp(resolve(root, file), resolve(site, file));
}

for (const directory of directories) {
  await cp(resolve(root, directory), resolve(site, directory), { recursive: true });
}

// B6 (3.29.0): kleine version.json für den Update-Check (statt ganzer index.html)
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const m = html.match(/VERSION:\s*'([^']+)'/);
if (!m) throw new Error('CONFIG.VERSION nicht gefunden');
await writeFile(resolve(site, 'version.json'), JSON.stringify({ version: m[1] }) + '\n');

console.log(`Hub-Artefakt erstellt: ${site}`);
