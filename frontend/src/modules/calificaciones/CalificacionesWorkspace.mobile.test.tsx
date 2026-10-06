import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GradeNoteExplanation, MobileReviewActionBar, MobileReviewContext } from './CalificacionesWorkspace';
import type { CalificacionDetalle } from '@/types/api';

describe('centro de calificaciones en celular', () => {
  it('expone una escala distinta solo al abrir el cálculo sin inventar una nota', async () => {
    const cal = { estado: 'sugerida', timeline: [], desglose: { formula: { puntos_obtenidos: 8, puntos_posibles: 10, nota_maxima: 100, nota_base: 80, ajuste_global: 0, nota_final: 80 }, componentes: [] } } as unknown as CalificacionDetalle;
    render(<GradeNoteExplanation cal={cal} score={80} />);
    const control = screen.getByText('Ver cálculo de la nota');
    expect(control.closest('details')).not.toHaveAttribute('open');
    await userEvent.click(control);
    expect(control.closest('details')).toHaveAttribute('open');
    expect(screen.getByText(/Nota proporcional registrada: 80.00/)).toBeInTheDocument();
  });
  it('explains the stored calculation and distinguishes a teacher global adjustment', () => {
    const cal = { estado: 'ajustada', timeline: [], desglose: { formula: { puntos_obtenidos: 2, puntos_posibles: 4, nota_maxima: 5, nota_base: 2.5, ajuste_global: 0.3, nota_final: 2.8 }, componentes: [], ajuste_global_detalle: { motivo_interno: 'Procedimiento adicional verificado' } } } as unknown as CalificacionDetalle;
    render(<GradeNoteExplanation cal={cal} score={2.8} />);
    expect(screen.getByText(/2.00.*4.00/)).toBeInTheDocument();
    expect(screen.getByText(/Nota proporcional registrada: 2.50/)).toBeInTheDocument();
    expect(screen.getByText(/Ajuste docente registrado:/).closest('p')).toHaveTextContent('+0.30');
    expect(screen.getByText('Procedimiento adicional verificado')).toBeInTheDocument();
  });

  it('does not invent a reason for legacy grades or conceal an override of the breakdown', () => {
    const { rerender } = render(<GradeNoteExplanation cal={{ estado: 'confirmada', timeline: [] } as unknown as CalificacionDetalle} score={4} />);
    expect(screen.getByText(/Sin explicación registrada/)).toBeInTheDocument();
    rerender(<GradeNoteExplanation cal={{ estado: 'ajustada', timeline: [{ tipo: 'ajustada', detalle: 'Decisión docente registrada' }], desglose: { formula: { puntos_obtenidos: 2, puntos_posibles: 4, nota_maxima: 5, nota_base: 2.5, ajuste_global: 0, nota_final: 2.5 }, componentes: [] } } as unknown as CalificacionDetalle} score={4} />);
    expect(screen.getByText(/La nota vigente difiere del cálculo registrado/)).toBeInTheDocument();
    expect(screen.getByText('Decisión docente registrada')).toBeInTheDocument();
  });
  it('resume materia y evaluación y permite desplegar los selectores', async () => {
    const user = userEvent.setup();
    render(
      <MobileReviewContext materiaName="Matemáticas" evaluationName="Fracciones" forceOpen={false}>
        <label htmlFor="materia-prueba">Materia</label>
        <select id="materia-prueba"><option>Matemáticas</option></select>
      </MobileReviewContext>,
    );

    expect(screen.getByText('Matemáticas')).toBeInTheDocument();
    expect(screen.getByText('Fracciones')).toBeInTheDocument();
    expect(screen.queryByLabelText('Materia')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Cambiar materia o evaluación/i }));

    expect(screen.getByLabelText('Materia')).toBeInTheDocument();
  });

  it('prioriza confirmar y permite continuar con el siguiente estudiante', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onNext = vi.fn();
    render(
      <MobileReviewActionBar
        processing={false}
        done={false}
        published={false}
        score={4.2}
        canGrade
        canPublish
        dirty={false}
        componentDirty={false}
        advancedEditOpen={false}
        confirmPending={false}
        publishPending={false}
        onConfirm={onConfirm}
        onPublish={vi.fn()}
        onAdjust={vi.fn()}
        onSaveChanges={vi.fn()}
        onNext={onNext}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Confirmar nota/i }));
    await user.click(screen.getByRole('button', { name: /Siguiente estudiante/i }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('muestra publicar solo después de confirmar y respeta permisos', () => {
    const props = {
      processing: false,
      done: true,
      published: false,
      score: 4.5,
      canGrade: true,
      dirty: false,
      componentDirty: false,
      advancedEditOpen: false,
      confirmPending: false,
      publishPending: false,
      onConfirm: vi.fn(),
      onPublish: vi.fn(),
      onAdjust: vi.fn(),
      onSaveChanges: vi.fn(),
      onNext: vi.fn(),
    };
    const { rerender } = render(<MobileReviewActionBar {...props} canPublish />);

    expect(screen.getByRole('button', { name: /Publicar al estudiante/i })).toBeInTheDocument();

    rerender(<MobileReviewActionBar {...props} canPublish={false} />);

    expect(screen.queryByRole('button', { name: /Publicar al estudiante/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Siguiente estudiante/i })).toBeInTheDocument();
  });

  it('protege cambios pendientes antes de continuar', () => {
    render(
      <MobileReviewActionBar
        processing={false}
        done={false}
        published={false}
        score={3.8}
        canGrade
        canPublish
        dirty={false}
        componentDirty
        advancedEditOpen={false}
        confirmPending={false}
        publishPending={false}
        onConfirm={vi.fn()}
        onPublish={vi.fn()}
        onAdjust={vi.fn()}
        onSaveChanges={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText(/Guarda o cancela la respuesta abierta/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Siguiente estudiante/i })).toBeDisabled();
  });

  it('no ofrece confirmar mientras la evidencia sigue procesándose', () => {
    render(
      <MobileReviewActionBar
        processing
        done={false}
        published={false}
        score={null}
        canGrade
        canPublish
        dirty={false}
        componentDirty={false}
        advancedEditOpen={false}
        confirmPending={false}
        publishPending={false}
        onConfirm={vi.fn()}
        onPublish={vi.fn()}
        onAdjust={vi.fn()}
        onSaveChanges={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText(/La IA sigue analizando esta entrega/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar nota/i })).not.toBeInTheDocument();
  });
});
