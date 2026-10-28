// Build a separate static QA page. Never bundles the application entry or .env.
import { createRequire } from 'node:module';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const frontend = resolve(root, 'frontend');
// Tailwind's existing content/config paths are relative to the frontend cwd.
process.chdir(frontend);
const require = createRequire(resolve(frontend, 'package.json'));
const { build } = await import(pathToFileURL(require.resolve('vite')).href);
const react = (await import(pathToFileURL(require.resolve('@vitejs/plugin-react')).href)).default;
const outDir = resolve(root, 'output/playwright/spec131-phone-qa');
const emptyEnv = mkdtempSync(resolve(tmpdir(), 'spec131-empty-env-'));
await build({ configFile: false, root: frontend, publicDir: false, envDir: emptyEnv, envPrefix: 'SPEC131_PUBLIC_QA_',
  plugins: [react()], resolve: { alias: { '@': resolve(frontend, 'src') } }, worker: { format: 'es' },
  build: { outDir, emptyOutDir: false, rolldownOptions: { input: resolve(frontend, 'e2e/phone-scan/index.html') } },
});
mkdirSync(resolve(outDir, 'vendor/opencv'), { recursive: true });
cpSync(resolve(frontend, 'public/vendor/opencv/4.13.0-csp1'), resolve(outDir, 'vendor/opencv/4.13.0-csp1'), { recursive: true });
// A minimal root entry; all sources are fixed, local compiled assets.
const html = readFileSync(resolve(outDir, 'e2e/phone-scan/index.html'), 'utf8');
writeFileSync(resolve(outDir, 'index.html'), html);
writeFileSync(resolve(outDir, 'qa-only.json'), JSON.stringify({ schema: 1, purpose: 'spec131-phone-qa', noApi: true }));
console.log('Standalone phone QA built; no listener, deployment or production connection created.');
