import { BookOpenCheck, CheckCircle2 } from 'lucide-react';

import type { GuiaRevisionItem } from '@/types/api';

export function RevisionGuide({ items }: { items: GuiaRevisionItem[] }) {
  return (
    <section aria-labelledby="revision-guide-title" className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border bg-surface-2 px-4 py-3">
        <h2 id="revision-guide-title" className="flex items-center gap-2 text-base font-bold text-fg">
          <BookOpenCheck className="h-5 w-5 text-brand-600" aria-hidden="true" />
          Guía de revisión
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Compare la evidencia con cada pregunta. La respuesta correcta está resaltada en verde.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-base leading-7 text-muted">
          Esta evaluación no tiene una clave de respuestas registrada.
        </p>
      ) : (
        <ol className="space-y-4 p-4 xl:max-h-[34rem] xl:overflow-y-auto" aria-label="Preguntas y respuestas correctas">
          {items.map((item, index) => (
            <li key={`${item.numero}-${index}`} className="rounded-xl border border-border bg-surface-2 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-base font-bold text-white" aria-label={`Pregunta ${item.numero}`}>
                  {item.numero}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-7 text-fg">{item.enunciado}</p>
                  {item.puntaje != null && (
                    <p className="mt-1 text-sm font-medium text-muted">Valor: {item.puntaje} puntos</p>
                  )}
                </div>
              </div>

              {item.opciones.length > 0 && (
                <ul className="ml-[3.25rem] mt-3 space-y-2 text-sm leading-6 text-muted" aria-label={`Opciones de la pregunta ${item.numero}`}>
                  {item.opciones.map((option, optionIndex) => (
                    <li key={`${option}-${optionIndex}`} className="rounded-lg border border-border bg-surface px-3 py-2">
                      {option}
                    </li>
                  ))}
                </ul>
              )}

              <div className="ml-[3.25rem] mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                  Respuesta correcta
                </p>
                <p className="mt-1 text-base font-semibold leading-7">
                  {item.respuesta_correcta || 'No registrada'}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
