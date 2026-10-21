import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('102 camera permissions in shipped configuration', () => {
  it('allows same-origin camera without audio in Docker and alternate HTML configuration', () => {
    const dockerfile = readFileSync('Dockerfile', 'utf8');
    expect(dockerfile).toContain('COPY nginx/templates/default.conf.template');
    const docker = readFileSync('../nginx/templates/default.conf.template', 'utf8');
    const alternate = readFileSync('nginx.conf', 'utf8');
    for (const source of [docker, alternate]) {
      // La consulta familiar no captura fotos. El resto de la aplicación
      // conserva cámara propia para calificar/digitalizar (Spec 102).
      const privateStart = source.indexOf('location ~ ^/devolucion/?$ {');
      expect(privateStart).toBeGreaterThanOrEqual(0);
      const privateEnd = source.indexOf('\n    }', privateStart) + 6;
      const privatePage = source.slice(privateStart, privateEnd);
      expect(privatePage).toContain('Permissions-Policy "camera=(), microphone=(), geolocation=()"');
      const apiStart = source.indexOf('location ^~ /api/public/devolucion {');
      const apiEnd = source.indexOf('\n    }', apiStart) + 6;
      const privateApi = source.slice(apiStart, apiEnd);
      expect(privateApi).toContain('Permissions-Policy "camera=(), microphone=(), geolocation=()"');
      const captureSurfaces = (source.slice(0, privateStart) + source.slice(privateEnd)).replace(privateApi, '');
      const policies = [...captureSurfaces.matchAll(/add_header Permissions-Policy "([^"]+)"/g)];
      expect(policies.length).toBeGreaterThanOrEqual(2);
      policies.forEach((match) => {
        expect(match[1]).toContain('camera=(self)');
        expect(match[1]).toContain('microphone=()');
        expect(match[1]).toContain('geolocation=()');
      });
    }
  });
});
