// Bundles "core + one loader" the way an app's bundler would, then checks that the other loaders were left out.
// Run after `npm run build`.
import { build } from 'esbuild';

const bundle = async (entry) =>
  (
    await build({
      entryPoints: [entry],
      bundle: true,
      minify: true,
      write: false,
      format: 'esm',
      logLevel: 'silent',
      external: ['react', 'vue'],
    })
  ).outputFiles[0].text;

const code = await bundle('size/core-one-loader.js');
const reactFull = await bundle('size/react-full.js');
const reactCore = await bundle('size/react-core-one-loader.js');
const fullMountOnly = await bundle('size/full-mount-only.js');

// Core mentions "breath", "murmur" and "tide" by name (the default loader for each state), so look for each
// loader's own definition, via its display name, rather than its type.
const has = (name) => code.includes(`"${name}"`);
const checks = {
  'includes coil': has('Coil'),
  'leaves out the CSS loaders (breath, orbit, tide, blink)':
    ['Breath', 'Orbit', 'Tide', 'Blink'].every((n) => !has(n)) && !code.includes('mulling-orbit'),
  'leaves out the other canvas loaders (murmur, scribble, pond)': ['Murmur', 'Scribble', 'Pond'].every((n) => !has(n)),
  'mulling keeps every loader when only mount() is imported': [
    'Breath',
    'Orbit',
    'Tide',
    'Blink',
    'Coil',
    'Murmur',
    'Scribble',
    'Pond',
  ].every((n) => fullMountOnly.includes(`"${n}"`)),
  'mulling/react keeps every loader (its registration is not dropped)': [
    'Breath',
    'Orbit',
    'Tide',
    'Blink',
    'Coil',
    'Murmur',
    'Scribble',
    'Pond',
  ].every((n) => reactFull.includes(`"${n}"`)),
  'mulling/react/core with one loader leaves the others out':
    reactCore.includes('"Coil"') && ['Breath', 'Murmur', 'Pond'].every((n) => !reactCore.includes(`"${n}"`)),
};

let failed = false;
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed = true;
}
console.log(`core + coil: ${(code.length / 1024).toFixed(1)} kB minified`);
process.exit(failed ? 1 : 0);
