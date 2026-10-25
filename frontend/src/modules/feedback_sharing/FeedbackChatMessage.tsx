import { BookOpen, Footprints, Lightbulb, Sparkles, UserRound } from 'lucide-react';
import { RichContent } from '@/components/ui/RichContent';
import { normalizeChatMarkdown } from './chatMarkdown';

export function FeedbackChatMessage({ question, answer }: { question: string; answer: string | null }) {
  const normalized = normalizeChatMarkdown(answer ?? '');
  const blocks = /```|\$\$/.test(normalized) ? [normalized] : normalized.split(/\n{2,}(?=(?:\*\*)?(?:Paso concreto|Siguiente paso|Ejemplo(?: nuevo)?|Explicación)\s*:)/i);
  return <article className="min-w-0 space-y-3 [overflow-wrap:anywhere]" aria-label="Pregunta y respuesta">
    <div className="ml-4 rounded-2xl rounded-tr-sm border border-brand-300/40 bg-brand-500/10 p-3 sm:ml-10 sm:p-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-bold text-brand-700 dark:text-brand-200"><UserRound className="h-4 w-4" aria-hidden="true" />Tu pregunta</p>
      <p className="whitespace-pre-wrap text-sm leading-6">{question}</p>
    </div>
    {answer && <div className="mr-2 rounded-2xl rounded-tl-sm border border-border bg-surface p-3 shadow-sm sm:mr-8 sm:p-4">
      <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-700 dark:text-brand-200"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
        <div><p className="text-sm font-bold">Respuesta de Xali</p><p className="text-xs text-muted">Entiende tu resultado y sigue practicando</p></div>
      </div>
      <div className="space-y-3">{blocks.map((block, index) => {
        const step = /^(?:\*\*)?(?:Paso concreto|Siguiente paso)\s*:/i.test(block);
        const example = /^(?:\*\*)?Ejemplo(?: nuevo)?\s*:/i.test(block);
        const Icon = step ? Footprints : example ? Lightbulb : BookOpen;
        return <div key={index} className={step || example ? 'flex min-w-0 items-start gap-2 rounded-xl border border-brand-300/30 bg-brand-500/5 p-3' : 'min-w-0'}>
          {(step || example) && <Icon className="mt-1 h-4 w-4 shrink-0 text-brand-700 dark:text-brand-200" aria-hidden="true" />}
          <RichContent content={block} policy="public-feedback" className="flex-1 text-sm leading-7 text-fg" />
        </div>;
      })}</div>
    </div>}
  </article>;
}
