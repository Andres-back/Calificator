import type { MouseEvent, ReactNode } from 'react';
import { ActionMenu, Button } from '@/components/ui';
import { FeedbackMessage } from './FeedbackMessage';

export function IndividualFeedbackSurface({
  name, message, pendingReason, canEdit, blocked, onEdit, actions, link, management,
}: {
  name: string;
  message?: string | null;
  pendingReason?: string | null;
  canEdit: boolean;
  blocked: boolean;
  onEdit: (event: MouseEvent<HTMLButtonElement>) => void;
  actions: Parameters<typeof ActionMenu>[0]['items'];
  link: ReactNode;
  management: ReactNode;
}) {
  return <section className="mx-auto w-full max-w-3xl space-y-4 px-1 py-3 sm:px-4" aria-label={'Retroalimentación de ' + name}>
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Para el estudiante</h3>
      <div className="flex items-center gap-1">
        {canEdit && <Button variant="outline" className="min-h-11" disabled={blocked} aria-label={'Revisar retroalimentación de ' + name} onClick={onEdit}>Editar</Button>}
        {!blocked && <ActionMenu label="Opciones de retroalimentación" items={actions} />}
      </div>
    </header>
    {message ? <FeedbackMessage text={message} presentation="premium" /> : <p className="py-3 text-base text-muted">Todavía no hay retroalimentación guardada.</p>}
    {pendingReason && <p className="text-sm text-muted">{pendingReason}</p>}
    {link}
    {management}
  </section>;
}
