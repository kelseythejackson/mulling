import { expect, test, type Page } from '@playwright/test';

// Regression tests for the 1.0 audit's top findings. Each one failed before its fix.

async function open(page: Page) {
  await page.goto('/');
  await page.waitForSelector('body[data-ready]');
}
const wait = (page: Page, ms: number) => page.waitForTimeout(ms);

test.describe('1. a failing loader is isolated', () => {
  test('a painter that throws does not stop other canvas loaders, now or later', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await open(page);
    const result = await page.evaluate(async () => {
      const TL = (window as any).TL;
      const s = document.getElementById('scratch')!;
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const box = () => s.appendChild(document.createElement('div'));
      const healthy = box();
      TL.mount(healthy, { type: 'coil', size: 64 });
      TL.use({
        type: 'boom',
        name: 'Boom',
        tech: 'canvas',
        description: '',
        reducedMotion: '',
        paint() {
          throw new Error('painter failed');
        },
      });
      TL.mount(box(), { type: 'boom', size: 64 });
      await sleep(150);
      const c = healthy.querySelector('canvas')!;
      const a = c.toDataURL();
      await sleep(300);
      const later = box();
      TL.mount(later, { type: 'pond', size: 64 });
      await sleep(300);
      const d = later.querySelector('canvas')!.getContext('2d')!.getImageData(0, 0, 128, 128).data;
      return { healthyStillMoving: a !== c.toDataURL(), laterInked: d.some((v, i) => i % 4 === 3 && v > 0) };
    });
    expect(result).toEqual({ healthyStillMoving: true, laterInked: true });
    expect(errors.filter((e) => e.includes('boom')).length).toBe(1); // reported once, naming the loader
  });

  test('loaders removed without destroy() stop costing frames, and the loop idles when nothing is visible', async ({ page }) => {
    await open(page);
    const result = await page.evaluate(async () => {
      const TL = (window as any).TL;
      const s = document.getElementById('scratch')!;
      for (let i = 0; i < 5; i++) TL.mount(s.appendChild(document.createElement('div')), { type: 'murmur', size: 64 });
      await new Promise((r) => setTimeout(r, 200));
      s.innerHTML = ''; // removed without destroy()
      let frames = 0;
      const orig = window.requestAnimationFrame;
      window.requestAnimationFrame = (cb) => {
        frames++;
        return orig(cb);
      };
      await new Promise((r) => setTimeout(r, 500));
      window.requestAnimationFrame = orig;
      return { framesRequestedIn500ms: frames, drawing: TL.getStats().drawing };
    });
    expect(result.drawing).toBe(0);
    expect(result.framesRequestedIn500ms).toBeLessThan(3);
  });

  test('a loader that comes back into view after the loop idled starts animating again', async ({ page }) => {
    await open(page);
    const moving = await page.evaluate(async () => {
      const TL = (window as any).TL;
      const far = document.createElement('div');
      far.style.cssText = 'position:absolute;top:5000px';
      document.body.appendChild(far);
      TL.mount(far, { type: 'coil', size: 64 });
      await new Promise((r) => setTimeout(r, 300));
      far.style.top = '0px';
      await new Promise((r) => setTimeout(r, 200));
      const c = far.querySelector('canvas')!;
      const a = c.toDataURL();
      await new Promise((r) => setTimeout(r, 200));
      return a !== c.toDataURL();
    });
    expect(moving).toBe(true);
  });
});

