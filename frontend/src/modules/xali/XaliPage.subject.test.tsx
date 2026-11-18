import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { XaliPage } from './XaliPage';
import { useAuth } from '@/stores/auth';

const api = vi.hoisted(() => ({ getHistory: vi.fn(), sendMessage: vi.fn(), clearHistory: vi.fn() }));
vi.mock('./api', () => ({
  getHistory: api.getHistory, sendMessage: api.sendMessage, clearHistory: api.clearHistory,
  listEvaluacionesEntregadas: vi.fn(), listEvaluationResources: vi.fn(), sendEvaluationMessage: vi.fn(), generateEvaluationResource: vi.fn(),
}));
vi.mock('@/modules/materias/MateriaSelect', () => ({
  useMaterias: () => ({ data: [{ id: 'mat-5', nombre: 'Matemáticas', area: 'Matemáticas', grado: '5', estado: 'activa' }] }),
}));
vi.mock('./components/XaliAvatar', () => ({ XaliAvatar: () => <span aria-hidden="true">Xali</span> }));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><XaliPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getHistory.mockResolvedValue([]);
  api.sendMessage.mockResolvedValue({ respuesta: 'Listo', materia_id: 'mat-5' });
  useAuth.setState({
    status: 'authenticated',
    user: { id: 'docente-1', nombre: 'Docente Demo', email: 'docente@example.test', rol: 'profesor', estado: 'activo', permissions: ['xali.use'] },
  });
});

describe('200 Xali docente con contexto de la materia', () => {
  it('sin materia invita a elegir una y ofrece sugerencias generales', async () => {
    renderPage();

    expect(await screen.findByText(/Elige una materia arriba y te respondo con sus datos reales/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Propón una rúbrica sencilla/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Qué estudiante va mejor/ })).not.toBeInTheDocument();
  });

  it('con materia dice que ya la conoce y sugiere preguntas sobre sus datos', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText('Contexto de materia'), { target: { value: 'mat-5' } });

    expect(await screen.findByText(/Ya conozco Matemáticas: sus evaluaciones, las notas confirmadas y tus recursos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cómo va el grupo en esta materia/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quién necesita refuerzo y en qué/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Propón una rúbrica sencilla/ })).not.toBeInTheDocument();
  });

  it('la sugerencia se envía con la materia seleccionada', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText('Contexto de materia'), { target: { value: 'mat-5' } });
    fireEvent.click(await screen.findByRole('button', { name: /Qué estudiante va mejor y cuál es su punto débil/ }));

    await waitFor(() => expect(api.sendMessage).toHaveBeenCalled());
    const [message, materia] = api.sendMessage.mock.calls[0];
    expect(message).toBe('¿Qué estudiante va mejor y cuál es su punto débil?');
    expect(materia).toBe('mat-5');
  });
});
