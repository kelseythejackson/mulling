import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'test/browser',
  // One shared snapshot per test, not per OS: loaders contain no text, so rendering is stable across Linux machines.
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5180',
    // Set CHROME_PATH to use an installed Chrome instead of Playwright's own Chromium.
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  expect: {
    // An absolute pixel count, not a ratio: one 20px loader is well under 1% of a grid screenshot, so a ratio
    // would hide a broken small loader. A few pixels of slack absorbs anti-aliasing differences.
    toHaveScreenshot: { maxDiffPixels: 12, threshold: 0.05 },
  },
  // 2x pixel density: a 20px loader is only a few hundred pixels at 1x, too few for small regressions to show.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], deviceScaleFactor: 2 } }],
  webServer: {
    command: 'npx vite --config vite.fixture.config.ts',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env.CI,
  },
});
