import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const [source, target] of [
  ['img', 'public/img'],
  ['src/pages/website/img', 'public/website/img'],
  ['src/pages/website/css', 'public/website/css'],
]) {
  await mkdir(path.join(root, target), { recursive: true });
  await cp(path.join(root, source), path.join(root, target), {
    recursive: true,
    filter: (file) => !file.endsWith('.txt'),
  });
}
console.log('Logo e imágenes preparados en public/; originales conservados.');
