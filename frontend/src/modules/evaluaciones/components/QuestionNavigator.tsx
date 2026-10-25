import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

export function QuestionNavigator({ questions, activeIndex, onSelect }: {
  questions: { clientId: string; enunciado: string }[]; activeIndex: number; onSelect: (index: number) => void;
}) {
  if (!questions.length) return null;
  return <nav aria-label="Navegar entre preguntas" className="writing-secondary min-w-0 space-y-2 lg:sticky lg:top-0 lg:self-start">
    <div className="flex min-w-0 items-center gap-1">
      <Button variant="outline" className="shrink-0 px-2" aria-label="Pregunta anterior" disabled={activeIndex <= 0} onClick={() => onSelect(activeIndex - 1)}><ArrowLeft className="h-4 w-4" /></Button>
      <select aria-label="Ir a la pregunta" className="focus-ring min-h-12 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 text-base" value={activeIndex} onChange={event => onSelect(Number(event.target.value))}>
        {questions.map((question, index) => <option key={question.clientId} value={index}>{index + 1}. {question.enunciado.slice(0, 65) || 'Sin enunciado'}</option>)}
      </select>
      <Button variant="outline" className="shrink-0 px-2" aria-label="Pregunta siguiente" disabled={activeIndex >= questions.length - 1} onClick={() => onSelect(activeIndex + 1)}><ArrowRight className="h-4 w-4" /></Button>
    </div>
    <ol className="hidden max-h-[45dvh] space-y-1 overflow-y-auto lg:block">
      {questions.map((question, index) => <li key={question.clientId}><button type="button" aria-current={index === activeIndex ? 'step' : undefined} onClick={() => onSelect(index)} className={cn('focus-ring flex min-h-12 w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm', index === activeIndex ? 'border-brand-400 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-100' : 'border-transparent hover:bg-surface-2')}>
        <span className="shrink-0 font-bold">{index + 1}.</span><span className="line-clamp-2 break-words">{question.enunciado || 'Sin enunciado'}</span>
      </button></li>)}
    </ol>
  </nav>;
}
