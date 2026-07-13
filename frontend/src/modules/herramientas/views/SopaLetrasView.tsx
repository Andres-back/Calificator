import { useCallback, useMemo, useRef, useState } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { Confetti } from '@/components/ui/Confetti';
import { cn } from '@/lib/cn';
import type { SopaContenido } from '@/types/api';

interface Cell { r: number; c: number; }
type SelectionMode = 'pointer' | 'keyboard' | null;

function cellKey(cell: Cell) {
  return `${cell.r}-${cell.c}`;
}

export function SopaLetrasView({ data }: { data: SopaContenido }) {
  const grid = useMemo(() => data.grilla ?? [], [data.grilla]);
  const banco = useMemo(() => data.banco_palabras ?? [], [data.banco_palabras]);
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const boardRef = useRef<HTMLDivElement>(null);

  const [found, setFound] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState<Cell[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [start, setStart] = useState<Cell | null>(null);
  const [end, setEnd] = useState<Cell | null>(null);
  const [focusedCell, setFocusedCell] = useState<Cell>({ r: 0, c: 0 });

  const norm = (value: string) => value.toUpperCase().replace(/[^A-ZÑ]/g, '');

  const cellsBetween = useCallback((from: Cell | null, to: Cell | null): Cell[] => {
    if (!from || !to) return [];
    const rowDirection = Math.sign(to.r - from.r);
    const columnDirection = Math.sign(to.c - from.c);
    const distance = Math.max(Math.abs(to.r - from.r), Math.abs(to.c - from.c));
    if (to.r - from.r !== 0 && to.c - from.c !== 0 && Math.abs(to.r - from.r) !== Math.abs(to.c - from.c)) return [];
    return Array.from({ length: distance + 1 }, (_, index) => ({ r: from.r + rowDirection * index, c: from.c + columnDirection * index }));
  }, []);

  const cancelSelection = useCallback(() => {
    setSelecting(false);
    setSelectionMode(null);
    setStart(null);
    setEnd(null);
  }, []);

  const completeSelection = useCallback((from: Cell | null, to: Cell | null) => {
    if (from && to) {
      const cells = cellsBetween(from, to);
      if (cells.length > 1) {
        const word = norm(cells.map((cell) => grid[cell.r]?.[cell.c] ?? '').join(''));
        const reversed = word.split('').reverse().join('');
        const match = banco.find((wordFromBank) => {
          const normalized = norm(wordFromBank);
          return normalized === word || normalized === reversed;
        });
        if (match && !found.includes(norm(match))) {
          setFound((current) => [...current, norm(match)]);
          setHighlighted((current) => [...current, ...cells]);
        }
      }
    }
    cancelSelection();
  }, [banco, cancelSelection, cellsBetween, found, grid]);

  const getCellAtPoint = useCallback((x: number, y: number): Cell | null => {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-sopa-cell]');
    if (!element) return null;
    const row = Number(element.dataset.row);
    const column = Number(element.dataset.column);
    return Number.isInteger(row) && Number.isInteger(column) ? { r: row, c: column } : null;
  }, []);

  const focusCell = useCallback((cell: Cell) => {
    setFocusedCell(cell);
    window.requestAnimationFrame(() => {
      boardRef.current?.querySelector<HTMLButtonElement>(`[data-sopa-cell="${cellKey(cell)}"]`)?.focus();
    });
  }, []);

  const moveFocus = useCallback((cell: Cell, rowDelta: number, columnDelta: number) => {
    const next = {
      r: Math.min(Math.max(cell.r + rowDelta, 0), Math.max(rows - 1, 0)),
      c: Math.min(Math.max(cell.c + columnDelta, 0), Math.max(cols - 1, 0)),
    };
    focusCell(next);
    if (selecting && selectionMode === 'keyboard') setEnd(next);
  }, [cols, focusCell, rows, selecting, selectionMode]);

  const inSelection = cellsBetween(selecting ? start : null, selecting ? end : null);
  const isSelected = (row: number, column: number) => inSelection.some((cell) => cell.r === row && cell.c === column);
  const isHighlighted = (row: number, column: number) => highlighted.some((cell) => cell.r === row && cell.c === column);
  const complete = banco.length > 0 && found.length === banco.length;

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const cell = getCellAtPoint(event.clientX, event.clientY);
    if (!cell || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelecting(true);
    setSelectionMode('pointer');
    setStart(cell);
    setEnd(cell);
    setFocusedCell(cell);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!selecting || selectionMode !== 'pointer') return;
    const cell = getCellAtPoint(event.clientX, event.clientY);
    if (cell) setEnd(cell);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!selecting || selectionMode !== 'pointer') return;
    const cell = getCellAtPoint(event.clientX, event.clientY) ?? end;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    completeSelection(start, cell);
  }

  function handleCellKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, cell: Cell) {
    if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(cell, -1, 0); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(cell, 1, 0); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); moveFocus(cell, 0, -1); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); moveFocus(cell, 0, 1); return; }
    if (event.key === 'Escape' && selecting) { event.preventDefault(); cancelSelection(); return; }
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    if (!selecting) {
      setSelecting(true);
      setSelectionMode('keyboard');
      setStart(cell);
      setEnd(cell);
      return;
    }
    if (selectionMode === 'keyboard') completeSelection(start, cell);
  }

  return (
    <div className="space-y-5">
      <Confetti fire={complete} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">Encontradas: <span className="font-bold text-brand-600">{found.length}/{banco.length}</span></p>
        {found.length > 0 && <Button size="sm" variant="ghost" onClick={() => { setFound([]); setHighlighted([]); cancelSelection(); }}><RotateCcw className="h-4 w-4" /> Reiniciar</Button>}
      </div>

      <p id="sopa-instructions" className="text-sm text-muted">
        En computador, selecciona desde una letra hasta otra. En móvil, toca y desliza. Con teclado, usa las flechas y pulsa Espacio o Enter para iniciar y terminar.
      </p>

      <div className="overflow-x-auto pb-1">
        <div
          ref={boardRef}
          className="inline-block select-none rounded-2xl border-2 border-brand-200 bg-surface p-2 dark:border-brand-500/30"
          style={{ touchAction: selecting ? 'none' : 'pan-y' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={cancelSelection}
          aria-describedby="sopa-instructions"
        >
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className="flex">
              {row.map((character, columnIndex) => {
                const selected = isSelected(rowIndex, columnIndex);
                const highlightedCell = isHighlighted(rowIndex, columnIndex);
                const active = focusedCell.r === rowIndex && focusedCell.c === columnIndex;
                return (
                  <button
                    key={`${rowIndex}-${columnIndex}`}
                    type="button"
                    data-sopa-cell={cellKey({ r: rowIndex, c: columnIndex })}
                    data-row={rowIndex}
                    data-column={columnIndex}
                    tabIndex={active ? 0 : -1}
                    onFocus={() => setFocusedCell({ r: rowIndex, c: columnIndex })}
                    onKeyDown={(event) => handleCellKeyDown(event, { r: rowIndex, c: columnIndex })}
                    aria-pressed={selected || highlightedCell}
                    aria-label={`Fila ${rowIndex + 1}, columna ${columnIndex + 1}, letra ${String(character).toUpperCase()}${highlightedCell ? ', parte de una palabra encontrada' : selected ? ', selección actual' : ''}`}
                    className={cn(
                      'grid h-10 w-10 touch-none place-items-center font-mono text-sm font-bold transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 sm:h-9 sm:w-9',
                      highlightedCell
                        ? 'rounded-full bg-emerald-200 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-200'
                        : selected
                          ? 'rounded-md bg-brand-400 text-white'
                          : 'text-fg hover:bg-brand-50 dark:hover:bg-brand-500/10',
                    )}
                  >
                    {String(character).toUpperCase()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Palabras por encontrar">
        {banco.map((word) => {
          const foundWord = found.includes(norm(word));
          return (
            <span
              key={word}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition',
                foundWord ? 'border-emerald-200 bg-emerald-50 text-emerald-700 line-through dark:bg-emerald-500/15 dark:text-emerald-300' : 'border-border bg-surface-2 text-fg',
              )}
            >
              {foundWord && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {word.toUpperCase()}
            </span>
          );
        })}
      </div>
    </div>
  );
}
