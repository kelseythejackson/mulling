// The site's "Upgrade to 1.0" page is generated from MIGRATING.md, so the repo's copy (read on GitHub)
// and the site's can't drift apart. Runs before every site build and dev server start.
// Links in MIGRATING.md point at the published site (package.json "homepage"); on the site they become
// relative, so they also work in local builds and previews.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const homepage = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).homepage.replace(/\/?$/, '/');
const source = readFileSync(new URL('MIGRATING.md', root), 'utf8');

const [, title, body] = source.match(/^# (.+)\n([\s\S]*)$/) ?? [];
if (!title) throw new Error('MIGRATING.md must start with a "# " heading');
const page = `---
# Generated from MIGRATING.md by site/scripts/sync-docs.mjs. Edit that file, not this one.
title: ${title}
description: The rename to Mulling, and what changed in 1.0.
---
${body.replaceAll(`(${homepage}`, '(../../')}`;

writeFileSync(new URL('site/src/content/docs/reference/migrating.md', root), page);
console.log('synced reference/migrating.md from MIGRATING.md');
