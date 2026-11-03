import { Printer, Share2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ReactNode } from 'react';

export function FeedbackSelectionBar({ count, hiddenCount, busy, onShare, onPrint, showShare = true, copyAction }: {
  count: number; hiddenCount: number; busy: boolean; onShare: (trigger: HTMLButtonElement) => void; onPrint: (trigger: HTMLButtonElement) => void;
  showShare?: boolean; copyAction?: ReactNode;
}) {
  return <footer className="shrink-0 border-t border-border bg-surface p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:p-4" data-feedback-actions>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold" role="status">{count} {count === 1 ? 'seleccionado' : 'seleccionados'}{hiddenCount > 0 ? ` · ${hiddenCount} fuera del filtro` : ''}</p>
      <div className="flex min-w-0 max-w-full flex-wrap gap-2">{copyAction}{showShare && <Button className="h-auto min-h-11 max-w-full whitespace-normal px-[12px] py-2 [overflow-wrap:normal]" disabled={busy || !count} onClick={event => onShare(event.currentTarget)}><Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />Generar enlaces</Button>}<Button className="h-auto min-h-11 max-w-full whitespace-normal px-[12px] py-2 [overflow-wrap:normal]" variant="outline" disabled={busy || !count} onClick={event => onPrint(event.currentTarget)}><Printer className="h-4 w-4 shrink-0" aria-hidden="true" />Preparar impresión</Button></div>
    </div>
  </footer>;
}
