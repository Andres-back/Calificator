import { CheckCircle2, Circle, Send } from 'lucide-react';

import { Badge, Button, Card, Field, Input, RichContent, Textarea } from '@/components/ui';

type Question = Record<string, unknown>;

function questionNumber(question: Question, index: number): number {
  const parsed = Number(question.numero ?? index + 1);
  return Number.isFinite(parsed) ? parsed : index + 1;
}

function questionText(question: Question, index: number): string {
  for (const key of ['enunciado', 'pregunta', 'texto', 'descripcion', 'nombre']) {
    const value = question[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return `Pregunta ${index + 1}`;
}

function questionOptions(question: Question): string[] {
  if (Array.isArray(question.opciones)) return question.opciones.map(String).filter(Boolean);
  return question.tipo === 'verdadero_falso' ? ['Verdadero', 'Falso'] : [];
}

interface Props {
  questions: Question[];
  answers: Record<number, string>;
  onAnswerChange: (number: number, value: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
  retry?: boolean;
  firstIncomplete?: number | null;
  draftSaved?: boolean;
}

export function StudentAnswerSheet({
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  submitting = false,
  retry = false,
  firstIncomplete = null,
  draftSaved = false,
}: Props) {
  const answered = questions.filter((question, index) => {
    const number = questionNumber(question, index);
    return Boolean((answers[number] ?? '').trim());
  }).length;
  const percentage = questions.length ? Math.round((answered / questions.length) * 100) : 0;

  return (
    <Card className="space-y-5 border-brand-200 p-4 dark:border-brand-500/30 sm:p-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Resuelve paso a paso</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Cada pregunta aparece junto a su respuesta. Puedes avanzar a tu ritmo.</p>
          </div>
          <Badge tone={answered === questions.length ? 'success' : 'brand'} className="self-start">
            {answered} de {questions.length} respondidas
          </Badge>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-label={`${percentage}% completado`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-[width] duration-300" style={{ width: `${percentage}%` }} />
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Navegación entre preguntas">
          {questions.map((question, index) => {
            const number = questionNumber(question, index);
            const completed = Boolean((answers[number] ?? '').trim());
            return (
              <a
                key={number}
                href={`#respuesta-${number}`}
                className={`focus-ring inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-full border px-3 text-sm font-bold transition ${completed ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-border bg-surface text-secondary hover:border-brand-300'}`}
                aria-label={`Ir a la pregunta ${number}${completed ? ', respondida' : ', pendiente'}`}
              >
                {completed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}
                {number}
              </a>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => {
          const number = questionNumber(question, index);
          const options = questionOptions(question);
          const type = String(question.tipo ?? 'abierta');
          const incomplete = firstIncomplete === number;
          return (
            <article
              key={number}
              id={`respuesta-${number}`}
              className={`scroll-mt-24 rounded-2xl border p-4 transition sm:p-5 ${incomplete ? 'border-rose-400 bg-rose-50/60 ring-2 ring-rose-100 dark:bg-rose-500/10 dark:ring-rose-500/10' : 'border-border bg-surface-2/40'}`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">Pregunta {number}</p>
                {(answers[number] ?? '').trim() && <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Respondida</span>}
              </div>
              <RichContent content={questionText(question, index)} variant="evaluation" className="mb-5" />
              {options.length > 0 ? (
                <fieldset className="space-y-2" disabled={submitting}>
                  <legend className="sr-only">Respuesta de la pregunta {number}</legend>
                  {options.map((option) => (
                    <label key={option} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${answers[number] === option ? 'border-brand-400 bg-brand-50 font-semibold text-brand-950 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-100' : 'border-border bg-surface hover:border-brand-300'}`}>
                      <input type="radio" name={`question-${number}`} value={option} checked={answers[number] === option} onChange={() => onAnswerChange(number, option)} />
                      <span>{option}</span>
                    </label>
                  ))}
                </fieldset>
              ) : type === 'completar' ? (
                <Field label="Tu respuesta">
                  <Input value={answers[number] ?? ''} onChange={(event) => onAnswerChange(number, event.target.value)} disabled={submitting} aria-describedby={incomplete ? `error-${number}` : undefined} />
                </Field>
              ) : (
                <Field label="Tu respuesta">
                  <Textarea value={answers[number] ?? ''} onChange={(event) => onAnswerChange(number, event.target.value)} className="min-h-32 text-base leading-6" disabled={submitting} aria-describedby={incomplete ? `error-${number}` : undefined} />
                </Field>
              )}
              {incomplete && <p id={`error-${number}`} className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-300">Completa esta respuesta antes de entregar.</p>}
            </article>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold">{answered === questions.length ? 'Todo está listo para revisar' : `Te faltan ${questions.length - answered} ${questions.length - answered === 1 ? 'respuesta' : 'respuestas'}`}</p>
          <p className="mt-1 text-xs text-muted">{draftSaved ? 'Borrador guardado en esta pestaña.' : 'Tus respuestas se guardarán mientras trabajas.'}</p>
        </div>
        <Button onClick={onSubmit} loading={submitting} disabled={submitting || questions.length === 0} className="min-h-12 w-full px-6 sm:w-auto">
          <Send className="h-4 w-4" /> {retry ? 'Revisar respuestas y reenviar' : 'Revisar respuestas y entregar'}
        </Button>
      </div>
    </Card>
  );
}
