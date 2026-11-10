import { expect, test, type Page } from '@playwright/test';

// Regression tests for the second round of audit findings. Each one failed before its fix.

async function open(page: Page, path = '/') {
  await page.goto(path);
  await page.waitForSelector('body[data-ready]');
}

test.describe('1. strict Content Security Policy', () => {
  const NONCE = 'r4nd0m';
  // The fixture page, served with a policy that blocks every inline style that lacks the nonce.
  const strictPage = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style nonce="${NONCE}">body{margin:0;padding:16px;color:#3b5bdb}</style></head>
<body><div id="grid"></div><div id="scratch"></div><script type="module" src="/main.ts"></script></body></html>`;

  async function openStrict(page: Page) {
    const violations: string[] = [];
    page.on('console', (m) => m.text().includes('Content Security Policy') && violations.push(m.text()));
    await page.route('**/strict', (route) =>
      route.fulfill({
        contentType: 'text/html',
        headers: { 'Content-Security-Policy': `style-src 'nonce-${NONCE}'; script-src 'self'` },
        body: strictPage,
      }),
    );
    await open(page, '/strict');
    return violations;
  }

  test('tide’s bars stay out of step, with no policy violations', async ({ page }) => {
    const violations = await openStrict(page);
    const delays = await page.evaluate((nonce) => {
      const TL = (window as any).TL;
      const el = document.getElementById('scratch')!;
      TL.mount(el, { type: 'tide', size: 64, nonce });
      return [...el.querySelectorAll('.mulling-tide i')].map((i) => getComputedStyle(i).animationDelay);
    }, NONCE);
    expect(new Set(delays).size).toBe(5);
    expect(violations).toEqual([]);
  });

  test('<mulling-status nonce> and later mounts keep working when the style tag is replaced', async ({ page }) => {
    const violations = await openStrict(page);
    const display = await page.evaluate(async (nonce) => {
      const TL = (window as any).TL;
      const s = document.getElementById('scratch')!;
      s.innerHTML = `<mulling-status nonce="${nonce}" type="orbit"></mulling-status>`;
      document.querySelector('style[data-mulling]')?.remove();
      const host = TL.mount(s.appendChild(document.createElement('div')), { type: 'orbit' }).element;
      await new Promise((r) => requestAnimationFrame(r));
      return getComputedStyle(host).display;
    }, NONCE);
    expect(display).toBe('inline-grid');
    expect(violations).toEqual([]);
  });
});

test('2. moving <mulling-status> keeps its animation and doesn’t announce again', async ({ page }) => {
  await open(page);
  const result = await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const s = document.getElementById('scratch')!;
    const a = s.appendChild(document.createElement('div'));
    const b = s.appendChild(document.createElement('div'));
    const el = document.createElement('mulling-status');
    el.setAttribute('state', 'thinking');
    a.appendChild(el);
    await sleep(500);
    const region = document.querySelector('[data-mulling-announcer]')!;
    let writes = 0;
    new MutationObserver(() => writes++).observe(region, { childList: true, characterData: true, subtree: true });
    const host = el.shadowRoot!.querySelector('.mulling-host');
    const t0 = Number(el.shadowRoot!.getAnimations()[0]?.currentTime ?? 0);
    b.appendChild(el);
    await sleep(500);
    const t1 = Number(el.shadowRoot!.getAnimations()[0]?.currentTime ?? 0);
    return { same: el.shadowRoot!.querySelector('.mulling-host') === host, writes, continued: t1 > t0 };
  });
  expect(result).toEqual({ same: true, writes: 0, continued: true });
});

test.describe('3. page swaps', () => {
  test('a replaced <body> is still watched for theme changes', async ({ page }) => {
    await open(page);
    const changed = await page.evaluate(async () => {
      const TL = (window as any).TL;
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      TL.mount(document.getElementById('scratch')!, { type: 'breath' }); // the watchers start with the first loader
      const body = document.createElement('body');
      body.dataset.ready = 'true';
      document.body.replaceWith(body); // what Turbo and similar tools do
      await sleep(50);
      const el = body.appendChild(document.createElement('div'));
      TL.mount(el, { type: 'coil', size: 64, time: 0.5 }); // frozen, so only a color change alters pixels
      const canvas = el.querySelector('canvas')!;
      const before = canvas.toDataURL();
      body.classList.add('alt'); // changes the text color
      await sleep(100);
      return canvas.toDataURL() !== before;
    });
    expect(changed).toBe(true);
  });

  test('a loader mounted into a detached element gets styles when moved into a shadow root', async ({ page }) => {
    await open(page);
    const display = await page.evaluate(async () => {
      const TL = (window as any).TL;
      const div = document.createElement('div');
      const host = TL.mount(div, { type: 'orbit' }).element;
      const shadow = document.getElementById('scratch')!.attachShadow({ mode: 'open' });
      shadow.appendChild(div);
      for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
      return getComputedStyle(host).display;
    });
    expect(display).toBe('inline-grid');
  });
});

test('4. the reduced-motion fade never drops below 80% opacity', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  const faintest = await page.evaluate(() => {
    const TL = (window as any).TL;
    const el = document.getElementById('scratch')!;
    TL.mount(el, { type: 'orbit', size: 64 });
    let min = 1;
    const a = el.getAnimations({ subtree: true }).find((x) => (x as CSSAnimation).animationName === 'mulling-calm')!;
    a.pause();
    for (let t = 0; t <= 2600; t += 100) {
      a.currentTime = t;
      min = Math.min(min, Number(getComputedStyle((a.effect as KeyframeEffect).target as Element).opacity));
    }
    return min;
  });
  expect(faintest).toBeGreaterThanOrEqual(0.8);
});

test.describe('5. paths that had no tests', () => {
  test('refresh() re-reads an inherited color for canvas loaders', async ({ page }) => {
    await open(page);
    const changed = await page.evaluate(() => {
      const TL = (window as any).TL;
      const el = document.getElementById('scratch')!;
      const handle = TL.mount(el, { type: 'coil', size: 64, time: 0.5 });
      const canvas = el.querySelector('canvas')!;
      const before = canvas.toDataURL();
      el.style.color = '#e03131'; // a change no watcher can see
      handle.refresh();
      return canvas.toDataURL() !== before;
    });
    expect(changed).toBe(true);
  });

  test('loaders render inside a same-origin iframe', async ({ page }) => {
    await open(page);
    const result = await page.evaluate(async () => {
      const TL = (window as any).TL;
      const frame = document.getElementById('scratch')!.appendChild(document.createElement('iframe'));
      await new Promise((r) => setTimeout(r, 50));
      const doc = frame.contentDocument!;
      const a = TL.mount(doc.body.appendChild(doc.createElement('div')), { type: 'orbit' }).element;
      const b = doc.body.appendChild(doc.createElement('div'));
      TL.mount(b, { type: 'coil', size: 32, time: 0.5 });
      const px = b.querySelector('canvas')!.getContext('2d')!.getImageData(0, 0, 64, 64).data;
      return { display: frame.contentWindow!.getComputedStyle(a).display, inked: px.some((v, i) => i % 4 === 3 && v > 0) };
    });
    expect(result).toEqual({ display: 'inline-grid', inked: true });
  });
});
