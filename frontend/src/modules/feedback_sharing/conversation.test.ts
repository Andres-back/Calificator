import { afterEach, describe, expect, it, vi } from 'vitest';
import { openConversation } from './conversation';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
describe('continuidad opaca', () => {
  it('recupera solo un identificador por ámbito, no mensajes ni tokens', () => {
    const first = openConversation('a'.repeat(64))!;
    expect(openConversation(first.scope)).toEqual(first);
    expect(first.persistent).toBe(true);
    expect(openConversation('b'.repeat(64))?.id).not.toBe(first.id);
    expect(Object.values(localStorage)).toHaveLength(2);
    expect(Object.values(localStorage).every(value => /^[a-f0-9-]{36}$/.test(value))).toBe(true);
    expect(openConversation('enlace-privado')).toBeNull();
  });
  it('reemplaza metadata corrupta y ofrece modo temporal si está bloqueado', () => {
    localStorage.setItem('xcalificator:feedback-conversation:v1:' + 'a'.repeat(64), 'corrupto');
    expect(openConversation('a'.repeat(64))?.id).not.toBe('corrupto');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(openConversation('a'.repeat(64))?.persistent).toBe(false);
  });
});
