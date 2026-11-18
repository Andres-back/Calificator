import { useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { Confetti } from '@/components/ui/Confetti';
import { cn } from '@/lib/cn';
import { correctOptionIndex, optionText } from './resourceLabels';

interface QuizQuestion {
  numero?: string | number;
  enunciado?: string;
  opciones?: string[];
  respuesta_correcta?: string;
}

interface QuizData {
  instrucciones?: string;
  preguntas?: QuizQuestion[];
}

const letter = (index: number) => String.fromCharCode(65 + index);

/** Quiz rápido para practicar: se responde en pantalla y se comprueba al final. */
export function QuizContent({ data }: { data: QuizData }) {
  const questions = useMemo(() => data.preguntas ?? [], [data.preguntas]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [reveal, setReveal] = useState(false);

  const keys = useMemo(() => questions.map((question) => correctOptionIndex(question.opciones ?? [], question.respuesta_correcta)), [questions]);
  const gradable = keys.filter((key) => key >= 0).length;
  const answered = Object.keys(answers).length;
  const correct = keys.filter((key, index) => key >= 0 && answers[index] === key).length;
  const showKey = checked || reveal;

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100" role="status">
        <p className="font-bold">Este borrador necesita revisión</p>
        <p className="mt-1 leading-6">No se generaron preguntas. Puedes editar el contenido o intentar una nueva generación.</p>
      </div>
    );
  }

  const choose = (questionIndex: number, optionIndex: number) => {
    if (checked) return;
    setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }));
  };
  const restart = () => {
    setAnswers({});
    setChecked(false);
    setReveal(false);
  };

  return (
    <div className="space-y-4">
      <Confetti fire={checked && gradable > 0 && correct === gradable} />
      {data.instrucciones && (
        <p className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm leading-6 text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">{data.instrucciones}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted" aria-live="polite">
          Respondidas: <span className="font-bold text-brand-600">{answered} de {questions.length}</span>
        </p>
        {!checked && (
          <Button size="sm" variant="ghost" className="shrink-0 whitespace-nowrap" onClick={() => setReveal((value) => !value)}>
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {reveal ? 'Ocultar respuestas' : 'Ver respuestas'}
          </Button>
        )}
      </div>

      {questions.map((question, questionIndex) => {
        const options = question.opciones ?? [];
        const key = keys[questionIndex];
        const chosen = answers[questionIndex];
        const number = question.numero ?? questionIndex + 1;
        const labelId = `quiz-pregunta-${questionIndex}`;
        return (
          <section key={questionIndex} className="print-avoid-break rounded-lg border border-border bg-surface p-4">
            <p id={labelId} className="font-semibold leading-6">
              <span className="text-brand-600">{number}.</span> {question.enunciado}
            </p>
            {options.length > 0 ? (
              <div className="mt-3 grid gap-2" role="radiogroup" aria-labelledby={labelId}>
                {options.map((option, optionIndex) => {
                  const selected = chosen === optionIndex;
                  const isKey = showKey && key === optionIndex;
                  const isWrong = checked && selected && key >= 0 && key !== optionIndex;
                  return (
                    <button
                      key={optionIndex}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={checked}
                      data-correct={isKey ? 'true' : undefined}
                      onClick={() => choose(questionIndex, optionIndex)}
                      className={cn(
                        'focus-ring flex min-h-11 w-full items-start gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm leading-6 transition',
                        isKey && 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200',
                        isWrong && 'border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200',
                        !isKey && !isWrong && selected && 'border-brand-500 bg-brand-50 font-semibold dark:bg-brand-500/15',
                        !isKey && !isWrong && !selected && 'border-border bg-surface hover:border-brand-300',
                        checked && 'cursor-default',
                      )}
                    >
                      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-bold text-brand-600 dark:text-brand-300">
                        {isKey ? <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" /> : isWrong ? <XCircle className="h-4 w-4 text-rose-500" aria-hidden="true" /> : null}
                        {letter(optionIndex)})
                      </span>
                      <span className="min-w-0 break-words">{optionText(option, optionIndex)}</span>
                      {isKey && <span className="sr-only"> (respuesta correcta)</span>}
                      {isWrong && <span className="sr-only"> (tu respuesta, incorrecta)</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 space-y-3" aria-label="Espacio para responder">{!showKey ? [0, 1].map((line) => <div key={line} className="border-b border-dashed border-border" />) : null}</div>
            )}
            {checked && options.length > 0 && key >= 0 && (
              <p className={cn('mt-3 text-sm font-semibold', chosen === key ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300')}>
                {chosen === key ? '¡Correcto!' : chosen === undefined ? `Sin responder. La respuesta correcta es la ${letter(key)}.` : `La respuesta correcta es la ${letter(key)}.`}
              </p>
            )}
            {showKey && (options.length === 0 || key < 0) && question.respuesta_correcta && (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"><b>Respuesta:</b> {question.respuesta_correcta}</p>
            )}
          </section>
        );
      })}

      {checked ? (
        <div
          role="status"
          className={cn(
            'flex flex-col gap-3 rounded-xl border-2 p-4 sm:flex-row sm:items-center sm:justify-between',
            gradable > 0 && correct === gradable
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200'
              : 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100',
          )}
        >
          <p className="font-semibold">
            {gradable > 0 && correct === gradable ? '¡Excelente! ' : ''}Acertaste {correct} de {gradable}.
            {correct < gradable && ' Revisa las respuestas marcadas e inténtalo otra vez.'}
          </p>
          <Button size="sm" variant="secondary" className="shrink-0 whitespace-nowrap" onClick={restart}>
            <RotateCcw className="h-4 w-4" /> Intentar de nuevo
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {answered === 0 ? 'Toca una opción en cada pregunta y luego comprueba.' : answered < questions.length ? `Te faltan ${questions.length - answered} por responder.` : '¡Listo! Ya puedes comprobar.'}
          </p>
          <Button className="shrink-0 whitespace-nowrap" disabled={answered === 0 || gradable === 0} onClick={() => { setChecked(true); setReveal(false); }}>
            <Sparkles className="h-4 w-4" /> Comprobar respuestas
          </Button>
        </div>
      )}
    </div>
  );
}
