import { defineConfig, devices } from '@playwright/test';

/**
 * Visual regression tests — placeholder.
 * Will use Percy, Chromatic, or Playwright's native screenshot diffing.
 */
export default defineConfig({
  testDir: './',
  testMatch: '**/*.visual.spec.ts',
  timeout: 30_000,
  retries: 0,
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:4175',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
