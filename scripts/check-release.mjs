// Runs before every `npm publish` (see prepublishOnly). Stops a release that would ship placeholders,
// or whose version and changelog disagree.
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const problems = [];

for (const file of ['package.json', 'LICENSE', 'README.md', 'MIGRATING.md', 'site/astro.config.mjs']) {
  const text = readFileSync(file, 'utf8');
  for (const placeholder of ['YOUR-USERNAME', 'YOUR NAME']) {
    if (text.includes(placeholder)) problems.push(`${file} still contains "${placeholder}"`);
  }
}

const changelog = readFileSync('CHANGELOG.md', 'utf8');
const top = changelog.match(/^## (\S+)(.*)$/m);
if (!top) problems.push('CHANGELOG.md has no version heading');
else {
  if (top[1] !== pkg.version) problems.push(`package.json is ${pkg.version} but the newest CHANGELOG entry is ${top[1]}`);
  if (/unreleased/i.test(top[2])) problems.push(`CHANGELOG entry ${top[1]} is still marked "unreleased": replace it with the release date`);
}

// The README's CDN link names either the exact version or just its major ("mulling@1": the newest 1.x).
const cdn = readFileSync('README.md', 'utf8').match(/mulling@([\d.]+)\//);
const major = pkg.version.split('.')[0];
if (cdn && cdn[1] !== pkg.version && cdn[1] !== major)
  problems.push(`README's CDN link points at ${cdn[1]}, not ${pkg.version} or ${major}`);

if (problems.length) {
  console.error(`Not ready to publish:\n${problems.map((p) => `  ✗ ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`✓ ready to publish ${pkg.name}@${pkg.version}`);
