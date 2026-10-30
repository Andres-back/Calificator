import { ArrowRight, BookOpenText, Lightbulb, ListChecks, Target } from 'lucide-react';
import { feedbackLearningBlocks } from './feedbackSections';
import { feedbackMotifs } from './feedbackMotifs';

export function FeedbackMessage({ text, decorated = true }: { text: string; decorated?: boolean }) {
  const blocks = feedbackLearningBlocks(text);
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
