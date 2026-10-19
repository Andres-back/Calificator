import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { XaliPage } from './XaliPage';

const mocks = vi.hoisted(() => ({ history: vi.fn(), send: vi.fn(), clear: vi.fn() }));
vi.mock('./api', () => ({ getHistory: mocks.history, sendMessage: mocks.send, clearHistory: mocks.clear,
  listEvaluacionesEntregadas: vi.fn(), listEvaluationResources: vi.fn(), sendEvaluationMessage: vi.fn(), generateEvaluationResource: vi.fn(),
}));
vi.mock('@/stores/auth', () => ({ useAuth: () => ({ user: { id: 't1', rol: 'profesor', nombre: 'Docente' } }) }));
vi.mock('@/modules/materias/MateriaSelect', () => ({ useMaterias: () => ({ data: [
  { id: 'm1', nombre: 'Matemáticas', area: 'Matemáticas', grado: '6' },
  { id: 'm2', nombre: 'Lenguaje', area: 'Lenguaje', grado: '4' },
] }) }));
vi.mock('./components/XaliAvatar', () => ({ XaliAvatar: () => <span aria-hidden="true">Xali</span> }));
function setup() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><XaliPage /></QueryClientProvider>);
}
beforeEach(() => { vi.clearAllMocks(); mocks.history.mockResolvedValue([]); mocks.send.mockResolvedValue({ respuesta: 'Explicación docente' }); });
describe('teacher page integration', () => {
  it('shows subject facts and sends only the selected context', async () => {
    const user = userEvent.setup(); setup();
    expect(await screen.findByRole('option', { name: 'Conversación general' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Contexto de materia'), 'm1');
    expect(screen.getByRole('status')).toHaveTextContent('Hablando sobre: Matemáticas · Matemáticas · Grado 6');
    await waitFor(() => expect(screen.queryByText('Cargando historial…')).not.toBeInTheDocument());
    await user.type(screen.getByLabelText('Mensaje para Xali'), 'Soluciones razonadas');
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje a Xali' }));
    expect(mocks.send).toHaveBeenCalledWith('Soluciones razonadas', 'm1', expect.any(AbortSignal));
    expect(await screen.findByText('Explicación docente')).toBeVisible();
    expect(screen.queryByText('Recursos para practicar')).not.toBeInTheDocument();
  });
  it('does not show a late answer or its controls in a different subject', async () => {
    let done!: (value: { respuesta: string }) => void;
    mocks.send.mockImplementationOnce(() => new Promise((resolve) => { done = resolve; }));
    const user = userEvent.setup(); setup();
    await user.selectOptions(screen.getByLabelText('Contexto de materia'), 'm1');
    await waitFor(() => expect(screen.queryByText('Cargando historial…')).not.toBeInTheDocument());
    await user.type(screen.getByLabelText('Mensaje para Xali'), 'Matemáticas');
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje a Xali' }));
    await user.selectOptions(screen.getByLabelText('Contexto de materia'), 'm2');
    await act(async () => done({ respuesta: 'Respuesta de Matemáticas' }));
    expect(screen.queryByText('Respuesta de Matemáticas')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revisar historial' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mensaje para Xali')).toHaveValue('');
  });
});
