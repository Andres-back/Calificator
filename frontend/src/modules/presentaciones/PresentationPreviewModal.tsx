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
      className="max-w-6xl"
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
          <div className="overflow-hidden rounded-xl border bg-slate-950 shadow-sm">
            <img
              src={active.image_url}
              alt={`Diapositiva ${active.numero}: ${active.titulo}`}
              className="aspect-video max-h-[65vh] w-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{active.titulo}</p>
              <p className="text-xs text-muted">Diapositiva {active.numero} de {slides.length}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrent((value) => Math.max(0, value - 1))} disabled={current === 0}>
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button variant="outline" onClick={() => setCurrent((value) => Math.min(slides.length - 1, value + 1))} disabled={current >= slides.length - 1}>
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Miniaturas de la presentación">
            {slides.map((slide, index) => (
              <button
                key={slide.numero}
                type="button"
                onClick={() => setCurrent(index)}
                className={`w-32 shrink-0 overflow-hidden rounded-lg border-2 text-left transition ${index === current ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                aria-label={`Ver diapositiva ${slide.numero}`}
                aria-current={index === current ? 'true' : undefined}
              >
                <img src={slide.image_url} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                <span className="block truncate px-2 py-1 text-xs">{slide.numero}. {slide.titulo}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
