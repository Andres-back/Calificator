import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicFeedbackPage } from './PublicFeedbackPage';

const token = 'a'.repeat(43);
const otherToken = 'b'.repeat(43);
function payload(name = 'Estudiante de prueba') {
  return { resultado: { estudiante: name, evaluacion: 'Lectura', materia: 'Lenguaje', nota: '3.50', nota_maxima: '5.00', explicacion: 'Nota revisada por tu docente.', retroalimentacion: 'En la pregunta 2 describiste las nubes. Relee y busca una emoción.', respuestas: [], claves_liberadas: false }, expires_at: '2099-01-04T00:00:00Z', server_now: '2099-01-01T00:00:00Z', cupo: { restantes: 5, retry_after_seconds: 0 }, evidencia_disponible: false };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); history.replaceState(null, '', '/'); });

describe('consulta individual sin panel docente', () => {
  it('muestra nota y devolución completa sin login ni controles del profesor', async () => {
    history.replaceState(null, '', `/devolucion#${token}`);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(payload()))));
    render(<PublicFeedbackPage />);
    expect(await screen.findByRole('heading', { name: 'Estudiante de prueba' })).toBeInTheDocument();
    expect(screen.getByText('3.5')).toBeInTheDocument();
    expect(screen.getByText(/En la pregunta 2 describiste las nubes/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /publicar|confirmar nota/i })).toBeNull();
    expect(screen.queryByRole('textbox', { name: /correo|contraseña|buscar estudiante/i })).toBeNull();
    expect(document.title).toBe('Tu devolución · XCalificator');
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });

  it('sin token muestra ayuda y no envía solicitudes', () => {
    history.replaceState(null, '', '/devolucion');
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    render(<PublicFeedbackPage />);
    expect(screen.getByText(/Este enlace no está disponible/)).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('limpia inmediatamente al cambiar de enlace y no acepta una respuesta antigua', async () => {
    history.replaceState(null, '', `/devolucion#${token}`);
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(payload()))).mockResolvedValueOnce(new Response('{}', { status: 404 }));
    vi.stubGlobal('fetch', fetcher);
    render(<PublicFeedbackPage />);
    await screen.findByText('Estudiante de prueba');
    history.replaceState(null, '', `/devolucion#${otherToken}`);
    fireEvent(window, new HashChangeEvent('hashchange'));
    expect(screen.queryByText('Estudiante de prueba')).toBeNull();
    expect(await screen.findByText(/Este enlace no está disponible/)).toBeInTheDocument();
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${otherToken}`);
  });

  it('un fallo de conexión permite reintentar sin errores técnicos ni datos previos', async () => {
    history.replaceState(null, '', `/devolucion#${token}`);
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('secret')).mockResolvedValueOnce(new Response(JSON.stringify(payload())));
    vi.stubGlobal('fetch', fetcher);
    render(<PublicFeedbackPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Volver a intentar' }));
    expect(await screen.findByText('Estudiante de prueba')).toBeInTheDocument();
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('no conserva contenido si una nueva comprobación rechaza el acceso', async () => {
    history.replaceState(null, '', `/devolucion#${token}`);
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(payload()))).mockResolvedValueOnce(new Response('{}', { status: 404 }));
    vi.stubGlobal('fetch', fetcher);
    render(<PublicFeedbackPage />);
    await screen.findByText('Estudiante de prueba');
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(screen.queryByText('Estudiante de prueba')).toBeNull());
    expect(await screen.findByText(/Este enlace no está disponible/)).toBeInTheDocument();
  });

  it('ignora una respuesta tardía perteneciente al enlace anterior', async () => {
    history.replaceState(null, '', `/devolucion#${token}`);
    let resolveOld!: (response: Response) => void;
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload('Otro estudiante'))));
    vi.stubGlobal('fetch', fetcher);
    render(<PublicFeedbackPage />);
    history.replaceState(null, '', `/devolucion#${otherToken}`);
    fireEvent(window, new HashChangeEvent('hashchange'));
    await screen.findByText('Otro estudiante');
    await act(async () => resolveOld(new Response(JSON.stringify(payload('Estudiante anterior')))));
    expect(screen.queryByText('Estudiante anterior')).toBeNull();
    expect(screen.getByText('Otro estudiante')).toBeInTheDocument();
  });

  it('oculta al vencer usando el intervalo del servidor y no el reloj del teléfono', async () => {
    vi.useFakeTimers();
    history.replaceState(null, '', `/devolucion#${token}`);
    const data = { ...payload(), expires_at: '2099-01-01T00:00:02Z' };
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(data))));
    render(<PublicFeedbackPage />);
    await act(async () => {});
    expect(screen.getByText('Estudiante de prueba')).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(2000));
    expect(screen.queryByText('Estudiante de prueba')).toBeNull();
    expect(screen.getByText(/Este enlace no está disponible/)).toBeInTheDocument();
  });
});
