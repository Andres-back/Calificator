import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GradeFinalEditor } from './GradeFinalEditor';

const grade = { id: 'c1', nota_confirmada: 4.1, nota_sugerida: 3.9, estado: 'confirmada', updated_at: '2026-10-28T12:00:00', desglose: { version: 2 } };

describe('GradeFinalEditor', () => {
  it('acepta coma y guarda el resultado deseado sin comentario obligatorio', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<GradeFinalEditor grade={grade} maximum={5} onCancel={vi.fn()} onSave={save} />);
    fireEvent.change(screen.getByLabelText('Nota final'), { target: { value: '4,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatchObject({ nota_confirmada: 4.5, actualizado_en_esperado: grade.updated_at, version_desglose_esperada: 2, observacion: '' });
    expect(save.mock.calls[0][0].operacion_id).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('conserva cero y rechaza vacío, fuera de escala y más de dos decimales', () => {
    render(<GradeFinalEditor grade={grade} maximum={5} onCancel={vi.fn()} onSave={vi.fn()} />);
    for (const value of ['', '5,1', '-1', '4.123', 'NaN']) {
      fireEvent.change(screen.getByLabelText('Nota final'), { target: { value } });
      expect(screen.getByRole('button', { name: 'Guardar nota' })).toBeDisabled();
    }
    fireEvent.change(screen.getByLabelText('Nota final'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'Guardar nota' })).toBeEnabled();
  });
  it('abrir y cancelar no redondea el valor persistido ni guarda', () => {
    const save = vi.fn(); const cancel = vi.fn();
    render(<GradeFinalEditor grade={{ ...grade, nota_confirmada: 4.1234 }} maximum={5} onCancel={cancel} onSave={save} />);
    expect(screen.getByRole('button', { name: 'Guardar nota' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(cancel).toHaveBeenCalledOnce(); expect(save).not.toHaveBeenCalled();
  });
  it('advierte antes de guardar una publicada y exige reconocer el efecto', () => {
    render(<GradeFinalEditor grade={{ ...grade, estado: 'publicada' }} maximum={5} onCancel={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nota final'), { target: { value: '4.5' } });
    expect(screen.getByText(/volver a publicar/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar nota' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Entiendo/ }));
    expect(screen.getByRole('button', { name: 'Guardar nota' })).toBeEnabled();
  });
  it('conserva borrador y operación al reintentar tras un error', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Se perdió la conexión.')).mockResolvedValue(undefined);
    render(<GradeFinalEditor grade={grade} maximum={5} onCancel={vi.fn()} onSave={save} />);
    fireEvent.change(screen.getByLabelText('Nota final'), { target: { value: '4,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Nota final')).toHaveValue('4,5');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[0][0].operacion_id).toBe(save.mock.calls[1][0].operacion_id);
  });

  it('termina el estado de guardado aunque falle la preparación local, sin enviar nada', async () => {
    const save = vi.fn();
    const brokenId = vi.spyOn(crypto, 'randomUUID').mockImplementationOnce(() => { throw new Error('No se pudo preparar el guardado.'); });
    try {
      render(<GradeFinalEditor grade={grade} maximum={5} onCancel={vi.fn()} onSave={save} />);
      fireEvent.change(screen.getByLabelText('Nota final'), { target: { value: '4.5' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }));
      await screen.findByRole('alert');
      expect(screen.getByRole('button', { name: 'Guardar nota' })).toBeEnabled();
      expect(save).not.toHaveBeenCalled();
    } finally {
      brokenId.mockRestore();
    }
  });
});
