import { feedbackSections } from './feedbackSections';

export function FeedbackMessage({ text }: { text: string }) {
  return <div className="space-y-3 [overflow-wrap:anywhere]">
    {feedbackSections(text).map((section, index) => <section key={index} className="min-w-0 space-y-1">
      <h4 className="text-sm font-semibold">{section.title}</h4>
      <p className="whitespace-pre-wrap text-sm leading-6">{section.text}</p>
    </section>)}
  </div>;
}
