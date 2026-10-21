import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IndividualLinks } from './IndividualLinks';

describe('entrega separada, sin agrupar por apellido', () => {
  it('copia únicamente el enlace del alumno elegido', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<IndividualLinks links={[{ id: 'a', estudiante: 'Ana Pérez', url: 'https://example.test/devolucion#a' }, { id: 'b', estudiante: 'Luis Pérez', url: 'https://example.test/devolucion#b' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace de Luis Pérez' }));
    expect(writeText).toHaveBeenCalledExactlyOnceWith('https://example.test/devolucion#b');
    expect(await screen.findByRole('status')).toHaveTextContent('Luis Pérez');
    expect(screen.queryByRole('button', { name: /copiar todos/i })).toBeNull();
  });
});
