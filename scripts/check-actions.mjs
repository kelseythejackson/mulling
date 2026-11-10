// Every GitHub Action must be pinned to a full commit SHA, with its version in a comment:
//   uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
// A tag like @v4 can be moved to different code at any time, including by someone who takes over the
// action's repository; a commit SHA can't. Dependabot (.github/dependabot.yml) keeps the pins current.
import { readdirSync, readFileSync } from 'node:fs';

const dir = '.github/workflows';
const problems = [];
for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
  readFileSync(`${dir}/${file}`, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const m = line.match(/^\s*-?\s*uses:\s*(\S+)(.*)$/);
      if (!m || m[1].startsWith('./')) return; // local actions live in this repo
      if (!/@[0-9a-f]{40}$/.test(m[1])) problems.push(`${file}:${i + 1} ${m[1]} is not pinned to a commit SHA`);
      else if (!/#\s*v\d/.test(m[2])) problems.push(`${file}:${i + 1} ${m[1]} has no "# vX.Y.Z" comment saying which version it is`);
    });
}

if (problems.length) {
  console.error(`Unpinned GitHub Actions:\n${problems.map((p) => `  ✗ ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('✓ every GitHub Action is pinned to a commit SHA');
