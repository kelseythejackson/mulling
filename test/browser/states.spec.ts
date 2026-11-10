import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-ready]');
});

test('changing state cross-fades: both loaders overlap, then the old one is gone', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const TL = (window as any).TL;
    const el = document.getElementById('scratch')!;
    const h = TL.mount(el, { state: 'thinking', size: 64 });
    await new Promise((r) => setTimeout(r, 100));
    h.update({ state: 'searching' });
    await new Promise((r) => setTimeout(r, 100));
    const mid = [...el.querySelectorAll('.mulling-layer')].map((l) => Number(getComputedStyle(l).opacity));
    await new Promise((r) => setTimeout(r, 300));
    return { mid, after: el.querySelectorAll('.mulling-layer').length, canvasesAnimating: TL.getStats().canvasLoaders };
  });
  expect(result.mid.length).toBe(2);
  // Halfway through, the old layer is fading out and the new one fading in.
  expect(result.mid[0]).toBeGreaterThan(0.05);
  expect(result.mid[0]).toBeLessThan(0.95);
  expect(result.mid[1]).toBeGreaterThan(0.05);
  expect(result.after).toBe(1);
  expect(result.canvasesAnimating).toBe(1);
});

test('the old canvas loader leaves the animation loop after fading out', async ({ page }) => {
  const counts = await page.evaluate(async () => {
    const TL = (window as any).TL;
    const h = TL.mount(document.getElementById('scratch'), { state: 'searching', size: 64 });
    await new Promise((r) => setTimeout(r, 50));
    const during = TL.getStats().canvasLoaders;
    h.update({ state: 'done' });
    await new Promise((r) => setTimeout(r, 400));
    return { during, after: TL.getStats().canvasLoaders };
  });
  expect(counts).toEqual({ during: 1, after: 0 });
});

test('the done mark draws itself on, then holds still', async ({ page }) => {
  const offsets = await page.evaluate(async () => {
    const TL = (window as any).TL;
    const el = document.getElementById('scratch')!;
    TL.mount(el, { state: 'done', size: 64 });
    const stroke = () => Number(getComputedStyle(el.querySelector('.mulling-done .mulling-stroke')!).strokeDashoffset.replace('px', ''));
    const start = stroke();
    await new Promise((r) => setTimeout(r, 900));
    const anims = el.querySelector('.mulling-host')!.getAnimations({ subtree: true });
    return { start, end: stroke(), stillRunning: anims.filter((a) => a.playState === 'running').length };
  });
  expect(offsets.start).toBeGreaterThan(0.5);
  expect(offsets.end).toBe(0);
  expect(offsets.stillRunning).toBe(0);
});

test('with reduced motion, endings appear fully drawn', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const offset = await page.evaluate(() => {
    const el = document.getElementById('scratch')!;
    (window as any).TL.mount(el, { state: 'error', size: 64 });
    return getComputedStyle(el.querySelector('.mulling-error .mulling-stroke')!).strokeDashoffset;
  });
  expect(offset).toMatch(/^0(px)?$/);
});

test('the shared announcer speaks state changes once, in one live region', async ({ page }) => {
  const spoken = await page.evaluate(async () => {
    const TL = (window as any).TL;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const h = TL.mount(document.getElementById('scratch'), { state: 'thinking', announce: 'polite' });
    await wait(350);
    const region = document.querySelector('[data-mulling-announcer]')!;
    const first = region.textContent;
    h.update({ state: 'searching' });
    h.update({ state: 'writing' });
    await wait(350);
    const second = region.textContent;
    h.update({ state: 'done', labels: { done: 'Answer ready' } });
    await wait(350);
    return { first, second, third: region.textContent, regions: document.querySelectorAll('[data-mulling-announcer]').length };
  });
  expect(spoken).toEqual({ first: 'Thinking', second: 'Writing', third: 'Answer ready', regions: 1 });
});
