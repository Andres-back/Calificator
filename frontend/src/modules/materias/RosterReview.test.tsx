import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RosterReview } from './RosterReview';
import type { RosterRow } from './rosterImportApi';

const row = (id: string, name: string): RosterRow => ({
  id, orden: Number(id), nombre_detectado: name, nombre_revisado: name,
  confianza: 1, requiere_revision: false, duplicado_confirmado: false,
  decision: 'crear', estudiante_existente_id: null, advertencias: [],
});

describe('RosterReview', () => {
  it('requires an explicit decision for identical names', async () => {
    const onChange = vi.fn();
    render(<RosterReview rows={[row('1', 'Ana Pérez'), row('2', 'Ana Perez')]} existing={[]} onChange={onChange} />);
    const checkboxes = screen.getAllByRole('checkbox', { name: /persona distinta/i });
    expect(checkboxes).toHaveLength(2);
    await userEvent.click(checkboxes[0]);
    expect(onChange.mock.calls[0][0][0].duplicado_confirmado).toBe(true);
  });

  it('allows correcting, excluding and adding rows before creation', async () => {
    const onChange = vi.fn();
    render(<RosterReview rows={[row('1', 'Andr?')]} existing={[]} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Nombre del estudiante 1'), 'e');
    expect(onChange).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Añadir' }));
    expect(onChange.mock.lastCall?.[0]).toHaveLength(2);
  });
});
