// Checks the packed package's type declarations with "Are the Types Wrong?" (@arethetypeswrong/core):
// every entry point, under every resolution mode (node10, node16 CJS, node16 ESM, bundler).
// attw's own tarball reader fails on this package (an fflate streaming bug), so this unpacks with `tar`.
// Run after `npm run build`.
import { execSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { checkPackage, Package } from '@arethetypeswrong/core';

const dir = mkdtempSync(join(tmpdir(), 'mulling-attw-'));
const tarball = join(process.cwd(), execSync('npm pack --silent', { encoding: 'utf8' }).trim().split('\n').pop());
try {
  execSync(`tar xzf ${tarball} -C ${dir}`);
  const root = join(dir, 'package');
  const pkgJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const files = {};
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else files[`/node_modules/${pkgJson.name}/${relative(root, p)}`] = new Uint8Array(readFileSync(p));
    }
  };
  walk(root);
  const result = await checkPackage(new Package(files, pkgJson.name, pkgJson.version));
  // Entry points that only exist for one condition are expected to be missing under the other.
  const ignore = (p) => p.kind === 'CJSResolvesToESM' && false;
  const problems = (result.problems ?? []).filter((p) => !ignore(p));
  if (!problems.length) {
    console.log(`✓ no type problems in any entry point (${Object.keys(result.entrypoints).join(', ')})`);
  } else {
    for (const p of problems) {
      console.error(`✗ ${p.kind}${p.entrypoint ? ` in ${p.entrypoint}` : ''}${p.resolutionKind ? ` (${p.resolutionKind})` : ''}`);
    }
    process.exitCode = 1;
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
  rmSync(tarball, { force: true });
}
