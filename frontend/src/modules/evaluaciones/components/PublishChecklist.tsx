import { AlertTriangle, CheckCircle2, FileText, Send } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatAllocationScore } from './scoreAllocation';

interface ScoreState {
  total: number;
  maximum: number;
  difference: number;
  matches: boolean;
}

/** Spec 156: compact list of what is left to publish a digitalized draft, each with a way to reach it. */
export function PublishChecklist({
  warnings, pendingQuestions, score, otherIssue, publishing, disabled, error,
  onGoToQuestion, onGoToReading, onReviewOther, onPublish,
}: {
  warnings: string[];
  pendingQuestions: number[];
  score: ScoreState;
  otherIssue: string | null;
  publishing: boolean;
  disabled: boolean;
  error: string | null;
  onGoToQuestion: (index: number) => void;
  onGoToReading: (() => void) | null;
  onReviewOther: () => void;
  onPublish: () => void;
}) {
  const blocking = pendingQuestions.length > 0 || !score.matches || Boolean(otherIssue);
  const item = 'space-y-2 rounded-lg border p-3';
  const warningTone = 'border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100';
  return (
    <section aria-label="Para publicar" className="writing-secondary space-y-3 rounded-2xl border-2 border-brand-200 bg-surface p-3 dark:border-brand-500/30 sm:p-4">
      <div>
        <h3 className="text-base font-bold">Para publicar</h3>
        <p className="text-sm text-muted">Resuelve lo pendiente y publica para empezar a calificar.</p>
      </div>
      <ul className="space-y-2 text-sm leading-6">
        {warnings.length > 0 && (
          <li className={`${item} ${warningTone}`}>
            <p className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 shrink-0" aria-hidden="true" /> Revisa la lectura</p>
            {warnings.map(warning => <p key={warning}>{warning}</p>)}
            {onGoToReading && <Button type="button" variant="outline" className="min-h-11" onClick={onGoToReading}>Ir a la lectura</Button>}
          </li>
        )}
        <li className={`${item} ${pendingQuestions.length ? warningTone : 'border-border'}`}>
          {pendingQuestions.length ? <>
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {pendingQuestions.length === 1 ? 'Falta completar 1 pregunta' : `Faltan completar ${pendingQuestions.length} preguntas`}</p>
            <p>Escribe o confirma su respuesta correcta.</p>
            <div className="flex flex-wrap gap-2">
              {pendingQuestions.map(index => (
                <Button key={index} type="button" variant="outline" className="min-h-11" aria-label={`Ir a la pregunta ${index + 1}`} onClick={() => onGoToQuestion(index)}>
                  Pregunta {index + 1}
                </Button>
              ))}
            </div>
          </> : <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> Todas las preguntas tienen su respuesta correcta.</p>}
        </li>
        <li className={`${item} ${score.matches ? 'border-border' : warningTone}`}>
          <p className="flex items-center gap-2">
            {score.matches
              ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              : <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span>
              Suma de puntos: {formatAllocationScore(score.total)} de {formatAllocationScore(score.maximum)}.{' '}
              {score.matches ? 'Coincide con la nota máxima.' : `${score.difference > 0 ? 'Sobran' : 'Faltan'} ${formatAllocationScore(Math.abs(score.difference))}.`}
            </span>
          </p>
          {!score.matches && <Button type="button" variant="outline" className="min-h-11" onClick={() => onGoToQuestion(0)}>Revisar puntos</Button>}
        </li>
        {otherIssue && (
          <li className={`${item} ${warningTone}`}>
            <p>{otherIssue}</p>
            <Button type="button" variant="outline" className="min-h-11" onClick={onReviewOther}>Revisar</Button>
          </li>
        )}
      </ul>
      {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-950 dark:bg-rose-500/10 dark:text-rose-100">No se pudo publicar: {error}</p>}
      {!blocking && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Todo listo para publicar.</p>
          <Button type="button" variant="success" className="w-full sm:w-auto" loading={publishing} disabled={disabled} onClick={onPublish}
            icon={<Send className="h-4 w-4" />}>Publicar y empezar a calificar</Button>
        </div>
      )}
    </section>
  );
}
