import { expect, test } from '@playwright/test';

// Every loader at 20px and 64px, frozen with the `time` option, in each display mode people actually use.
const modes = [
  { name: 'light', media: { colorScheme: 'light' as const } },
  { name: 'dark', media: { colorScheme: 'dark' as const } },
  { name: 'reduced-motion', media: { colorScheme: 'light' as const, reducedMotion: 'reduce' as const } },
  { name: 'forced-colors', media: { colorScheme: 'light' as const, forcedColors: 'active' as const } },
];

for (const mode of modes) {
  test(`all loaders look right in ${mode.name} mode`, async ({ page }) => {
    await page.emulateMedia(mode.media);
    await page.goto('/?grid&time=1.2');
    await page.waitForSelector('body[data-ready]');
    // The CSS loaders are paused by `time`, so "allow" keeps them exactly where they were frozen.
    await expect(page.locator('#grid')).toHaveScreenshot(`grid-${mode.name}.png`, { animations: 'allow', scale: 'device' });
  });
}

for (const mode of modes) {
  test(`every AI state looks right in ${mode.name} mode`, async ({ page }) => {
    await page.emulateMedia(mode.media);
    await page.goto('/?states&time=1.2');
    await page.waitForSelector('body[data-ready]');
    await expect(page.locator('#grid')).toHaveScreenshot(`states-${mode.name}.png`, { animations: 'allow', scale: 'device' });
  });
}
