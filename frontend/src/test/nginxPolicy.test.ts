import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('102 camera permissions in shipped configuration', () => {
  it('allows same-origin camera without audio in Docker and alternate HTML configuration', () => {
    const dockerfile = readFileSync('Dockerfile', 'utf8');
    expect(dockerfile).toContain('COPY nginx/templates/default.conf.template');
    const docker = readFileSync('../nginx/templates/default.conf.template', 'utf8');
    const alternate = readFileSync('nginx.conf', 'utf8');
    for (const source of [docker, alternate]) {
      // La consulta familiar y el Worker de preparación no capturan fotos.
      // Las páginas de la aplicación sí conservan la cámara (Spec 102).
      const privateStart = source.indexOf('location ~ ^/devolucion/?$ {');
      expect(privateStart).toBeGreaterThanOrEqual(0);
      const privateEnd = source.indexOf('\n    }', privateStart) + 6;
      const privatePage = source.slice(privateStart, privateEnd);
      expect(privatePage).toContain('Permissions-Policy "camera=(), microphone=(), geolocation=()"');
      const apiStart = source.indexOf('location ^~ /api/public/devolucion {');
      const apiEnd = source.indexOf('\n    }', apiStart) + 6;
      const privateApi = source.slice(apiStart, apiEnd);
      expect(privateApi).toContain('Permissions-Policy "camera=(), microphone=(), geolocation=()"');
      const workerStart = source.indexOf('location ~ ^/assets/evidenceScan\\.worker-');
      expect(workerStart).toBeGreaterThanOrEqual(0);
      const workerEnd = source.indexOf('\n    }', workerStart) + 6;
      const worker = source.slice(workerStart, workerEnd);
      expect(worker).toContain('Permissions-Policy "camera=(), microphone=(), geolocation=()"');
      const captureSurfaces = (source.slice(0, privateStart) + source.slice(privateEnd)).replace(privateApi, '').replace(worker, '');
      const policies = [...captureSurfaces.matchAll(/add_header Permissions-Policy "([^"]+)"/g)];
      expect(policies.length).toBeGreaterThanOrEqual(2);
      policies.forEach((match) => {
        expect(match[1]).toContain('camera=(self)');
        expect(match[1]).toContain('microphone=()');
        expect(match[1]).toContain('geolocation=()');
      });
    }
  });

  it('131 allows fixed WASM only in the scan Worker, never JS eval or page WASM', () => {
    for (const path of ['../nginx/templates/default.conf.template', 'nginx.conf']) {
      const source = readFileSync(path, 'utf8');
      const start = source.indexOf('location ~ ^/assets/evidenceScan\\.worker-');
      expect(start).toBeGreaterThanOrEqual(0);
      const end = source.indexOf('\n    }', start) + 6;
      const worker = source.slice(start, end);
      expect(worker).toContain("script-src 'self' 'wasm-unsafe-eval'");
      expect(worker).toContain('try_files $uri =404');
      expect(worker).not.toContain("'unsafe-eval'");
      const pages = source.slice(0, start) + source.slice(end);
      expect(pages).not.toContain("'wasm-unsafe-eval'");
      expect(pages).not.toContain("'unsafe-eval'");
    }
  });
});
