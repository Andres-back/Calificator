import { expect, it } from 'vitest';
import { rosterImportError } from './rosterImportErrors';

it('distinguishes service failure from missing names', () => {
  expect(rosterImportError('service_unavailable').title).toContain('servicio');
  expect(rosterImportError('service_unavailable').detail).not.toContain('buena luz');
  expect(rosterImportError('no_names').detail).toContain('buena luz');
  expect(rosterImportError('invalid_response').title).toContain('no se completó');
});

it.each([undefined, null, '__proto__', 'constructor', '<script>private-provider-body</script>'])('uses neutral fixed text for legacy or unknown code %s', (code) => {
  expect(rosterImportError(code).title).toBe('No pudimos completar la lectura de la lista.');
  expect(rosterImportError(code).detail).not.toContain('private-provider');
});
