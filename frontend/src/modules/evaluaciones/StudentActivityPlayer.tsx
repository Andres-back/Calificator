import { useCallback, useEffect, useMemo, useState } from 'react';
import { Puzzle } from 'lucide-react';

import { ContenidoView, MatchingView, SopaLetrasView } from '@/modules/herramientas/views';
import type { ToolContent } from '@/modules/herramientas/views/ContenidoView';
import type { MatchingContenido, SopaContenido, StudentActivity } from '@/types/api';

type Answers = Record<number, string>;

interface CrosswordClue {
  numero: number;
  numero_evaluacion: number;
  pista: string;
  fila: number;
  columna: number;
  longitud: number;
  direccion: 'horizontal' | 'vertical';
}

function CrosswordPlayer({ activity, onAnswersChange, readOnly }: { activity: StudentActivity; onAnswersChange: (answers: Answers) => void; readOnly: boolean }) {
  const content = activity.contenido as {
    grid_mascara?: boolean[][];
    pistas_horizontales?: CrosswordClue[];
    pistas_verticales?: CrosswordClue[];
  };
  const grid = content.grid_mascara ?? [];
  const clues = useMemo(
    () => [...(content.pistas_horizontales ?? []), ...(content.pistas_verticales ?? [])],
    [content.pistas_horizontales, content.pistas_verticales],
  );
  const [entries, setEntries] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Answers = {};
    for (const clue of clues) {
      const letters = Array.from({ length: clue.longitud }, (_, offset) => {
        const row = clue.fila + (clue.direccion === 'vertical' ? offset : 0);
        const column = clue.columna + (clue.direccion === 'horizontal' ? offset : 0);
        return entries[`${row}-${column}`] ?? '';
      }).join('');
      next[clue.numero_evaluacion] = letters;
    }
    onAnswersChange(next);
  }, [clues, entries, onAnswersChange]);

  const positions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const clue of clues) map[`${clue.fila}-${clue.columna}`] = clue.numero;
    return map;
  }, [clues]);

  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-950 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100">
        Completa una letra por casilla. Las respuestas se preparan automáticamente para entregar.
      </p>
      <div className="overflow-x-auto pb-2">
        <div className="inline-grid gap-1 rounded-xl bg-surface-2 p-3" style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 0}, 2.5rem)` }}>
          {grid.flatMap((row, rowIndex) => row.map((playable, columnIndex) => {
            const key = `${rowIndex}-${columnIndex}`;
            if (!playable) return <span key={key} className="h-10 w-10" aria-hidden="true" />;
            return (
              <label key={key} className="relative h-10 w-10">
                {positions[key] != null && <span className="pointer-events-none absolute left-1 top-0.5 z-10 text-[9px] font-bold text-brand-700">{positions[key]}</span>}
                <span className="sr-only">Fila {rowIndex + 1}, columna {columnIndex + 1}</span>
                <input
                  aria-label={`Fila ${rowIndex + 1}, columna ${columnIndex + 1}`}
                  value={entries[key] ?? ''}
                  disabled={readOnly}
                  maxLength={1}
                  onChange={(event) => setEntries((current) => ({ ...current, [key]: event.target.value.slice(-1).toUpperCase() }))}
                  className="focus-ring h-10 w-10 rounded-md border border-border bg-surface text-center text-lg font-bold uppercase"
                />
              </label>
            );
          }))}
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          ['Horizontales', content.pistas_horizontales ?? []],
          ['Verticales', content.pistas_verticales ?? []],
        ].map(([title, values]) => (
          <section key={String(title)}>
            <h3 className="font-display text-base font-bold">{String(title)}</h3>
            <ol className="mt-2 space-y-2">
              {(values as CrosswordClue[]).map((clue) => <li key={`${title}-${clue.numero}`} className="text-sm leading-6"><strong>{clue.numero}.</strong> {clue.pista}</li>)}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

export function StudentActivityPlayer({ activity, onAnswersChange, readOnly = false }: { activity: StudentActivity; onAnswersChange: (answers: Answers) => void; readOnly?: boolean }) {
  const normalized = useCallback((value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-ZÑ]/g, ''), []);

  const handleFound = useCallback((found: string[]) => {
    const content = activity.contenido as unknown as SopaContenido;
    const foundSet = new Set(found.map(normalized));
    onAnswersChange(Object.fromEntries((content.banco_palabras ?? []).map((word, index) => [index + 1, foundSet.has(normalized(word)) ? word : ''])));
  }, [activity.contenido, normalized, onAnswersChange]);

  const handleMatches = useCallback((matches: Record<number, string>) => {
    const content = activity.contenido as unknown as MatchingContenido;
    const right = new Map((content.columna_derecha ?? []).map((item) => [item.letra, item.texto]));
    onAnswersChange(Object.fromEntries((content.columna_izquierda ?? []).map((item, index) => {
      const letter = matches[item.numero];
      return [index + 1, letter ? `${letter}) ${right.get(letter) ?? ''}`.trim() : ''];
    })));
  }, [activity.contenido, onAnswersChange]);

  return (
    <section aria-labelledby="interactive-activity-title" className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-surface p-3 sm:p-5">
      <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"><Puzzle className="h-6 w-6" /></span>
        <div><p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">{readOnly ? 'Material asignado' : 'Actividad interactiva'}</p><h2 id="interactive-activity-title" className="font-display text-xl font-bold">{activity.titulo}</h2></div>
      </div>
      {activity.tipo === 'crucigrama' && <CrosswordPlayer activity={activity} onAnswersChange={onAnswersChange} readOnly={readOnly} />}
      {activity.tipo === 'sopa_letras' && <SopaLetrasView data={activity.contenido as unknown as SopaContenido} onFoundChange={readOnly ? undefined : handleFound} />}
      {(activity.tipo === 'emparejar' || activity.tipo === 'unir_columnas') && <MatchingView data={activity.contenido as unknown as MatchingContenido} allowCheck={false} onMatchesChange={readOnly ? undefined : handleMatches} />}
      {!activity.interactivo && <ContenidoView tipo={activity.tipo} data={activity.contenido as unknown as ToolContent} />}
    </section>
  );
}
