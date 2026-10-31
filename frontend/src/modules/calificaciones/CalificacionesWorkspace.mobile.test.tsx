import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GradeNoteExplanation, MobileReviewActionBar, MobileReviewContext } from './CalificacionesWorkspace';
import type { CalificacionDetalle } from '@/types/api';

describe('centro de calificaciones en celular', () => {
  it('reserva la altura real de acciones y libera espacio cuando la barra se oculta', () => {
    let height = 88;
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ height }) as DOMRect);
    const view = render(<div data-testid="grade-review-scroll"><MobileReviewActionBar processing={false} done={false} published={false} score={4} canGrade canPublish dirty={false} componentDirty={false} advancedEditOpen={false} confirmPending={false} publishPending={false} onConfirm={vi.fn()} onPublish={vi.fn()} onAdjust={vi.fn()} onSaveChanges={vi.fn()} onNext={vi.fn()} /></div>);
    const scroller = screen.getByTestId('grade-review-scroll');
    expect(scroller.style.getPropertyValue('--grade-review-actions-height')).toBe('88px');
    height = 0;
    fireEvent(window, new Event('resize'));
    expect(scroller.style.getPropertyValue('--grade-review-actions-height')).toBe('0px');
    view.unmount();
    expect(scroller.style.getPropertyValue('--grade-review-actions-height')).toBe('');
    measure.mockRestore();
  });
  it('explica sugerida 2.5 frente a 1.85 provisional con dos preguntas pendientes', () => {
    const cal = { estado: 'requiere_revision', timeline: [], desglose: { cobertura_estado: 'incompleta', formula: { puntos_obtenidos: 1.85, puntos_posibles: 5, nota_maxima: 5, nota_base: 1.85, ajuste_global: 0, nota_final: 1.85 }, componentes: [{ tipo: 'pregunta', puntos_obtenidos: null }, { tipo: 'pregunta', puntos_obtenidos: null }, { tipo: 'pregunta', puntos_obtenidos: 0 }] } } as unknown as CalificacionDetalle;
    render(<GradeNoteExplanation cal={cal} score={2.5} />);
    expect(screen.getByText(/Faltan 2 preguntas por puntuar/)).toBeInTheDocument();
    expect(screen.getByText(/El cálculo provisional da 1.85/)).toHaveTextContent('2.50');
    expect(screen.queryByText(/Consulta el historial para conocer la decisión del docente/)).not.toBeInTheDocument();
  });
  it('no atribuye al docente una discrepancia mientras la nota sigue pendiente', () => {
    const cal = { estado: 'requiere_revision', timeline: [], desglose: { formula: { puntos_obtenidos: 2.48, puntos_posibles: 5, nota_maxima: 5, nota_base: 2.48, ajuste_global: 0, nota_final: 2.48 }, componentes: [] } } as unknown as CalificacionDetalle;
    render(<GradeNoteExplanation cal={cal} score={2.52} />);
    expect(screen.queryByText(/Consulta el historial para conocer la decisión del docente/)).not.toBeInTheDocument();
    expect(screen.getByText(/Revisa los puntajes antes de confirmar/)).toHaveTextContent('2.48');
  });
  it('expone una escala distinta solo al abrir el cálculo sin inventar una nota', async () => {
    const cal = { estado: 'sugerida', timeline: [], desglose: { formula: { puntos_obtenidos: 8, puntos_posibles: 10, nota_maxima: 100, nota_base: 80, ajuste_global: 0, nota_final: 80 }, componentes: [] } } as unknown as CalificacionDetalle;
    render(<GradeNoteExplanation cal={cal} score={80} />);
    const control = screen.getByText('Ver cálculo de la nota');
    expect(control.closest('details')).not.toHaveAttribute('open');
    await userEvent.click(control);
    expect(control.closest('details')).toHaveAttribute('open');
    expect(screen.getByText(/Equivale a 80.00/)).toBeInTheDocument();
    expect(screen.getByText(/Puntos por respuestas/).closest('p')).toHaveTextContent('8.00 / 10.00');
  });
  it('explains the stored calculation and distinguishes a teacher global adjustment', () => {
    const cal = { estado: 'ajustada', timeline: [], desglose: { formula: { puntos_obtenidos: 2, puntos_posibles: 4, nota_maxima: 5, nota_base: 2.5, ajuste_global: 0.3, nota_final: 2.8 }, componentes: [], ajuste_global_detalle: { motivo_interno: 'Procedimiento adicional verificado' } } } as unknown as CalificacionDetalle;
    render(<GradeNoteExplanation cal={cal} score={2.8} />);
    expect(screen.getByText(/2.00.*4.00/)).toBeInTheDocument();
    expect(screen.getByText(/Equivale a 2.50/)).toBeInTheDocument();
    expect(screen.getByText(/Ajuste docente registrado:/).closest('p')).toHaveTextContent('+0.30');
    expect(screen.getByText('Procedimiento adicional verificado')).toBeInTheDocument();
  });

  it('does not invent a reason for legacy grades or conceal an override of the breakdown', () => {
    const { rerender } = render(<GradeNoteExplanation cal={{ estado: 'confirmada', timeline: [] } as unknown as CalificacionDetalle} score={4} />);
    expect(screen.getByText(/Esta nota no tiene puntajes por pregunta guardados/)).toBeInTheDocument();
    rerender(<GradeNoteExplanation cal={{ estado: 'ajustada', timeline: [{ tipo: 'ajustada', detalle: 'Decisión docente registrada' }], desglose: { formula: { puntos_obtenidos: 2, puntos_posibles: 4, nota_maxima: 5, nota_base: 2.5, ajuste_global: 0, nota_final: 2.5 }, componentes: [] } } as unknown as CalificacionDetalle} score={4} />);
    expect(screen.getByText(/La nota actual es distinta del cálculo por respuestas/)).toBeInTheDocument();
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

  it('138 reutiliza la cabecera para la ubicación sin repetir los nombres ni otra fila de contexto', async () => {
    const user = userEvent.setup();
    render(<MobileReviewContext compactContext forceOpen={false}
      materiaName="Matemáticas" evaluationName="Fracciones"
      navigation={<nav aria-label="Ubicación de la revisión">Matemáticas › Fracciones</nav>}>
      <label htmlFor="evaluacion-138">Evaluación</label><select id="evaluacion-138"><option>Fracciones</option></select>
    </MobileReviewContext>);
    expect(screen.getByRole('navigation', { name: 'Ubicación de la revisión' })).toBeInTheDocument();
    expect(screen.queryByText('Estás revisando')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Evaluación')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Cambiar evaluación/ }));
    expect(screen.getByLabelText('Evaluación')).toBeVisible();
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

  it('138 pasa acciones a flujo normal si la barra ocuparía el área de lectura', async () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 360, 1000));
    try {
      const onNext = vi.fn();
      render(<div data-testid="grade-review-scroll"><MobileReviewActionBar
        processing={false} done published score={4} canGrade canPublish
        dirty={false} componentDirty={false} advancedEditOpen={false}
        confirmPending={false} publishPending={false}
        onConfirm={vi.fn()} onPublish={vi.fn()} onAdjust={vi.fn()} onSaveChanges={vi.fn()} onNext={onNext}
      /></div>);
      expect(screen.getByLabelText('Acciones de la calificación')).toHaveAttribute('data-action-position', 'flow');
      expect(screen.getByTestId('grade-review-scroll').style.getPropertyValue('--grade-review-actions-height')).toBe('0px');
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente estudiante' }));
      expect(onNext).toHaveBeenCalledOnce();
    } finally { rect.mockRestore(); }
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
