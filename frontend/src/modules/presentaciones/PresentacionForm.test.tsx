import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Materia } from '@/types/api';
import { PresentacionForm } from './PresentacionForm';
import { inferNivelFromGrado } from './presentationContext';

const materia: Materia = {
  id: 'materia-matematicas',
  profesor_id: 'profesor-1',
  nombre: 'Matemáticas',
  area: 'Matemáticas',
  grado: '4°',
  descripcion: 'Resolución de problemas para cuarto grado.',
  codigo_matricula: 'MATE-4',
  codigo_activo: true,
  requiere_aprobacion: false,
  estado: 'activa',
  created_at: '2026-08-08T00:00:00Z',
  updated_at: '2026-08-08T00:00:00Z',
};

describe('PresentacionForm', () => {
  it('detecta el nivel educativo a partir del grado', () => {
    expect(inferNivelFromGrado('Transición')).toBe('preescolar');
    expect(inferNivelFromGrado('4°')).toBe('primaria');
    expect(inferNivelFromGrado('Octavo')).toBe('secundaria');
    expect(inferNivelFromGrado('10')).toBe('media');
  });

  it('completa y envía el contexto de la materia seleccionada', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PresentacionForm loading={false} materias={[materia]} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText('Materia'), materia.id);

    expect(screen.getByLabelText('Grado')).toHaveValue('4°');
    expect(screen.getByLabelText('Área')).toHaveValue('Matemáticas');
    expect(screen.getByRole('radio', { name: 'Primaria' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Contexto detectado')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Título/), 'Multiplicación en contexto');
    await user.type(screen.getByLabelText(/Tema/), 'Problemas multiplicativos');
    await user.click(screen.getByRole('button', { name: 'Generar presentación' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      materia_id: materia.id,
      area: 'Matemáticas',
      grado: '4°',
      nivel: 'primaria',
    }));
  });
});