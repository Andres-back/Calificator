import { Printer, Share2 } from 'lucide-react';
import { Button } from '@/components/ui';

export function FeedbackSelectionBar({ count, hiddenCount, busy, onShare, onPrint }: {
  count: number; hiddenCount: number; busy: boolean; onShare: (trigger: HTMLButtonElement) => void; onPrint: (trigger: HTMLButtonElement) => void;
}) {
  return <footer className="shrink-0 border-t border-border bg-surface p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:p-4" data-feedback-actions>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold" role="status">{count} {count === 1 ? 'seleccionado' : 'seleccionados'}{hiddenCount > 0 ? ` · ${hiddenCount} fuera del filtro` : ''}</p>
      <div className="flex flex-wrap gap-2"><Button disabled={busy || !count} onClick={event => onShare(event.currentTarget)}><Share2 className="h-4 w-4" aria-hidden="true" />Compartir</Button><Button variant="outline" disabled={busy || !count} onClick={event => onPrint(event.currentTarget)}><Printer className="h-4 w-4" aria-hidden="true" />Preparar impresión</Button></div>
    </div>
  </footer>;
}
