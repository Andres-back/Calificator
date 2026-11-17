import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sources = [
  'src/modules/auth/LandingPage.tsx',
  'src/modules/dashboard/DashboardPage.tsx',
  'src/modules/herramientas/GeneratePage.tsx',
];

describe('198 ilustraciones de la interfaz', () => {
  it('toda ilustración usada existe en public y pesa poco', () => {
    const used = new Set<string>();
    for (const source of sources) {
      const text = readFileSync(resolve(root, source), 'utf8');
      for (const match of text.matchAll(/\/branding\/[\w/-]+\.webp/g)) used.add(match[0]);
    }

    for (const expected of [
      '/branding/feature-evidence.webp',
      '/branding/feature-teacher-decides.webp',
      '/branding/feature-learning.webp',
      '/branding/community-teachers.webp',
      '/branding/teacher-hero.webp',
      '/branding/xali-working.webp',
      '/branding/semantic-icons/intent-all.webp',
      '/branding/semantic-icons/intent-evaluate.webp',
      '/branding/semantic-icons/intent-practice.webp',
      '/branding/semantic-icons/intent-play.webp',
      '/branding/semantic-icons/intent-explain.webp',
    ]) expect(used).toContain(expected);

    for (const path of used) {
      const file = resolve(root, 'public', path.slice(1));
      expect(existsSync(file), `${path} no existe en public`).toBe(true);
      expect(statSync(file).size, `${path} pesa demasiado`).toBeLessThan(90_000);
    }
  });
});
