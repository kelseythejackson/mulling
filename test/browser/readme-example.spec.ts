import { expect, test } from '@playwright/test';

// Runs the canvas-loader example from the "Make your own loader" guide, so the docs can't drift from the code.
test('the README custom-loader example draws', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-ready]');
  const inked = await page.evaluate(async () => {
    const { use, mount } = (window as any).TL as typeof import('../../src/core');
    use({
      type: 'ripple',
      name: 'Ripple',
      tech: 'canvas',
      description: 'One ring growing from the center.',
      reducedMotion: 'A still ring that fades.',
      paint(ctx, size, seconds, color) {
        const r = (size / 2) * ((seconds * 0.8) % 1);
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 0.06;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      },
    });

    mount(document.getElementById('scratch')!, { type: 'ripple' });
    await new Promise((r) => setTimeout(r, 200));
    const c = document.querySelector('#scratch canvas') as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
  expect(inked).toBeGreaterThan(5);
});
