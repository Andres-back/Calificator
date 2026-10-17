import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('102 camera permissions in shipped configuration', () => {
  it('allows same-origin camera without audio in Docker and alternate HTML configuration', () => {
    const dockerfile = readFileSync('Dockerfile', 'utf8');
    expect(dockerfile).toContain('COPY nginx/templates/default.conf.template');
    const docker = readFileSync('../nginx/templates/default.conf.template', 'utf8');
    const alternate = readFileSync('nginx.conf', 'utf8');
    for (const source of [docker, alternate]) {
      const policies = [...source.matchAll(/add_header Permissions-Policy "([^"]+)"/g)];
      expect(policies.length).toBeGreaterThanOrEqual(2);
      policies.forEach((match) => {
        expect(match[1]).toContain('camera=(self)');
        expect(match[1]).toContain('microphone=()');
        expect(match[1]).toContain('geolocation=()');
      });
    }
  });
});
