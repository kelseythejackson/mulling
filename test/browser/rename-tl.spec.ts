import { expect, test } from '@playwright/test';

// Old public names (--tl-*, tl-a) keep working until 2.0, in real CSS; the new ones win when both are set.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-ready]');
});

test('a custom loader written with --tl-c and tl-a still gets the color and the calm version', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { use, mount } = (window as any).TL as typeof import('../../src/core');
    const def = { name: 'Old', tech: 'css' as const, description: '', reducedMotion: '', base: 1 };
    use({
      ...def,
      type: 'oldstyle',
      html: '<i class="dot tl-a"></i>',
      css: '.dot{display:block;width:10px;height:10px;background:var(--tl-c);animation:x var(--tl-dur) infinite}',
    });
    use({
      ...def,
      type: 'newstyle',
      html: '<i class="dot2 mulling-animate"></i>',
      css: '.dot2{display:block;width:10px;height:10px;background:var(--mulling-color);animation:x var(--mulling-duration) infinite}',
    });
    const out: Record<string, string[]> = {};
    for (const type of ['oldstyle', 'newstyle']) {
      for (const reducedMotion of [false, true]) {
        const el = document.body.appendChild(document.createElement('div'));
        mount(el, { type, color: 'rgb(10, 20, 30)', reducedMotion, speed: 2 });
        await new Promise((r) => setTimeout(r, 50));
        const dot = el.querySelector('i')!;
        const s = getComputedStyle(dot);
        out[`${type}-${reducedMotion}`] = [s.backgroundColor, s.animationName, s.animationDuration];
      }
    }
    return out;
  });
  for (const type of ['oldstyle', 'newstyle']) {
    expect(result[`${type}-false`][0], type).toBe('rgb(10, 20, 30)');
    expect(result[`${type}-false`][2], type).toBe('0.5s'); // base 1s at speed 2
    expect(result[`${type}-true`][1], `${type} calm`).not.toBe(result[`${type}-false`][1]);
  }
});

test('--tl-done on the page still colors the check mark; --mulling-done wins over it', async ({ page }) => {
  const strokes = await page.evaluate(async () => {
    const { mount } = (window as any).TL as typeof import('../../src/core');
    const read = async (style: string) => {
      const el = document.body.appendChild(document.createElement('div'));
      el.setAttribute('style', style);
      mount(el, { state: 'done', reducedMotion: true });
      await new Promise((r) => setTimeout(r, 50));
      return getComputedStyle(el.querySelector('svg path')!).stroke;
    };
    return [await read('--tl-done: rgb(1, 2, 3)'), await read('--tl-done: rgb(1, 2, 3); --mulling-done: rgb(4, 5, 6)')];
  });
  expect(strokes).toEqual(['rgb(1, 2, 3)', 'rgb(4, 5, 6)']);
});
