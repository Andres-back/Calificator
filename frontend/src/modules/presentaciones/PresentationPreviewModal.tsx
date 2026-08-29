import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Button, Modal, QueryError, Skeleton } from '@/components/ui';
import { getPresentacionPreview } from './api';

interface PresentationPreviewModalProps {
  presentation: { id: string; title: string } | null;
  onClose: () => void;
}

export function PresentationPreviewModal({ presentation, onClose }: PresentationPreviewModalProps) {
  const [current, setCurrent] = useState(0);
  const preview = useQuery({
    queryKey: ['presentation-preview', presentation?.id],
    queryFn: () => getPresentacionPreview(presentation!.id),
    enabled: Boolean(presentation),
    retry: false,
  });

  useEffect(() => setCurrent(0), [presentation?.id]);

  const slides = preview.data?.slides ?? [];
  const active = slides[current];

  return (
    <Modal
      open={Boolean(presentation)}
      onClose={onClose}
      title={presentation ? `Vista previa: ${presentation.title}` : 'Vista previa'}
      className="max-w-7xl"
    >
      {preview.isLoading ? (
        <div className="space-y-3"><Skeleton className="aspect-video w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : preview.isError ? (
        <QueryError error={preview.error} onRetry={() => void preview.refetch()} />
      ) : !active ? (
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed text-center text-muted">
          <div><Eye className="mx-auto mb-2 h-8 w-8" /><p>Esta presentación todavía no tiene diapositivas disponibles.</p></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[radial-gradient(circle_at_top,#25304a_0%,#0f172a_50%,#020617_100%)] p-2 shadow-2xl sm:p-4">
            <img
              src={active.image_url}
              alt={`Diapositiva ${active.numero}: ${active.titulo}`}
              className="aspect-video max-h-[68vh] w-full rounded-xl object-contain"
            />
            <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-slate-950/75 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur sm:right-6 sm:top-6">
              {active.numero} / {slides.length}
            </span>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-brand-600 dark:text-brand-300">Ahora estás viendo</p>
              <p className="mt-1 font-display text-base font-bold text-fg">{active.titulo}</p>
              <p className="mt-0.5 text-xs text-muted" aria-live="polite">Diapositiva {active.numero} de {slides.length}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setCurrent((value) => Math.max(0, value - 1))} disabled={current === 0}>
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button variant="primary" className="flex-1 sm:flex-none" onClick={() => setCurrent((value) => Math.min(slides.length - 1, value + 1))} disabled={current >= slides.length - 1}>
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex snap-x gap-3 overflow-x-auto rounded-2xl border border-border bg-surface-2 p-3 pb-4" aria-label="Miniaturas de la presentación">
            {slides.map((slide, index) => (
              <button
                key={slide.numero}
                type="button"
                onClick={() => setCurrent(index)}
                className={`w-36 shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-surface text-left shadow-sm transition sm:w-40 ${index === current ? 'border-primary ring-4 ring-primary/15' : 'border-border opacity-75 hover:border-primary/50 hover:opacity-100'}`}
                aria-label={`Ver diapositiva ${slide.numero}`}
                aria-current={index === current ? 'true' : undefined}
              >
                <img src={slide.image_url} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                <span className="block truncate px-2.5 py-2 text-xs font-semibold">{slide.numero}. {slide.titulo}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
