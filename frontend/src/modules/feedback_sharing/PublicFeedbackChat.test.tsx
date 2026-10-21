import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicFeedbackChat } from './PublicFeedbackChat';
import { FeedbackAccessError, type PublicFeedbackClient } from './publicApi';

afterEach(() => vi.useRealTimers());
const quota = { restantes: 5, retry_after_seconds: 0 };
function setup() {
  const client = { ask: vi.fn(), poll: vi.fn(), read: vi.fn() } as unknown as PublicFeedbackClient;
  const onUnavailable = vi.fn();
  render(<PublicFeedbackChat client={client} quota={quota} onUnavailable={onUnavailable} />);
  return { client, onUnavailable };
}
function send() {
  fireEvent.change(screen.getByLabelText('Tu pregunta a Xali'), { target: { value: '¿Cómo puedo mejorar la pregunta 2?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar pregunta' }));
}

describe('Xali desde enlace individual', () => {
  it('muestra cupo, texto seguro y respuesta sin HTML ejecutable', async () => {
    const { client } = setup();
    vi.mocked(client.ask).mockResolvedValue({ request_id: 'r', status: 'succeeded', respuesta: '<img src=x> Relee la pregunta 2.', mensaje: null, cupo: { ...quota, restantes: 4 } });
    send();
    expect(await screen.findByText('<img src=x> Relee la pregunta 2.')).toBeInTheDocument();
    expect(screen.getByText('4 de 5 preguntas disponibles')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('consulta el avance sin volver a enviar la pregunta', async () => {
    const { client } = setup();
    vi.mocked(client.ask).mockResolvedValue({ request_id: 'r', status: 'queued', respuesta: null, mensaje: null, cupo: { ...quota, restantes: 4 } });
    vi.mocked(client.poll).mockResolvedValue({ request_id: 'r', status: 'succeeded', respuesta: 'Busca una emoción en la primera frase.', mensaje: null, cupo: { ...quota, restantes: 4 } });
    send();
    expect(await screen.findByText('Xali está preparando tu respuesta. Puedes seguir leyendo tu devolución.')).toBeInTheDocument();
    expect(await screen.findByText('Busca una emoción en la primera frase.', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(client.ask).toHaveBeenCalledTimes(1);
    expect(client.poll).toHaveBeenCalledWith('r', expect.any(AbortSignal));
  });

  it('conserva ID y mensaje ante una aceptación de resultado incierto', async () => {
    const { client } = setup();
    vi.mocked(client.ask).mockRejectedValueOnce(new FeedbackAccessError(0));
    send();
    fireEvent.click(await screen.findByRole('button', { name: 'Comprobar envío' }));
    await waitFor(() => expect(client.ask).toHaveBeenCalledTimes(2));
    expect(vi.mocked(client.ask).mock.calls[0].slice(0, 2)).toEqual(vi.mocked(client.ask).mock.calls[1].slice(0, 2));
  });

  it('respeta 429 y mantiene la lectura independiente', async () => {
    const { client } = setup();
    vi.mocked(client.ask).mockRejectedValue(new FeedbackAccessError(429, 28));
    send();
    expect(await screen.findByText(/Podrás preguntar de nuevo en 28 segundos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar pregunta' })).toBeDisabled();
    expect(client.ask).toHaveBeenCalledTimes(1);
  });

  it('avisa al padre cuando el enlace se cierra y no muestra respuesta tardía', async () => {
    const { client, onUnavailable } = setup();
    vi.mocked(client.ask).mockRejectedValue(new FeedbackAccessError(404));
    send();
    await waitFor(() => expect(onUnavailable).toHaveBeenCalledOnce());
    expect(screen.queryByText('Respuesta de Xali')).not.toBeInTheDocument();
  });

  it('no ejecuta envíos ni polls después de desmontarse', async () => {
    vi.useFakeTimers();
    const client = { ask: vi.fn().mockResolvedValue({ request_id: 'r', status: 'queued', cupo: quota }), poll: vi.fn(), read: vi.fn() } as unknown as PublicFeedbackClient;
    const { unmount } = render(<PublicFeedbackChat client={client} quota={quota} onUnavailable={vi.fn()} />);
    await act(async () => send());
    unmount();
    await act(async () => vi.advanceTimersByTime(5000));
    expect(client.ask).toHaveBeenCalledOnce();
    expect(client.poll).not.toHaveBeenCalled();
  });
});
