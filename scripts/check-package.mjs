// Installs the packed package into a fresh project, the way a user would, then type-checks and bundles
// code that uses every entry point. Catches broken "exports" paths and type declarations that tests
// inside this repo can't see, because they import the source files directly. Run after `npm run build`.
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repo = resolve('.');
const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' });
const dir = mkdtempSync(join(tmpdir(), 'mulling-consumer-'));
const tarball = join(repo, sh('npm pack --silent', repo).trim().split('\n').pop());

try {
  sh('npm init -y', dir);
  sh(`npm install --no-audit --no-fund ${tarball} react@18 react-dom@18 vue@3 @types/react@18 typescript@5 esbuild`, dir);
  writeFileSync(
    join(dir, 'app.tsx'),
    `
import { Mulling } from 'mulling/react';
import { Mulling as VueLoader } from 'mulling/vue';
import { Mulling as ReactCore } from 'mulling/react/core';
import { Mulling as VueCore } from 'mulling/vue/core';
import { mount, use, type LoaderDef } from 'mulling/core';
import { coil, allLoaders } from 'mulling/loaders';
import { coreCss, defineElement, type BuiltInLoaderType } from 'mulling';
import type {} from 'mulling/jsx';
use(coil);
const custom: LoaderDef = { type: 'x', name: 'X', tech: 'canvas', description: '', reducedMotion: '', paint: () => {} };
use(custom);
const t: BuiltInLoaderType = 'pond';
export const a = <Mulling state="searching" announce="polite" />;
export const b = <mulling-status state="done" />;
export { VueLoader, ReactCore, VueCore, mount, allLoaders, coreCss, defineElement, t };
`,
  );
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        lib: ['ES2020', 'DOM'],
      },
      files: ['app.tsx'],
    }),
  );
  sh('npx tsc -p .', dir);
  console.log('✓ every entry point type-checks from an installed package (moduleResolution: Bundler)');
  // NodeNext: the strictest resolution, used by Node projects. skipLibCheck stays off, so broken
  // declarations fail here instead of silently becoming \`any\`.
  writeFileSync(
    join(dir, 'tsconfig.nodenext.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        lib: ['ES2022', 'DOM'],
      },
      files: ['app.tsx'],
    }),
  );
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ ...JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')), type: 'module' }),
  );
  sh('npx tsc -p tsconfig.nodenext.json', dir);
  console.log('✓ every entry point type-checks under moduleResolution: NodeNext');
  writeFileSync(
    join(dir, 'bad.ts'),
    "import { mount } from 'mulling/core';\n// @ts-expect-error size must be a number\nmount(document.body, { size: 'big' });\n",
  );
  writeFileSync(join(dir, 'tsconfig.bad.json'), JSON.stringify({ extends: './tsconfig.nodenext.json', files: ['bad.ts'] }));
  sh('npx tsc -p tsconfig.bad.json', dir);
  console.log('✓ types are real, not any: a wrong option type is an error');
  sh(
    'npx esbuild app.tsx --bundle --format=esm --external:react --external:react-dom --external:vue --external:react/jsx-runtime --outfile=out.js --log-level=error',
    dir,
  );
  console.log('✓ every entry point bundles');
  writeFileSync(
    join(dir, 'require.cjs'),
    `
const full = require('mulling');
const core = require('mulling/core');
const { coil } = require('mulling/loaders');
require('mulling/react'); require('mulling/react/core');
require('mulling/vue'); require('mulling/vue/core');
require('mulling/package.json');
if (typeof full.mount !== 'function' || typeof core.use !== 'function' || coil.type !== 'coil') throw new Error('CommonJS exports are wrong');
`,
  );
  sh('node require.cjs', dir);
  console.log('✓ CommonJS require works for every entry point');
} catch (e) {
  console.error('✗', e.stdout || e.message);
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
  rmSync(tarball, { force: true });
}
