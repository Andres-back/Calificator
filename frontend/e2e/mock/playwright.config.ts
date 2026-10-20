import { defineConfig, devices } from '@playwright/test';

/**
 * Mock e2e tests — runs against a dev server with mocked API responses.
 * No real backend required. No secrets used.
 */
export default defineConfig({
  testDir: './',
  testMatch: '**/*.mock.spec.ts',
  timeout: 30_000,
  retries: 0,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', testMatch: '**/evaluation-visuals.mock.spec.ts', use: { ...devices['Desktop Safari'] } },
  ],
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
