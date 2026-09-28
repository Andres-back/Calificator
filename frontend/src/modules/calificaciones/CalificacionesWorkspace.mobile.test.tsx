import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MobileReviewActionBar, MobileReviewContext } from './CalificacionesWorkspace';

describe('centro de calificaciones en celular', () => {
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
