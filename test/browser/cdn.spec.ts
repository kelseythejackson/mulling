import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The script-tag path is the one beginners use, so it has to work exactly as the docs print it.
// jsDelivr serves files by extension with `X-Content-Type-Options: nosniff`, and browsers then refuse to
// run a script whose type isn't JavaScript. `.cjs` isn't served as JavaScript (jsdelivr/jsdelivr#18584),
// so this test serves the built file the same way and checks it still runs.
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const cdnType: Record<string, string> = { js: 'application/javascript; charset=utf-8', cjs: 'application/node' };
const snippetSources = ['README.md', 'site/src/content/docs/start/installation.mdx', 'site/src/content/docs/start/quick-start.mdx'];

test('the CDN file is a .js file and the docs point at it', () => {
  const file = String(pkg.jsdelivr).replace(/^\.\//, '');
  expect(file).toMatch(/\.js$/);
  expect(pkg.unpkg).toBe(pkg.jsdelivr);
  for (const source of snippetSources) {
    const urls = readFileSync(source, 'utf8').match(/https:\/\/cdn\.jsdelivr\.net\/npm\/mulling@[^/"]+\/[^"]+/g) ?? [];
    expect(urls.length, `${source} shows the CDN script tag`).toBeGreaterThan(0);
    for (const url of urls) expect(url, source).toMatch(new RegExp(`/${file.replace(/\./g, '\\.')}$`));
  }
});

test('the docs’ script-tag snippet runs in a plain HTML page', async ({ page }) => {
  const file = String(pkg.jsdelivr).replace(/^\.\//, '');
  if (!existsSync(file)) throw new Error(`${file} is missing: run \`npm run build\` before the browser tests.`);
  await page.route('https://cdn.example/**', (route) =>
    route.fulfill({
      body: readFileSync(file, 'utf8'), // text, so it type-checks with or without @types/node
      headers: { 'content-type': cdnType[file.split('.').pop()!] ?? 'text/plain', 'x-content-type-options': 'nosniff' },
    }),
  );
  await page.route('https://page.example/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><script src="https://cdn.example/${file}"></script>
<script>Mulling.defineElement();</script>
<mulling-status state="thinking"></mulling-status>`,
    }),
  );
  await page.goto('https://page.example/');
  const rendered = await page.evaluate(() => !!document.querySelector('mulling-status')?.shadowRoot?.childElementCount);
  expect(rendered).toBe(true);
});
