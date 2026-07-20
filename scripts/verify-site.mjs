import { access, readdir, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = resolve(root, '_site');

const requiredFiles = [
  'index.html',
  'tenant.js',
  'manifest.json',
  'sw.js',
  'logo-krs.png',
  'offline.html',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'modules/buchung.html',
  'modules/connect.html',
  'modules/piano.html',
  'modules/plan.html',
  'notizen/index.html',
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [relative(site, path)];
  }));
  return nested.flat().sort();
}

const missing = [];
const empty = [];

for (const file of requiredFiles) {
  const path = resolve(site, file);
  try {
    await access(path, constants.R_OK);
    if ((await stat(path)).size === 0) empty.push(file);
  } catch {
    missing.push(file);
  }
}

const inventory = await listFiles(site);
console.log(JSON.stringify({ requiredFiles, inventory, missing, empty }, null, 2));

if (missing.length || empty.length) {
  throw new Error(`Ungültiges Hub-Artefakt: missing=${missing.join(',')}; empty=${empty.join(',')}`);
}

// Versions-Kopplung: sw.js VERSION muss identisch mit CONFIG.VERSION (index.html) sein.
// Verhindert die bekannte "PWA hängt auf alter Version"-Falle (siehe Sprint S1).
const swText = await readFile(resolve(site, 'sw.js'), 'utf8');
const indexText = await readFile(resolve(site, 'index.html'), 'utf8');

const swVersionMatch = swText.match(/VERSION\s*=\s*'([^']+)'/);
const appVersionMatch = indexText.match(/VERSION:\s*'([^']+)'/);

if (!swVersionMatch || !appVersionMatch) {
  throw new Error('Versions-Check fehlgeschlagen: VERSION-Konstante nicht gefunden (sw.js oder index.html).');
}

const swVersion = swVersionMatch[1];
const appVersion = appVersionMatch[1];

if (swVersion !== appVersion) {
  throw new Error(`Versions-Drift: sw.js VERSION (${swVersion}) != CONFIG.VERSION (${appVersion}) in index.html.`);
}

console.log(`Versions-Kopplung ok: sw.js und index.html sind auf v${appVersion}.`);
console.log(`Hub-Artefakt vollständig: ${inventory.length} Dateien geprüft.`);