test.describe('2. options are validated', () => {
  test('bad values fall back to defaults with a warning instead of breaking the loader', async ({ page }) => {
    const warnings: string[] = [];
    const errors: string[] = [];
    page.on('console', (m) => (m.type() === 'warning' ? warnings : m.type() === 'error' ? errors : []).push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page);
    const r = await page.evaluate(async () => {
      const TL = (window as any).TL;
      const s = document.getElementById('scratch')!;
      const box = () => s.appendChild(document.createElement('div'));
      const nan = box();
      const h = TL.mount(nan, { type: 'pond', size: 64 });
      h.update({ speed: Number.NaN });
      await new Promise((r) => setTimeout(r, 150));
      h.update({ speed: 1 });
      await new Promise((r) => setTimeout(r, 200));
      const c = nan.querySelector('canvas')!;
      const inked = c
        .getContext('2d')!
        .getImageData(0, 0, c.width, c.height)
        .data.some((v, i) => i % 4 === 3 && v > 0);
      const inf = TL.mount(box(), { type: 'orbit', time: Number.POSITIVE_INFINITY });
      const neg = TL.mount(box(), { type: 'coil', size: -10 });
      const huge = TL.mount(box(), { type: 'coil', size: 1e5 });
      const st = TL.mount(box(), { state: 'pondering' });
      const el = document.createElement('mulling-status');
      el.setAttribute('time', 'Infinity');
      s.appendChild(el);
      return {
        inked,
        infTime: inf.element.querySelector('.mulling-orbit') !== null,
        negSize: neg.element.style.getPropertyValue('--mulling-size'),
        hugeCanvas: (huge.element.querySelector('canvas') as HTMLCanvasElement).width,
        unknownStateLabel: st.element.getAttribute('aria-label'),
      };
    });
    expect(r.inked).toBe(true);
    expect(r.infTime).toBe(true);
    expect(r.negSize).toBe('20px');
    expect(r.hugeCanvas).toBeLessThanOrEqual(1024 * 2);
    expect(r.unknownStateLabel).toBe('Loading');
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes('speed'))).toBe(true);
  });

  test('update() after destroy() does nothing', async ({ page }) => {
    await open(page);
    const r = await page.evaluate(() => {
      const TL = (window as any).TL;
      const h = TL.mount(document.getElementById('scratch'), { type: 'coil', size: 64 });
      h.destroy();
      h.update({ state: 'searching' });
      return TL.getStats().canvasLoaders;
    });
    expect(r).toBe(0);
  });
});

test.describe('3. canvas colors come from the page', () => {
  test('var() colors work on canvas loaders', async ({ page }) => {
    await open(page);
    const px = await page.evaluate(() => {
      document.body.style.setProperty('--brand', 'rgb(255, 0, 0)');
      const el = document.getElementById('scratch')!;
      (window as any).TL.mount(el, { type: 'pond', size: 64, time: 1, color: 'var(--brand)' });
      const c = el.querySelector('canvas')!;
      return Array.from(c.getContext('2d')!.getImageData(c.width / 2, c.height / 2, 1, 1).data);
    });
    expect(px.slice(0, 3)).toEqual([255, 0, 0]);
  });

  test('blink picks dark eyes on a light oklch body', async ({ page }) => {
    await open(page);
    const eye = await page.evaluate(() => {
      const el = document.getElementById('scratch')!;
      (window as any).TL.mount(el, { type: 'blink', size: 64, color: 'oklch(0.95 0.15 100)' });
      return getComputedStyle(el.querySelector('.mulling-blink i')!).backgroundColor;
    });
    expect(eye).toBe('rgb(27, 31, 46)');
  });

  test('a color transition on <body> is picked up when it ends', async ({ page }) => {
    await open(page);
    const px = await page.evaluate(async () => {
      document.body.style.transition = 'color .2s';
      const el = document.getElementById('scratch')!;
      (window as any).TL.mount(el, { type: 'pond', size: 64, time: 1 });
      document.body.classList.add('alt');
      await new Promise((r) => setTimeout(r, 450));
      const c = el.querySelector('canvas')!;
      return Array.from(c.getContext('2d')!.getImageData(c.width / 2, c.height / 2, 1, 1).data);
    });
    expect(px.slice(0, 3)).toEqual([0, 0, 255]);
  });
});

