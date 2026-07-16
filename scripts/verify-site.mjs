import { access, readdir, stat } from 'node:fs/promises';
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

console.log(`Hub-Artefakt vollständig: ${inventory.length} Dateien geprüft.`);
