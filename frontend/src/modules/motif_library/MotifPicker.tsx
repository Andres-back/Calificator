import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import { listCollections, listMotifs } from './api';
import { collectionForArea } from './motifLibrary';
import type { Motif } from './types';

interface Props {
  suggestedArea?: string | null;
  onSelect: (motif: Motif) => void;
  onCancel: () => void;
  onMix?: (collection: string) => void;
  disabled?: boolean;
}

export function MotifPicker({ suggestedArea, onSelect, onCancel, onMix, disabled = false }: Props) {
  const id = useId();
  const [chosen, setChosen] = useState(() => collectionForArea(suggestedArea));
  const [offset, setOffset] = useState(0);
  const collections = useQuery({ queryKey: ['motif-collections'], queryFn: listCollections, staleTime: Infinity });
  const collection = collections.data?.collections.some(item => item.id === chosen) ? chosen : 'general';
  const page = useQuery({ queryKey: ['motifs', collection, offset], queryFn: () => listMotifs(collection, offset), enabled: Boolean(collections.data), staleTime: Infinity });
  const waiting = collections.isPending || page.isPending;
  const failed = collections.isError || page.isError;
  return <section aria-label="Biblioteca de motivos" className="min-w-0 space-y-3">
    <label htmlFor={id} className="block text-sm font-semibold">Área de los motivos</label>
    <select id={id} disabled={disabled || !collections.data} value={collection} onChange={event => { setChosen(event.target.value); setOffset(0); }} className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-base">
      {(collections.data?.collections ?? [{ id: 'general', label: 'Generales', total: 20 }]).map(item => <option key={item.id} value={item.id}>{item.label} ({item.total})</option>)}
    </select>
    {onMix && <Button variant="outline" disabled={disabled || waiting || failed || !page.data?.total} onClick={() => onMix(collection)}>Variar diseños de esta área</Button>}
    {failed ? <div role="alert" className="space-y-2 rounded-xl border border-border p-3 text-sm">
      <p>No pudimos cargar los motivos. Puedes volver a intentarlo o continuar sin decoración.</p>
      <Button variant="outline" onClick={() => { if (collections.isError) void collections.refetch(); else void page.refetch(); }}>Volver a intentar</Button>
    </div> : waiting ? <p role="status" className="text-sm text-muted">Cargando motivos…</p> : <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {page.data?.items.slice(0, 12).map(item => <button key={item.id} type="button" disabled={disabled} aria-label={item.label} onClick={() => onSelect(item)} className="focus-ring flex min-h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface p-2 text-sm">
          <img src={item.thumbnail_url} alt="" loading="lazy" className="h-16 w-16 object-contain" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
          <span className="max-w-full break-words text-center">{item.label}</span>
        </button>)}
      </div>
      {!page.data?.items.length && <p className="text-sm text-muted">No hay motivos en esta página. Elige otra área o vuelve a la anterior.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" aria-label="Página anterior de motivos" disabled={disabled || offset === 0} onClick={() => setOffset(value => Math.max(0, value - 12))}>Anterior</Button>
        <span role="status" className="text-sm text-muted">{page.data?.total ? `${offset + 1}–${Math.min(offset + 12, page.data.total)} de ${page.data.total}` : '0 motivos'}</span>
        <Button variant="outline" aria-label="Siguiente página de motivos" disabled={disabled || !page.data || offset + 12 >= page.data.total} onClick={() => setOffset(value => value + 12)}>Siguiente</Button>
      </div>
    </>}
    <Button variant="ghost" disabled={disabled} onClick={onCancel}>Cancelar selección</Button>
  </section>;
}
