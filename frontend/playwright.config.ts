import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/accessibility/**', '**/mock/**', '**/visual/**'],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  retries: 0,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // WebKit covers this mobile increment without doubling unrelated legacy suites.
    { name: 'webkit', testMatch: '**/p2-responsive.spec.ts', grep: /inicio docente móvil|boletín docente en mosaico/, use: { ...devices['Desktop Safari'] } },
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
