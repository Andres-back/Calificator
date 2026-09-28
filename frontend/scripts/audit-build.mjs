import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const failures = [];
const indexPath = resolve(dist, 'index.html');

if (!existsSync(indexPath)) {
  failures.push('Falta dist/index.html. Ejecuta npm run build antes de esta auditoría.');
} else {
  const html = readFileSync(indexPath, 'utf8');
  const preloadHrefs = [...html.matchAll(/<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+)/g)]
    .map((match) => match[1]);
  const forbidden = preloadHrefs.filter((href) => /\/(charts|markdown|document-export)-/.test(href));
  if (forbidden.length) failures.push(`La entrada pública precarga chunks internos: ${forbidden.join(', ')}`);
}

const requiredAssets = [
  ['logo-full.webp', 80_000],
  ['pattern-hero.webp', 180_000],
  ['hero-login.webp', 220_000],
  ['xali-hello.webp', 180_000],
  ['xali-celebrating.webp', 180_000],
  ['xali-studying.webp', 180_000],
];

for (const [name, maxBytes] of requiredAssets) {
  const asset = resolve(dist, 'branding', name);
  if (!existsSync(asset)) {
    failures.push(`Falta el recurso optimizado branding/${name}`);
  } else if (statSync(asset).size > maxBytes) {
    failures.push(`branding/${name} pesa ${statSync(asset).size} bytes; máximo esperado ${maxBytes}`);
  }
}

const stableViews = [
  'src/modules/evaluaciones/EvaluacionesPage.tsx',
  'src/modules/evaluaciones/ResolverEvaluacionPage.tsx',
  'src/modules/materias/MateriaEvaluaciones.tsx',
  'src/modules/materias/MateriaBoletin.tsx',
  'src/modules/calificaciones/BoletinPage.tsx',
  'src/modules/xali/XaliPage.tsx',
];

for (const relativePath of stableViews) {
  const source = readFileSync(resolve(root, relativePath), 'utf8');
  if (/refetchInterval:\s*(?:isStudent|isLearnerView|10_000)/.test(source)) {
    failures.push(`${relativePath} conserva polling incondicional en una vista estable`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Build público auditado: precargas y recursos visuales dentro del presupuesto.');
}
