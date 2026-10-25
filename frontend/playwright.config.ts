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
    { name: 'webkit-feedback', testMatch: ['**/feedback-chat-history.spec.ts', '**/feedback-delivery.spec.ts'], grep: /126/, use: { ...devices['Desktop Safari'] } },
    // WebKit covers this mobile increment without doubling unrelated legacy suites.
    { name: 'webkit', testMatch: ['**/p2-responsive.spec.ts', '**/evaluation-ai-wizard.spec.ts', '**/camera-capture.spec.ts', '**/evaluation-preview.spec.ts', '**/admin-icons.spec.ts', '**/xali-teacher-visual.spec.ts', '**/materia-queue-mobile.spec.ts', '**/resources-responsive.spec.ts', '**/admin-compatible-api.spec.ts', '**/feedback-delivery.spec.ts', '**/feedback-delivery-batch.spec.ts', '**/motif-library.spec.ts', '**/motif-editors.spec.ts'], grep: /inicio docente móvil|boletín docente en mosaico|096.*(?:360|390)px|097|102|103|104|105|106|116|120|122|123|125|preview y descargas|lista global tiene visualización/, use: { ...devices['Desktop Safari'] } },
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
