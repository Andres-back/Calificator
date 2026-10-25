import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MateriaManagement } from './MateriaManagement';
import { useAuth } from '@/stores/auth';
import type { Materia } from '@/types/api';

const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('./api', () => ({ updateMateria: mocks.update }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));
const subject = { id: 'm', profesor_id: 'p', nombre: 'Materia', estado: 'activa', updated_at: '2026-10-25T00:00:00' } as Materia;
const show = (materia = subject) => render(<QueryClientProvider client={new QueryClient()}><MateriaManagement materia={materia} /></QueryClientProvider>);
beforeEach(() => {
  vi.clearAllMocks(); mocks.update.mockResolvedValue(subject);
  useAuth.setState({ user: { id: 'p', rol: 'profesor', permissions: ['subjects.update'] } as never });
});
it('edits only metadata with a version guard', async () => {
  show(); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Editar materia' }));
  await user.clear(screen.getByLabelText(/Nombre de la materia/));
  await user.type(screen.getByLabelText(/Nombre de la materia/), 'Nombre nuevo');
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('m', { expected_updated_at: subject.updated_at, nombre: 'Nombre nuevo', area: '', grado: '', descripcion: '' }));
});
it('requires explicit archive confirmation and cancellation does not write', async () => {
  show(); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Eliminar de mis materias' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('No borra estudiantes, notas');
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(mocks.update).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Eliminar de mis materias' }));
  await user.click(screen.getByRole('button', { name: 'Archivar materia' }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('m', { expected_updated_at: subject.updated_at, estado: 'archivada' }));
});
it('explains that restoring does not open reception and exposes errors inside the dialog', async () => {
  mocks.update.mockRejectedValue(new Error('Sin conexión'));
  show({ ...subject, estado: 'archivada' }); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Restaurar materia' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('No se abrirán automáticamente');
  await user.click(screen.getByRole('button', { name: /^Restaurar$/ }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.getByRole('dialog')).toContainElement(screen.getByRole('alert'));
});
it('does not expose management for another owner or without the effective permission', () => {
  const view = show({ ...subject, profesor_id: 'other' });
  expect(screen.queryByRole('button')).not.toBeInTheDocument(); view.unmount();
  useAuth.setState({ user: { id: 'p', rol: 'profesor', permissions: [] } as never }); show();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
