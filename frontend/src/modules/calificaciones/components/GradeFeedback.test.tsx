import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GradeFeedback } from './GradeFeedback';

const original = 'Retroalimentación provisional: requiere revisión docente.\n\nLograste identificar al personaje.\nPractica justificar tu respuesta.';
function Harness({ canEdit = true, onSave = vi.fn() }) {
  const [value, setValue] = useState(original);
  return <GradeFeedback value={value} original={original} canEdit={canEdit} onChange={setValue} onSave={onSave} />;
}

describe('GradeFeedback', () => {
  it('muestra todo el texto sin editor por defecto, sin reescribir avisos', () => {
    render(<Harness />);
    expect(screen.getByTestId('grade-feedback-text')).toHaveTextContent('Retroalimentación provisional: requiere revisión docente.');
    expect(screen.getByTestId('grade-feedback-text')).toHaveTextContent('Practica justificar tu respuesta.');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('edita solo por acción explícita, conserva borrador y exige confirmar descarte', () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar retroalimentación' }));
    const input = screen.getByRole('textbox', { name: 'Retroalimentación' });
    expect(input).toHaveValue(original);
    fireEvent.change(input, { target: { value: 'Borrador docente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar retroalimentación' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(input).toHaveValue('Borrador docente');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar edición' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('grade-feedback-text')).toHaveTextContent('Lograste identificar al personaje.');
  });
  it('sin permiso conserva lectura y no ofrece editar', () => {
    render(<Harness canEdit={false} />);
    expect(screen.queryByRole('button', { name: 'Editar retroalimentación' })).not.toBeInTheDocument();
    expect(screen.getByTestId('grade-feedback-text')).toBeInTheDocument();
  });
  it('conserva el borrador y bloquea otro guardado mientras está guardando', () => {
    const props = { value: original, original, canEdit: true, onChange: vi.fn(), onSave: vi.fn() };
    const view = render(<GradeFeedback {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar retroalimentación' }));
    view.rerender(<GradeFeedback {...props} value="Borrador que se conserva" saving />);
    expect(screen.getByRole('textbox')).toHaveValue('Borrador que se conserva');
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar retroalimentación' })).toBeDisabled();
    view.rerender(<GradeFeedback {...props} value="Borrador que se conserva" error="No fue posible guardar." />);
    expect(screen.getByRole('textbox')).toHaveValue('Borrador que se conserva');
    expect(screen.getByRole('alert')).toHaveTextContent('Tu borrador sigue aquí.');
    expect(screen.getByRole('button', { name: 'Guardar retroalimentación' })).toBeEnabled();
  });
  it('vuelve a lectura cuando llega el mensaje guardado, no solo por pulsar Guardar', () => {
    const props = { value: original, original, canEdit: true, onChange: vi.fn(), onSave: vi.fn() };
    const view = render(<GradeFeedback {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar retroalimentación' }));
    view.rerender(<GradeFeedback {...props} value="Nuevo mensaje docente" />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar retroalimentación' }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    view.rerender(<GradeFeedback {...props} value="Nuevo mensaje docente" original="Nuevo mensaje docente" />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('grade-feedback-text')).toHaveTextContent('Nuevo mensaje docente');
  });
  it('lee texto como texto y comunica ausencia sin inventar feedback', () => {
    const props = { canEdit: false, onChange: vi.fn(), onSave: vi.fn() };
    const view = render(<GradeFeedback {...props} original="" value="" />);
    expect(screen.getByText('Todavía no hay retroalimentación guardada.')).toBeInTheDocument();
    view.rerender(<GradeFeedback {...props} original="<script>alert(1)</script>" value="<script>alert(1)</script>" />);
    expect(screen.getByTestId('grade-feedback-text').querySelector('script')).toBeNull();
    expect(screen.getByTestId('grade-feedback-text')).toHaveTextContent('<script>alert(1)</script>');
  });
});
