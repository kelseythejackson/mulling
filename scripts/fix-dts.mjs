// Runs after `tsc` emits declarations into dist/types:
// 1. Adds file extensions to relative imports ('./mount' → './mount.js', './loaders' → './loaders/index.js'),
//    which `moduleResolution: NodeNext` requires. tsc 5.6 doesn't add them itself.
// 2. Writes a .d.cts copy of every declaration (and of types/jsx.d.ts), with imports pointing at .cjs,
//    so CommonJS consumers get CommonJS types for the CommonJS build.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const spec = /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]+)\2/g;

function withExtension(file, path, ext) {
  if (/\.(c|m)?js$/.test(path)) return path.replace(/\.(c|m)?js$/, `.${ext}`);
  const base = resolve(dirname(file), path);
  if (existsSync(`${base}.d.ts`)) return `${path}.${ext}`;
  if (existsSync(join(base, 'index.d.ts'))) return `${path}/index.${ext}`;
  throw new Error(`fix-dts: can't resolve "${path}" from ${file}`);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const files = walk('dist/types');
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const esm = src.replace(spec, (_m, pre, q, p) => `${pre}${q}${withExtension(file, p, 'js')}${q}`);
  const cjs = src.replace(spec, (_m, pre, q, p) => `${pre}${q}${withExtension(file, p, 'cjs')}${q}`);
  writeFileSync(file, esm);
  writeFileSync(file.replace(/\.d\.ts$/, '.d.cts'), cjs);
}
writeFileSync('types/jsx.d.cts', readFileSync('types/jsx.d.ts', 'utf8'));
console.log(`fix-dts: ${files.length} declarations given extensions, with .d.cts copies`);
