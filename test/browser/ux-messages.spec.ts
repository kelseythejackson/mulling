import { expect, test } from '@playwright/test';

// UX audit M8, in a real browser: colors are checked with the browser's own CSS parser.
test('an invalid color warns; valid colors, including CSS variables, don’t', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
  await page.goto('/');
  await page.waitForSelector('body[data-ready]');
  await page.evaluate(() => {
    const { mount } = (window as any).TL as typeof import('../../src/core');
    for (const color of ['blurple', '#6366f1', 'currentColor', 'var(--brand)', 'rgb(99 102 241 / 0.8)', 'oklch(70% 0.1 250)'])
      mount(document.body.appendChild(document.createElement('div')), { color });
  });
  const colorWarnings = warnings.filter((w) => w.includes('color'));
  expect(colorWarnings).toHaveLength(1);
  expect(colorWarnings[0]).toMatch(/invalid color "blurple": use a CSS color/);
});
