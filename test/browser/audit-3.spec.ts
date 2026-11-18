import { expect, test, type Page } from '@playwright/test';

// Regression tests for the third audit's bugs that need a real browser. Each one failed before its fix.

async function open(page: Page) {
  await page.goto('/');
  await page.waitForSelector('body[data-ready]');
}

test('B1. paused stops the reduced-motion fade too (WCAG 2.2.2)', async ({ page }) => {
  await open(page);
  const states = await page.evaluate(async () => {
    const TL = (window as any).TL;
    const s = document.getElementById('scratch')!;
    const h = TL.mount(s.appendChild(document.createElement('div')), { type: 'breath', size: 64, reducedMotion: true, paused: true });
    await new Promise((r) => setTimeout(r, 100));
    return h.element.getAnimations({ subtree: true }).map((a: Animation) => a.playState);
  });
  expect(states.length).toBeGreaterThan(0);
  expect(states.every((x: string) => x === 'paused')).toBe(true);
});

test('B7. a frozen canvas loader respects speed, like CSS loaders do', async ({ page }) => {
  await open(page);
  const same = await page.evaluate(async () => {
    const TL = (window as any).TL;
    const s = document.getElementById('scratch')!;
    const draw = (opts: object) => {
      const box = s.appendChild(document.createElement('div'));
      TL.mount(box, { type: 'coil', size: 64, ...opts });
      return box.querySelector('canvas')!.toDataURL();
    };
    return draw({ time: 1, speed: 2 }) === draw({ time: 2, speed: 1 });
  });
  expect(same).toBe(true);
});