test.describe('4. screen readers', () => {
  test('inside an open modal dialog, announcements go to a region inside the dialog', async ({ page }) => {
    await open(page);
    const r = await page.evaluate(async () => {
      const d = document.createElement('dialog');
      document.body.appendChild(d);
      d.showModal();
      (window as any).TL.mount(d.appendChild(document.createElement('div')), { state: 'searching' });
      await new Promise((r) => setTimeout(r, 400));
      const region = d.querySelector('[data-mulling-announcer]');
      return { inDialog: region !== null, text: region?.textContent };
    });
    expect(r).toEqual({ inDialog: true, text: 'Searching' });
    const snapshot = await page.accessibility.snapshot({ interestingOnly: true });
    expect(JSON.stringify(snapshot)).toContain('Searching');
  });

  test('the live region exists before its first message is written', async ({ page }) => {
    await open(page);
    const r = await page.evaluate(async () => {
      (window as any).TL.mount(document.getElementById('scratch'), { state: 'thinking' });
      const region = document.querySelector('[data-mulling-announcer]');
      const emptyAtFirst = region !== null && region.textContent === '';
      await new Promise((r) => setTimeout(r, 400));
      return { emptyAtFirst, later: region?.textContent };
    });
    expect(r).toEqual({ emptyAtFirst: true, later: 'Thinking' });
  });

  test('an ending is still spoken when the loader is removed right after', async ({ page }) => {
    await open(page);
    const text = await page.evaluate(async () => {
      const h = (window as any).TL.mount(document.getElementById('scratch'), { state: 'writing' });
      await new Promise((r) => setTimeout(r, 400));
      h.update({ state: 'done', labels: { done: 'Answer ready' } });
      h.destroy();
      await new Promise((r) => setTimeout(r, 400));
      return document.querySelector('[data-mulling-announcer]')!.textContent;
    });
    expect(text).toBe('Answer ready');
  });

  test("announce: 'off' puts the words inside the status element, so changes are spoken", async ({ page }) => {
    await open(page);
    const r = await page.evaluate(() => {
      const h = (window as any).TL.mount(document.getElementById('scratch'), { state: 'thinking', announce: 'off' });
      h.update({ state: 'searching' });
      return { role: h.element.getAttribute('role'), text: h.element.textContent, hasAriaLabel: h.element.hasAttribute('aria-label') };
    });
    expect(r).toEqual({ role: 'status', text: 'Searching', hasAriaLabel: false });
  });

  test('switching to decorative cancels a queued announcement', async ({ page }) => {
    await open(page);
    const text = await page.evaluate(async () => {
      const h = (window as any).TL.mount(document.getElementById('scratch'), { state: 'thinking' });
      h.update({ label: null });
      await new Promise((r) => setTimeout(r, 400));
      return document.querySelector('[data-mulling-announcer]')?.textContent ?? '';
    });
    expect(text).toBe('');
  });

  test('paused stops CSS and canvas animation, and resuming restarts it', async ({ page }) => {
    await open(page);
    const r = await page.evaluate(async () => {
      const TL = (window as any).TL;
      const s = document.getElementById('scratch')!;
      const css = TL.mount(s.appendChild(document.createElement('div')), { type: 'orbit', size: 64, paused: true });
      const cv = s.appendChild(document.createElement('div'));
      const canvas = TL.mount(cv, { type: 'coil', size: 64, paused: true });
      await new Promise((r) => setTimeout(r, 150));
      const states = css.element.getAnimations({ subtree: true }).map((a: Animation) => a.playState);
      const c = cv.querySelector('canvas')!;
      const a = c.toDataURL();
      await new Promise((r) => setTimeout(r, 200));
      const stillPaused = a === c.toDataURL();
      canvas.update({ paused: false });
      await new Promise((r) => setTimeout(r, 200));
      return { cssPaused: states.length > 0 && states.every((x: string) => x === 'paused'), stillPaused, resumed: a !== c.toDataURL() };
    });
    expect(r).toEqual({ cssPaused: true, stillPaused: true, resumed: true });
  });
});
