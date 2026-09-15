import { readFile, rename, rm, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = 'dist/client';
const prefix = '/betmakers-horse-studio';
// Vinext writes path-prefixed assets into a matching folder. Pages already
// mounts the artifact at that prefix, so flatten it before publishing.
await rename(`${root}${prefix}/_next`, `${root}/_next`);
await rm(`${root}${prefix}`, { recursive: true });
await writeFile(`${root}/.nojekyll`, '');
const html = await readFile(`${root}/index.html`, 'utf8');
const resources = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
  .map(match => match[1])
  .filter(url => url.startsWith(`${prefix}/`) && url !== `${prefix}/`);
for (const url of [...resources, `${prefix}/models/chestnut-horse.glb`, `${prefix}/models/horse-rig.json`]) {
  await access(path.join(root, url.slice(prefix.length)));
}
console.log('GitHub Pages entry point and assets verified.');
