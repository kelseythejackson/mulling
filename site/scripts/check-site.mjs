// Checks the built docs site: runs axe (WCAG 2.1 A and AA) on every page in light and dark mode, then checks
// that the interactive parts work. Fails on any violation, script error or broken control.
// Run after `npm run build` and `npm run build:site`: `npm run test:site` (from the repo root). It serves the
// built files itself, on a free port, so a running dev server doesn't get in the way.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, relative } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright-core';

const dist = new URL('../dist/', import.meta.url).pathname;

// Say what to build, instead of failing later with ENOENT. The beginner-path checks load the library's own
// script-tag build, so the library must be built too.
const missing = [
  [join(dist, 'index.html'), 'the docs site: run `npm run build:site`'],
  [new URL('../../dist/mulling.umd.js', import.meta.url).pathname, 'the library: run `npm run build`'],
].filter(([file]) => !existsSync(file));
if (missing.length) {
  for (const [, what] of missing) console.error(`✗ Build ${what} first.`);
  process.exit(1);
}

// Serve the built files, unless BASE points at a site that's already running.
// (astro preview starts its server in a separate process group, which is awkward to stop reliably.)
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};
const prefix = '/mulling';
const server = process.env.BASE
  ? null
  : createServer(async (req, res) => {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (!path.startsWith(prefix)) return res.writeHead(404).end();
      path = path.slice(prefix.length) || '/';
      if (path.endsWith('/')) path += 'index.html';
      try {
        const body = await readFile(join(dist, path));
        res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
// Port 0 = any free port: `npm run dev` holds 4321, and two fixed ports would collide.
if (server) await new Promise((resolve) => server.listen(0, resolve));
const base = process.env.BASE ?? `http://localhost:${server.address().port}/mulling`;
const stopServer = () => server?.close();

const pages = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === 'index.html') pages.push(`/${relative(dist, dir)}/`.replace('//', '/'));
  }
})(dist);

let failures = 0;

