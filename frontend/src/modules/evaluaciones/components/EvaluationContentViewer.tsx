import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Modal } from '@/components/ui';
import type { EvaluationVisualBlock, EvaluationVisualManifest, StudentEvaluationVisualContent } from '@/types/api';
import { getEvaluationResource } from '../api';

interface Props {
  evaluationId: string;
  versionId?: string | null;
  content?: EvaluationVisualManifest | StudentEvaluationVisualContent | null;
  questionId?: string;
  /** Only for the authorized teacher's source review, not the student reader. */
  showPrivate?: boolean;
}

function PrivateImage({ evaluationId, versionId, block }: Pick<Props, 'evaluationId' | 'versionId'> & { block: EvaluationVisualBlock }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    if (!block.recurso_id) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setUrl(null); setFailed(false); setExpanded(false); setZoom(1);
    getEvaluationResource(evaluationId, block.recurso_id, versionId, controller.signal)
      .then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
      }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [evaluationId, versionId, block.recurso_id, retry]);
  const description = block.descripcion || 'Material de la pregunta';
  if (failed || !block.recurso_id) return <div role="alert" className="space-y-2 rounded-lg border border-amber-300 p-3 text-sm">
    <p>No pudimos abrir este material. Conserva la evaluación y vuelve a intentarlo.</p>
    <Button type="button" variant="outline" onClick={() => setRetry(value => value + 1)}>Volver a intentar</Button>
  </div>;
  if (!url) return <p role="status" className="py-3 text-sm text-muted">Cargando material…</p>;
  return <>
    <img src={url} alt={description} className="mx-auto h-auto max-h-[65dvh] max-w-full rounded-lg object-contain" />
    <Button type="button" variant="outline" className="mt-2 min-h-11" onClick={() => setExpanded(true)}>Ampliar {description}</Button>
    {createPortal(<Modal open={expanded} onClose={() => setExpanded(false)} title={description}
      className="flex max-h-[95dvh] w-[96vw] max-w-6xl flex-col p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" aria-label="Reducir imagen" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 0.5))}>−</Button>
        <span className="text-sm">{Math.round(zoom * 100)}%</span>
        <Button type="button" variant="outline" aria-label="Aumentar imagen" disabled={zoom >= 4} onClick={() => setZoom(value => Math.min(4, value + 0.5))}>+</Button>
      </div>
      <div className="min-h-0 overflow-auto overscroll-contain rounded-lg bg-surface-2 p-2" tabIndex={0} role="region" aria-label={`Imagen ampliada ${description}`}>
        <img src={url} alt={description} className="h-auto max-w-none" style={{ width: `${zoom * 100}%` }} />
      </div>
    </Modal>, document.body)}
  </>;
}

export function EvaluationContentViewer({ evaluationId, versionId, content, questionId, showPrivate = false }: Props) {
  const blocks = [...(content?.bloques ?? [])].filter(block =>
    (questionId === undefined || block.pregunta_ids.includes(questionId))
    && (showPrivate || !('seguridad_contenido' in block) || block.seguridad_contenido === 'publicable_confirmado'),
  ).sort((a, b) => a.orden - b.orden);
  if (!blocks.length) return null;
  return <div className="min-w-0 max-w-full space-y-4" aria-label="Material de las preguntas">
    {blocks.map(block => <figure key={block.id} className="min-w-0 max-w-full space-y-2 rounded-xl border border-border bg-surface p-3 sm:p-4">
      {block.legible === false && <p className="text-sm text-amber-800 dark:text-amber-200">Este material necesita una imagen más clara.</p>}
      {block.tipo === 'texto' ? <p className="whitespace-pre-wrap break-words text-base leading-7">{block.texto}</p>
        : block.tipo === 'tabla' && block.tabla ? <div role="region" aria-label={`Tabla ${block.descripcion || 'de la pregunta'}`} tabIndex={0} className="max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-sm" style={{ minWidth: Math.max(320, block.tabla.encabezados.length * 160), tableLayout: 'auto' }} aria-label={block.descripcion || 'Tabla de la pregunta'}>
            <thead className="bg-surface-2"><tr>{block.tabla.encabezados.map((heading, index) => <th scope="col" key={index} className="min-w-40 break-normal border-b border-border px-3 py-3 [overflow-wrap:normal]">{heading}</th>)}</tr></thead>
            <tbody>{block.tabla.filas.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column} className="min-w-40 break-normal border-b border-border px-3 py-3 align-top [overflow-wrap:normal]">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div> : <PrivateImage key={`${evaluationId}:${versionId}:${block.recurso_id}`} evaluationId={evaluationId} versionId={versionId} block={block} />}
      {block.grafica && <details><summary className="focus-ring min-h-11 cursor-pointer py-2 text-sm font-semibold">Ver datos de la gráfica</summary>
        <div role="region" aria-label="Datos de la gráfica" tabIndex={0} className="max-w-full overflow-x-auto">
          <table className="w-full text-left text-sm"><thead><tr><th scope="col" className="p-2">{block.grafica.eje_x || 'Categoría'}</th>{block.grafica.series.map((series, index) => <th key={index} scope="col" className="p-2">{series.nombre}</th>)}</tr></thead>
            <tbody>{block.grafica.categorias.map((category, index) => <tr key={index}><th scope="row" className="p-2">{category}</th>{block.grafica!.series.map((series, s) => <td key={s} className="p-2">{series.valores[index]} {block.grafica!.unidad}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </details>}
      {(block.pie || block.descripcion || block.tabla?.unidad) && <figcaption className="break-words text-sm leading-6 text-muted">{block.pie || block.descripcion}{block.tabla?.unidad ? ` · ${block.tabla.unidad}` : ''}</figcaption>}
    </figure>)}
  </div>;
}
