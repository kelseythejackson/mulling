// Bundle sizes for the docs, measured by size-limit rather than typed by hand.
//   node scripts/sizes.mjs          writes site/src/data/sizes.json (run after `npm run build`), and fills the
//                                   README's <!-- size:everything -->9.4 kB<!-- /size --> markers from it
//   node scripts/sizes.mjs --check  fails if that file is out of date, or if a page or the README types a
//                                   size itself ("9.4 kB") instead of reading it from the file
// Hand-typed sizes went stale within a day of a change in four places (content audit, November 2026).
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const file = 'site/src/data/sizes.json';
const names = {
  everything: 'Everything (mulling)',
  coreOne: 'Core + one loader',
  coreStates: 'Core + the three state loaders',
  reactCore: 'React component on core (React itself excluded)',
  vueCore: 'Vue component on core (Vue itself excluded)',
};

const measured = JSON.parse(execSync('npx size-limit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const sizes = {};
for (const [key, name] of Object.entries(names)) {
  const entry = measured.find((m) => m.name === name);
  if (!entry) throw new Error(`size-limit has no entry named "${name}"`);
  sizes[key] = `${(Math.round(entry.size / 100) / 10).toFixed(1)} kB`; // one decimal, as the docs print it
}
const json = `${JSON.stringify(sizes, null, 2)}\n`;

// The README can't import data, so its sizes sit between markers that this script fills in.
const marker = /<!-- size:(\w+) -->[^<]*<!-- \/size -->/g;
const fillReadme = (text) => text.replace(marker, (m, key) => (sizes[key] ? `<!-- size:${key} -->${sizes[key]}<!-- /size -->` : m));

if (!process.argv.includes('--check')) {
  writeFileSync(file, json);
  writeFileSync('README.md', fillReadme(readFileSync('README.md', 'utf8')));
  console.log(`wrote ${file}: ${Object.values(sizes).join(', ')}`);
  process.exit(0);
}

let failures = 0;
if (readFileSync(file, 'utf8') !== json) {
  failures++;
  console.log(`✗ ${file} is out of date: run \`node scripts/sizes.mjs\` (measured ${Object.values(sizes).join(', ')})`);
}
// Any "<number> kB" in a page, component or the README is a hand-typed size.
const sources = ['README.md'];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (!['api', 'data'].includes(f)) walk(p);
    } else if (/\.(mdx?|astro|ts)$/.test(f)) sources.push(p);
  }
})('site/src');
const readme = readFileSync('README.md', 'utf8');
if (fillReadme(readme) !== readme) {
  failures++;
  console.log('✗ README.md: a size between markers is out of date: run `node scripts/sizes.mjs`');
}
for (const path of sources) {
  readFileSync(path, 'utf8')
    .replace(marker, '')
    .split('\n')
    .forEach((line, i) => {
      if (/\d(\.\d+)?\s?kB\b/.test(line)) {
        failures++;
        console.log(`✗ ${path}:${i + 1} types a size by hand; read it from ${file} instead: ${line.trim()}`);
      }
    });
}
console.log(failures ? `\n${failures} problem(s)` : '✓ sizes are measured, current, and typed nowhere by hand');
process.exit(failures ? 1 : 0);
