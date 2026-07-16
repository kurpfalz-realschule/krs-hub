import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = resolve(root, '_site');

const files = ['index.html', 'tenant.js', 'manifest.json', 'sw.js', 'logo-krs.png'];
const directories = ['modules', 'notizen'];

await rm(site, { recursive: true, force: true });
await mkdir(site, { recursive: true });

for (const file of files) {
  await cp(resolve(root, file), resolve(site, file));
}

for (const directory of directories) {
  await cp(resolve(root, directory), resolve(site, directory), { recursive: true });
}

console.log(`Hub-Artefakt erstellt: ${site}`);
