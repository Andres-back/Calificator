import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { CrucigramaContenido } from '@/types/api';

export function CrucigramaView({ data }: { data: CrucigramaContenido }) {
  const grid = data.crucigrama?.grid ?? [];
  const horiz = useMemo(
    () => data.preguntas_horizontales ?? data.crucigrama?.pistas_horizontal ?? [],
    [data.crucigrama?.pistas_horizontal, data.preguntas_horizontales],
  );
  const vert = useMemo(
    () => data.preguntas_verticales ?? data.crucigrama?.pistas_vertical ?? [],
    [data.crucigrama?.pistas_vertical, data.preguntas_verticales],
  );
  const cols = grid[0]?.length ?? 0;

  const [reveal, setReveal] = useState(false);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState<'h' | 'v'>('h');
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const numbers = useMemo(() => {
    const map: Record<string, number> = {};
    [...horiz, ...vert].forEach((c) => {
      map[`${c.fila}-${c.columna}`] = c.numero;
    });
    return map;
  }, [horiz, vert]);

  const directions = useMemo(() => {
    const map: Record<string, { h?: boolean; v?: boolean }> = {};
    const mark = (r: number, c: number, dir: 'h' | 'v') => {
      const key = `${r}-${c}`;
      map[key] = { ...(map[key] ?? {}), [dir]: true };
    };
    horiz.forEach((clue) => {
      const len = clue.longitud || clue.respuesta?.length || 0;
      for (let i = 0; i < len; i += 1) mark(clue.fila, clue.columna + i, 'h');
    });
    vert.forEach((clue) => {
      const len = clue.longitud || clue.respuesta?.length || 0;
      for (let i = 0; i < len; i += 1) mark(clue.fila + i, clue.columna, 'v');
    });
    return map;
  }, [horiz, vert]);

  const focusCell = (r: number, c: number) => inputRefs.current[`${r}-${c}`]?.focus();
  const isPlayable = (r: number, c: number, dir?: 'h' | 'v') => {
    const filled = grid[r]?.[c] && String(grid[r]?.[c]).trim();
    if (!filled) return false;
    return dir ? Boolean(directions[`${r}-${c}`]?.[dir]) : true;
  };
  const focusRelative = (r: number, c: number, dir = direction, delta = 1) => {
    const nextR = dir === 'h' ? r : r + delta;
    const nextC = dir === 'h' ? c + delta : c;
    if (isPlayable(nextR, nextC, dir)) {
      focusCell(nextR, nextC);
      return;
    }
    const fallback: 'h' | 'v' = dir === 'h' ? 'v' : 'h';
    const altR = fallback === 'h' ? r : r + delta;
    const altC = fallback === 'h' ? c + delta : c;
    if (isPlayable(altR, altC, fallback)) {
      setDirection(fallback);
      focusCell(altR, altC);
    }
  };

  const handleInput = (r: number, c: number, value: string) => {
    const char = value.trim().slice(-1).toUpperCase();
    setEntries((p) => ({ ...p, [`${r}-${c}`]: char }));
    if (char) window.setTimeout(() => focusRelative(r, c), 0);
  };

  const handleFocus = (r: number, c: number) => {
    const dirs = directions[`${r}-${c}`] ?? {};
    if (dirs[direction]) return;
    setDirection(dirs.h ? 'h' : 'v');
  };

  const handleKeyDown = (r: number, c: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setDirection('h'); focusRelative(r, c, 'h', 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setDirection('h'); focusRelative(r, c, 'h', -1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setDirection('v'); focusRelative(r, c, 'v', 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setDirection('v'); focusRelative(r, c, 'v', -1); }
    if (e.key === 'Backspace' && !entries[`${r}-${c}`]) focusRelative(r, c, direction, -1);
  };

  if (grid.length === 0 || cols === 0 || horiz.length + vert.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100" role="status">
        <p className="font-bold">Este crucigrama necesita revisión</p>
        <p className="mt-1">No fue posible construir una grilla y sus pistas. Intenta generarlo nuevamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={reveal ? 'secondary' : 'primary'} onClick={() => setReveal((v) => !v)}>
          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {reveal ? 'Ocultar solución' : 'Ver solución'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEntries({})}>
          <RotateCcw className="h-4 w-4" /> Limpiar
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-0.5 rounded-2xl bg-surface-2 p-3 crucigrama-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r}-${c}`;
              const filled = cell && String(cell).trim();
              const num = numbers[key];
              if (!filled) return <div key={key} className="h-9 w-9 rounded-md bg-transparent" />;
              return (
                <div key={key} className="relative h-9 w-9">
                  {num && <span className="absolute left-0.5 top-0 z-10 text-[8px] font-bold text-brand-600">{num}</span>}
                  <input
                    ref={(node) => { inputRefs.current[key] = node; }}
                    value={reveal ? String(cell).toUpperCase() : entries[key] ?? ''}
                    onChange={(e) => handleInput(r, c, e.target.value)}
                    onFocus={() => handleFocus(r, c)}
                    onKeyDown={(e) => handleKeyDown(r, c, e)}
                    readOnly={reveal}
                    maxLength={1}
                    className={cn(
                      'h-9 w-9 rounded-md border text-center font-mono text-sm font-bold uppercase transition focus-ring',
                      reveal
                        ? 'border-brand-300 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                        : 'border-border bg-surface text-fg focus-visible:border-brand-400',
                    )}
                  />
                </div>
              );
            }),
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 pistas-grid">
        {[
          { title: 'Horizontales', items: horiz },
          { title: 'Verticales', items: vert },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="mb-2 font-display font-bold text-violet-600 dark:text-violet-300">{col.title}</h4>
            <ul className="space-y-1.5">
              {col.items.map((it) => (
                <li key={`${col.title}-${it.numero}`} className="text-sm">
                  <span className="font-bold text-brand-600">{it.numero}.</span> {it.pista}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
