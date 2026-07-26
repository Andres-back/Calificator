import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Button } from './Button';
import { Field, Input } from './Input';
import { GuidedTour } from './GuidedTour';
import { Modal } from './Modal';
import { QueryError } from './QueryState';
import { PageHeader } from '@/components/layout/PageHeader';
import { SopaLetrasView } from '@/modules/herramientas/views/SopaLetrasView';

function ModalHarness() {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir confirmación</button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Eliminar materia"
        description="La materia dejará de estar disponible para el grupo."
        initialFocusRef={cancelRef}
      >
        <Button ref={cancelRef} variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button variant="danger">Eliminar materia</Button>
      </Modal>
    </>
  );
}

describe('patrones compartidos de P2', () => {
  it('mantiene el nombre del botón durante carga y anuncia el estado', () => {
    render(<Button loading loadingLabel="Guardando…">Guardar cambios</Button>);
    const button = screen.getByRole('button', { name: 'Guardando…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('asocia label, ayuda y error con un campo obligatorio', () => {
    render(
      <Field label="Correo electrónico" hint="Usa tu cuenta institucional." error="El correo es obligatorio." required>
        <Input name="email" aria-invalid="true" />
      </Field>,
    );
    expect(screen.getByLabelText(/Correo electrónico/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('El correo es obligatorio.');
  });

  it('expone un único h1 y breadcrumbs con página actual', () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="Evaluación de fracciones"
          description="Revisa las preguntas antes de publicar."
          breadcrumbs={[
            { label: 'Materias', to: '/app/materias' },
            { label: 'Matemáticas 8°', to: '/app/materias/1' },
            { label: 'Evaluación de fracciones' },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Migas de pan' })).toBeInTheDocument();
    expect(screen.getByText('Evaluación de fracciones', { selector: 'span' })).toHaveAttribute('aria-current', 'page');
  });

  it('atrapa foco, cierra con Escape y restaura el disparador del modal', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Abrir confirmación' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Eliminar materia' })).toHaveAttribute('aria-describedby');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus());
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('presenta errores de consulta como alerta comprensible y reintentable', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<QueryError code={503} onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('El servicio no está disponible');
    await user.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('salta pasos sin destino y persiste la versión completada del recorrido', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    render(
      <>
        <button data-tour="visible">Elemento visible</button>
        <GuidedTour
          open
          onClose={close}
          tourId="calificaciones"
          role="profesor"
          version={2}
          steps={[
            { target: '[data-tour="missing"]', title: 'Paso ausente', description: 'No debe mostrarse.' },
            { target: '[data-tour="visible"]', title: 'Paso visible', description: 'Sí debe mostrarse.' },
          ]}
        />
      </>,
    );
    expect(screen.queryByText('Paso ausente')).not.toBeInTheDocument();
    expect(await screen.findByRole('dialog', { name: 'Guía: Paso visible' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Finalizar/ }));
    expect(localStorage.getItem('xcalificator:tour:profesor:calificaciones:v2')).toBe('completed');
    expect(close).toHaveBeenCalledOnce();
  });
});

describe('SopaLetrasView', () => {
  const data = {
    titulo: 'Vocabulario',
    instrucciones: 'Encuentra las palabras.',
    grilla: [['A', 'B'], ['C', 'D']],
    palabras: [],
    banco_palabras: ['AB'],
  };

  it('permite seleccionar una palabra con teclado y la anuncia', async () => {
    render(<SopaLetrasView data={data} />);
    const first = screen.getByRole('gridcell', { name: /fila 1, columna 1/i });
    first.focus();
    fireEvent.keyDown(first, { key: ' ' });
    await waitFor(() => expect(first).toHaveAttribute('aria-selected', 'true'));
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const second = screen.getByRole('gridcell', { name: /fila 1, columna 2/i });
    await waitFor(() => expect(second).toHaveFocus());
    fireEvent.keyDown(second, { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Palabra AB encontrada.'));
    expect(screen.getByText('1/1')).toBeInTheDocument();
  });

  it('permite seleccionar una palabra con pointer events', () => {
    render(<SopaLetrasView data={data} />);
    const cells = screen.getAllByRole('gridcell');
    vi.spyOn(document, 'elementFromPoint')
      .mockImplementationOnce(() => cells[0])
      .mockImplementationOnce(() => cells[1])
      .mockImplementationOnce(() => cells[1]);
    const grid = screen.getByRole('grid');
    fireEvent.pointerDown(grid, { clientX: 1, clientY: 1, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(grid, { clientX: 2, clientY: 1, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(grid, { clientX: 2, clientY: 1, pointerId: 1, pointerType: 'touch' });
    expect(screen.getByRole('status')).toHaveTextContent('Palabra AB encontrada.');
  });
});