// Links (content audit): every internal link reaches a page and, if it has one, an anchor on that page;
// every page is reachable from the menu or another page. Checked on the built HTML, without a browser.
{
  const html = {};
  for (const path of pages) html[path] = await readFile(join(dist, path, 'index.html'), 'utf8');
  const ids = (s) => new Set([...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const linkedTo = new Set();
  let checked = 0;
  for (const [from, s] of Object.entries(html)) {
    // Code samples aren't links, even when they contain href="…".
    const body = s.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code[\s\S]*?<\/code>/g, '');
    for (const [, href] of body.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
      if (/^(https?:|mailto:|javascript:)/.test(href)) continue;
      const url = new URL(href.replaceAll('&amp;', '&'), `http://x${prefix}${from}`);
      if (!url.pathname.startsWith(prefix)) continue;
      let path = url.pathname.slice(prefix.length) || '/';
      if (/\.[a-z0-9]+$/i.test(path) && !path.endsWith('.html')) continue; // a file, such as the sitemap
      path = path.replace(/index\.html$/, '');
      if (!path.endsWith('/')) path += '/';
      checked++;
      if (!(path in html)) {
        failures++;
        console.log(`✗ broken link on ${from}: ${href}`);
        continue;
      }
      if (path !== from) linkedTo.add(path);
      const hash = decodeURIComponent(url.hash.slice(1));
      if (hash && hash !== '_top' && !ids(html[path]).has(hash)) {
        failures++;
        console.log(`✗ link to a missing anchor on ${from}: ${href}`);
      }
    }
  }
  const orphans = pages.filter((p) => p !== '/' && !p.startsWith('/404') && !linkedTo.has(p));
  for (const p of orphans) {
    failures++;
    console.log(`✗ orphaned page: nothing links to ${p}`);
  }
  if (!failures) console.log(`✓ ${checked} internal links resolve; every page is linked from somewhere`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
for (const theme of process.env.SKIP_AXE ? [] : ['light', 'dark']) {
  const ctx = await browser.newContext({ colorScheme: theme });
  await ctx.addInitScript((t) => localStorage.setItem('starlight-theme', t), theme);
  for (const path of pages) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + path, { waitUntil: 'load' });
    await page.waitForTimeout(150);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    for (const v of violations) {
      failures++;
      console.log(`✗ ${theme} ${path} ${v.id} (${v.impact}): ${v.help}`);
      for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(' ')} ${n.failureSummary?.split('\n')[1] ?? ''}`);
    }
    for (const e of errors) {
      failures++;
      console.log(`✗ ${theme} ${path} script error: ${e}`);
    }
    await page.close();
  }
  await ctx.close();
}
// Behavior: the controls do what they say.
const check = (ok, what) => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${what}`);
};
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/`, { waitUntil: 'load' });
  // At mobile widths the header controls move into the menu, which the landing page has too (UX audit M6).
  const menu = page.getByRole('button', { name: 'Menu' });
  check(await menu.isVisible(), 'landing (mobile): there is a menu button');
  await menu.click();
  const nav = page.locator('#starlight__sidebar');
  check(
    (await nav.getByRole('link', { name: 'Quick start' }).isVisible()) && (await nav.locator('starlight-theme-select select').isVisible()),
    'landing (mobile): the menu has the docs navigation and the theme switch',
  );
  const pause = page.locator('[data-pause-all]').filter({ visible: true });
  check((await pause.count()) === 1, 'landing (mobile): exactly one pause control is visible, in the menu');
  await pause.click();
  const allPaused = await page.$$eval('mulling-status', (els) => els.every((el) => el.hasAttribute('paused')));
  check(
    allPaused && (await pause.textContent()).trim() === 'Resume motion',
    'landing: pause stops every loader and the control then says “Resume motion”',
  );
  await page.reload({ waitUntil: 'load' });
  check(
    await page.$$eval('mulling-status', (els) => els.every((el) => el.hasAttribute('paused'))),
    'landing: the pause choice is remembered on the next page',
  );
  const notice = page.locator('.site-paused-notice');
  check(await notice.isVisible(), 'a page that opens paused says so');
  await notice.getByRole('button', { name: 'Resume' }).click();
  check(
    (await notice.count()) === 0 && (await page.$$eval('mulling-status', (els) => els.every((el) => !el.hasAttribute('paused')))),
    'the notice’s Resume button restarts the loaders and closes the notice',
  );
  await page.keyboard.press('Escape'); // close the menu
  {
    // UX audit m3: on a phone, long code lines wrap instead of being cut off.
    const p2 = await ctx.newPage();
    await p2.goto(`${base}/start/installation/`, { waitUntil: 'load' });
    const clipped = await p2.$$eval('.expressive-code pre', (pres) => pres.filter((p) => p.scrollWidth > p.clientWidth + 1).length);
    check(clipped === 0, `mobile: no code block is cut off on Installation (${clipped} clipped)`);
    await p2.close();
  }
  await page.locator('[data-stage] [data-state="error"]').click();
  check(
    (await page.locator('[data-stage] mulling-status').first().getAttribute('state')) === 'error',
    'landing: the state buttons change the loader',
  );
  await ctx.close();
}
{
  // Desktop: one pause control, in the header, labelled with words.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/`, { waitUntil: 'load' });
  const pause = page.locator('[data-pause-all]').filter({ visible: true });
  check(
    (await pause.count()) === 1 && (await pause.textContent()).trim() === 'Pause motion',
    'landing (desktop): exactly one pause control is visible, labelled “Pause motion”',
  );
  // A gallery tile is one link to the playground, opened with that loader.
  const tile = page.locator('.gallery .tile').filter({ hasText: 'Orbit' });
  const box = await tile.boundingBox();
  // Blank space near the top, not the art or the name.
  await Promise.all([
    page.waitForURL('**/guides/loaders/**', { timeout: 5000 }).catch(() => {}),
    tile.click({ position: { x: box.width / 2, y: 12 }, force: true }),
  ]);
  await page.waitForLoadState('load');
  check(
    page.url().includes('/guides/loaders/') &&
      (await page.inputValue('[data-play] select[name=type]')) === 'orbit' &&
      (await page.getAttribute('[data-play] mulling-status', 'type')) === 'orbit',
    `gallery: clicking anywhere on a tile opens the playground with that loader (${page.url()})`,
  );
  await page.goto(`${base}/`, { waitUntil: 'load' });
  await page.locator('.gallery .tile').filter({ hasText: 'Orbit' }).getByRole('button', { name: /Copy/ }).click();
  check(page.url() === `${base}/`, 'gallery: the Copy button copies without following the tile’s link');
  // On a docs page, with the sidebar, the paused notice must be on top and clickable.
  await page.evaluate(() => localStorage.setItem('mulling-site-paused', '1'));
  await page.goto(`${base}/guides/ai-states/`, { waitUntil: 'load' });
  const resume = page.locator('.site-paused-notice button');
  const at = await resume.boundingBox();
  const onTop =
    at && (await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.site-paused-notice') != null, [at.x + 4, at.y + 4]));
  check(onTop, 'docs page (desktop): the paused notice is visible above the sidebar');
  await page.evaluate(() => localStorage.setItem('mulling-site-paused', '0'));
  await page.close();
}
{
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${base}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2600); // longer than one autoplay step
  check(
    (await page.locator('[data-stage] mulling-status').first().getAttribute('state')) === 'thinking',
    'landing: no autoplay under reduced motion',
  );
  await ctx.close();
}
{
  // Storage blocked, as in a sandboxed frame or with strict privacy settings: the theme must still switch.
  const ctx = await browser.newContext({ colorScheme: 'light' });
  await ctx.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/guides/ai-states/`, { waitUntil: 'load' });
  const select = page.locator('starlight-theme-select select').filter({ visible: true }).first();
  const seen = [];
  for (const v of ['dark', 'light', 'dark']) {
    await select.selectOption(v);
    seen.push(await page.evaluate(() => document.documentElement.dataset.theme));
  }
  check(
    seen.join() === 'dark,light,dark' && errors.length === 0,
    `theme switcher works with storage blocked (${seen.join()}${errors.length ? `; errors: ${errors.join(' | ')}` : ''})`,
  );
  await ctx.close();
}
{
  const page = await browser.newPage();
  await page.goto(`${base}/guides/loaders/`, { waitUntil: 'load' });
  await page.selectOption('[data-play] select[name=type]', 'coil');
  await page.locator('[data-play] [data-state="writing"]').click();
  await page.locator('[data-play] input[name=paused]').check();
  const snippet = await page.locator('[data-snippet]').textContent();
  check(
    snippet === '<mulling-status state="writing" size="96" paused></mulling-status>',
    `playground: the snippet matches the controls (${snippet})`,
  );
  const live = await page.$eval('[data-play] mulling-status', (el) => [el.getAttribute('state'), el.hasAttribute('paused')].join());
  check(live === 'writing,true', 'playground: the live loader matches the controls');
  // UX audit M5: the Loader menu chooses the state's loader, the code comes in every framework, and color has a contrast hint.
  await page.selectOption('[data-play] select[name=type]', 'scribble');
  check(
    (await page.locator('[data-snippet]').textContent()) ===
      '<mulling-status state="writing" loader-writing="scribble" size="96" paused></mulling-status>',
    'playground: with a state set, the Loader menu sets that state’s loader',
  );
  await page.getByRole('tab', { name: 'React' }).click();
  check(
    (await page.locator('[data-snippet]').textContent()) ===
      `<Mulling state="writing" states={{ writing: 'scribble' }} size={96} paused />`,
    'playground: the React tab shows the same options as props',
  );
  await page.locator('[data-play] input[type=color]').fill('#f4f4f5');
  const hint = await page.locator('[data-contrast]').textContent();
  check(/too faint/.test(hint ?? ''), `playground: a faint color gets a contrast warning (${hint})`);
  await page.reload({ waitUntil: 'load' });
  check(
    (await page.getByRole('tab', { name: 'React' }).getAttribute('aria-selected')) === 'true',
    'playground: the framework choice is remembered',
  );
  // UX audit m1–m4.
  await page.goto(`${base}/reference/stability/`, { waitUntil: 'load' });
  const stabilityToc = await page.locator('starlight-toc').count();
  await page.goto(`${base}/reference/options/`, { waitUntil: 'load' });
  check(stabilityToc === 0 && (await page.locator('starlight-toc').count()) > 0, 'contents: shown only on pages with 2+ headings');
  check(
    await page.$$eval('#type, #state, #size, #color, #speed, #reduced-motion, #max-fps', (els) => els.length === 7),
    'options: every option has its own link target',
  );
  await page.goto(`${base}/`, { waitUntil: 'load' });
  const first = page.locator('[data-state-group] [role=radio]').first();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  const focused = await page.evaluate(() =>
    [document.activeElement?.textContent, document.activeElement?.getAttribute('aria-checked')].join(),
  );
  const tabStops = await page.$$eval('[data-state-group] [role=radio]', (bs) => bs.filter((b) => b.tabIndex === 0).length);
  check(
    focused === 'Searching,true' && tabStops === 1 && (await page.getAttribute('[data-stage] mulling-status', 'state')) === 'searching',
    `landing: the state buttons are one tab stop and arrow keys choose (${focused}, ${tabStops} tab stop)`,
  );
  // UX audit M2: the quick start shows the whole flow live.
  await page.goto(`${base}/start/quick-start/`, { waitUntil: 'load' });
  const demo = page.locator('[data-stream]');
  const ask = demo.getByRole('button', { name: 'Ask', exact: true });
  await ask.focus();
  await ask.press('Enter');
  const seen = new Set();
  for (let i = 0; i < 60 && !seen.has('done'); i++) {
    seen.add(await demo.locator('mulling-status').getAttribute('state'));
    await page.waitForTimeout(100);
  }
  check(
    ['thinking', 'searching', 'writing', 'done'].every((s) => seen.has(s)) &&
      (await page.evaluate(() => document.activeElement?.textContent)) === 'Ask',
    `quick start: the demo goes through every state and keeps keyboard focus (${[...seen].join(' → ')})`,
  );
  await page.close();
}
{
  // The beginner path: what a user copies from the landing page, Installation and the quick start's HTML tab
  // must work when pasted into a blank HTML file. The CDN is stood in for by the library's own build, served
  // the way jsDelivr serves it (by extension, with nosniff), so a file browsers won't run fails here too.
  const umd = new URL('../../dist/', import.meta.url).pathname;
  const cdnTypes = { '.js': 'application/javascript; charset=utf-8' };
  const ctx = await browser.newContext();
  await ctx.route('https://cdn.jsdelivr.net/npm/**', async (route) => {
    const file = new URL(route.request().url()).pathname.replace(/^\/npm\/mulling@[^/]+\/dist\//, '');
    try {
      const body = await readFile(join(umd, file));
      await route.fulfill({
        body,
        headers: { 'content-type': cdnTypes[extname(file)] ?? 'application/node', 'x-content-type-options': 'nosniff' },
      });
    } catch {
      await route.fulfill({ status: 404 });
    }
  });
  const page = await ctx.newPage();
  const copied = {};
  await page.goto(`${base}/`, { waitUntil: 'load' });
  copied['landing Copy button'] = await page.getAttribute('.hero [data-copy]', 'data-copy');
  for (const [name, path] of [
    ['Installation', '/start/installation/'],
    ['quick start HTML tab', '/start/quick-start/'],
  ]) {
    await page.goto(base + path, { waitUntil: 'load' });
    const code = await page.$$eval('.expressive-code button[data-code]', (bs) => bs.map((b) => b.dataset.code.replace(/\u007f/g, '\n')));
    copied[name] = code.find((c) => c.includes('<script src='));
  }
  for (const [name, snippet] of Object.entries(copied)) {
    const runner = await ctx.newPage();
    await runner.route('https://blank.example/', (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html>${snippet ?? ''}` }));
    await runner.goto('https://blank.example/', { waitUntil: 'load' });
    const works = await runner
      .waitForFunction(() => document.querySelector('mulling-status')?.shadowRoot?.childElementCount, null, { timeout: 3000 })
      .then(
        () => true,
        () => false,
      );
    check(works, `beginner path: the ${name} snippet works pasted into a blank HTML page`);
    await runner.close();
  }
  await ctx.close();
}

await browser.close();
console.log(
  failures
    ? `\n${failures} problem(s)`
    : process.env.SKIP_AXE
      ? '✓ behavior checks pass (axe skipped)'
      : `✓ ${pages.length} pages × 2 themes: no WCAG 2.1 AA violations, no script errors`,
);
stopServer();
process.exit(failures ? 1 : 0);
