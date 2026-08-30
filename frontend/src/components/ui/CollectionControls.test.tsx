import { fireEvent, render, screen } from '@testing-library/react';
import { Download } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { ActionMenu, CollectionToolbar, IconButton } from './CollectionControls';

describe('collection controls', () => {
  it('provides named 44px icon actions', () => {
    render(<IconButton aria-label="Descargar recurso" icon={<Download />} />);
    expect(screen.getByRole('button', { name: 'Descargar recurso' })).toHaveClass('h-11', 'w-11');
  });

  it('closes the action menu after selecting an action', () => {
    const select = vi.fn();
    render(<ActionMenu label="Más acciones" items={[{ label: 'Duplicar', onSelect: select }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicar' }));
    expect(select).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('combines search, count and a keyboard-friendly segmented filter', () => {
    const query = vi.fn();
    const category = vi.fn();
    render(<CollectionToolbar query="" onQueryChange={query} placeholder="Buscar" resultCount={2} value="Todos" onChange={category} options={[{ value: 'Todos', label: 'Todos' }, { value: 'Juego', label: 'Juego' }]} ariaLabel="Filtrar recursos" />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar recursos' }), { target: { value: 'mapa' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Juego' }));
    expect(query).toHaveBeenCalledWith('mapa');
    expect(category).toHaveBeenCalledWith('Juego');
    expect(screen.getByText('2 resultados')).toBeInTheDocument();
  });
});
