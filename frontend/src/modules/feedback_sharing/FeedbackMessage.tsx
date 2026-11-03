import { ArrowRight, BookOpenText, Lightbulb, ListChecks, Target } from 'lucide-react';
import { feedbackLearningBlocks } from './feedbackSections';
import { feedbackMotifs } from './feedbackMotifs';
import { RichContent } from '@/components/ui/RichContent';

export function FeedbackMessage({ text, decorated = true, presentation = 'default' }: { text: string; decorated?: boolean; presentation?: 'default' | 'premium' }) {
  const blocks = feedbackLearningBlocks(text);
  if (presentation === 'premium') {
    const accents = {
      strength: ['Lo que hiciste bien', Lightbulb, 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'],
      improvement: ['Qué puedes mejorar', Target, 'bg-amber-500/10 text-amber-800 dark:text-amber-300'],
      practice: ['Tu siguiente paso', ArrowRight, 'bg-brand-500/10 text-brand-700 dark:text-brand-200'],
    } as const;
    const body = (value: string) => /\*\*|^\s*[-#>]\s/m.test(value)
      ? <RichContent policy="public-feedback" content={value} className="!text-base !leading-7 text-fg" />
      : <p className="whitespace-pre-wrap text-base leading-7">{value}</p>;
    return <div data-feedback-message className="min-w-0 divide-y divide-border [overflow-wrap:anywhere]">
      {blocks.flatMap((block) => [{ kind: block.kind, title: block.title, text: block.text },
        ...block.steps.map(step => ({ kind: 'practice' as const, title: 'Tu siguiente paso', text: step }))]).map((block, index) => {
        const accent = block.kind === 'summary' || block.kind === 'question' ? null : accents[block.kind];
        const Icon = accent?.[1] ?? ListChecks;
        return <section key={index} data-feedback-block className="flex min-w-0 gap-3 py-4 sm:gap-4 sm:py-5">
          {block.kind !== 'summary' && <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${accent?.[2] ?? 'bg-surface-2 text-muted'}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>}
          <div className="min-w-0 flex-1 space-y-1">
            {block.kind !== 'summary' && <h4 className="text-base font-bold">{accent?.[0] ?? block.title}</h4>}
            {body(block.text)}
          </div>
        </section>;
      })}
    </div>;
  }
  return <div className="min-w-0 space-y-4 [overflow-wrap:anywhere]" data-feedback-message>
    {decorated && <div className="flex items-center gap-3 py-1">
      <img src={feedbackMotifs.find(item => item.id === 'libro')!.src} alt="" aria-hidden="true" width={48} height={48} loading="lazy" className="h-12 w-12 shrink-0 object-contain" onError={event => { event.currentTarget.style.display = 'none'; }} />
      <div><p className="text-sm font-semibold">Aprende paso a paso</p><p className="text-xs leading-5 text-muted">Lee las observaciones y prueba las recomendaciones.</p></div>
    </div>}
    {blocks.map((section, index) => {
      const Icon = section.kind === 'strength' ? Lightbulb : section.kind === 'practice' ? ArrowRight : section.kind === 'improvement' ? Target : section.kind === 'question' ? ListChecks : BookOpenText;
      return <section key={index} className={`min-w-0 space-y-2 ${section.kind === 'summary' ? '' : 'rounded-xl border border-border bg-surface-2/60 p-3 sm:p-4'}`}>
        <h4 className="flex items-center gap-2 text-sm font-bold"><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />{section.title}</h4>
        {section.text && <p className="whitespace-pre-wrap text-base leading-7">{section.text}</p>}
        {section.steps.length > 0 && <div className="mt-3 space-y-2 border-l-2 border-primary/40 pl-3">
          <p className="flex items-center gap-2 text-sm font-semibold"><ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />Para practicar</p>
          {section.steps.map((step, stepIndex) => <p key={stepIndex} className="whitespace-pre-wrap text-base leading-7">{step}</p>)}
        </div>}
      </section>;
    })}
  </div>;
}
