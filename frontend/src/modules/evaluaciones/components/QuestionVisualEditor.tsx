import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Field, Input, Modal, Textarea } from '@/components/ui';
import { useMobileFormViewport } from '@/hooks/useMobileFormViewport';
import { toApiError } from '@/lib/api';
import { MotifPicker } from '@/modules/motif_library/MotifPicker';
import { motifFile } from '@/modules/motif_library/api';
import type { Motif } from '@/modules/motif_library/types';
import type { EvaluationVisualChart, EvaluationVisualTable } from '@/types/api';
import { cancelVisualJob, createStructuredVisual, cropVisual, generateVisual, getVisualProposal, readVisualJob, uploadVisual, type TeacherVisualBlock, type VisualRequest } from '../visualApi';

type Kind = VisualRequest['tipo'];
function ProposalImage({ id, onReady }: { id: string; onReady?: (ready: boolean) => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); let current = '';
    void getVisualProposal(id, controller.signal).then(blob => {
      if (!controller.signal.aborted) { current = URL.createObjectURL(blob); setUrl(current); }
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => { controller.abort(); if (current) URL.revokeObjectURL(current); };
  }, [id, attempt]);
  return error ? <div><p role="alert">No pudimos abrir la propuesta. No se ha añadido a la evaluación; tus datos siguen disponibles.</p><Button variant="outline" onClick={() => { onReady?.(false); setError(false); setUrl(''); setAttempt(value => value + 1); }}>Volver a abrir propuesta</Button></div>
    : url ? <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted">Material de esta pregunta, no la evaluación completa.</p><Button variant="outline" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Ajustar material' : 'Ampliar material'}</Button></div>
      <div className="max-h-[70dvh] max-w-full overflow-auto rounded-lg border border-border bg-surface-2 p-2" tabIndex={0} role="region" aria-label="Vista ampliable del material">
        <img src={url} alt="Vista previa del material propuesto" onLoad={() => onReady?.(true)} onError={() => { setError(true); onReady?.(false); }} className={expanded ? 'mx-auto w-[max(100%,50rem)] max-w-none object-contain' : 'mx-auto max-h-[55dvh] max-w-full object-contain'} />
      </div>
    </div> : <p role="status">Abriendo propuesta…</p>;
}

function StructuredFields({ kind, table, chart, onTable, onChart }: {
  kind: Kind; table: EvaluationVisualTable; chart: EvaluationVisualChart;
  onTable: (value: EvaluationVisualTable) => void; onChart: (value: EvaluationVisualChart) => void;
}) {
  if (kind === 'tabla') return <div className="space-y-3">
    <div className="max-w-full overflow-x-auto" role="region" aria-label="Editar tabla" tabIndex={0}><table className="text-sm"><thead><tr>
      {table.encabezados.map((heading, column) => <th key={column} className="min-w-36 p-1"><Input aria-label={`Encabezado ${column + 1}`} value={heading} maxLength={500} onChange={event => onTable({ ...table, encabezados: table.encabezados.map((value, index) => index === column ? event.target.value : value) })} /></th>)}
    </tr></thead><tbody>{table.filas.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column} className="p-1"><Input aria-label={`Fila ${index + 1}, columna ${column + 1}`} value={cell} maxLength={2000} onChange={event => onTable({ ...table, filas: table.filas.map((values, i) => i === index ? values.map((value, j) => j === column ? event.target.value : value) : values) })} /></td>)}</tr>)}</tbody></table></div>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => onTable({ ...table, filas: [...table.filas, table.encabezados.map(() => '')] })} disabled={table.filas.length >= 60}>Añadir fila</Button>
      <Button variant="outline" onClick={() => onTable({ ...table, encabezados: [...table.encabezados, `Columna ${table.encabezados.length + 1}`], filas: table.filas.map(row => [...row, '']) })} disabled={table.encabezados.length >= 12}>Añadir columna</Button>
      <Button variant="ghost" disabled={table.filas.length <= 1} onClick={() => onTable({ ...table, filas: table.filas.slice(0, -1) })}>Quitar última fila</Button>
      <Button variant="ghost" disabled={table.encabezados.length <= 1} onClick={() => onTable({ ...table, encabezados: table.encabezados.slice(0, -1), filas: table.filas.map(row => row.slice(0, -1)) })}>Quitar última columna</Button></div>
    <Field label="Unidad de la tabla (opcional)"><Input value={table.unidad || ''} onChange={event => onTable({ ...table, unidad: event.target.value || null })} /></Field>
  </div>;
  return <div className="space-y-3">
    <Field label="Tipo de gráfica"><select className="min-h-11 w-full rounded-lg border border-border bg-surface px-3" value={chart.tipo} onChange={event => onChart({ ...chart, tipo: event.target.value as EvaluationVisualChart['tipo'] })}><option value="barras">Barras</option><option value="lineas">Líneas</option><option value="circular">Circular (una serie)</option></select></Field>
    <div className="max-w-full overflow-x-auto" role="region" aria-label="Datos de la gráfica" tabIndex={0}><table className="text-sm"><thead><tr><th className="min-w-36 p-1">Categoría</th>{chart.series.map((series, index) => <th className="min-w-36 p-1" key={index}><Input aria-label={`Nombre de serie ${index + 1}`} value={series.nombre} onChange={event => onChart({ ...chart, series: chart.series.map((value, i) => i === index ? { ...value, nombre: event.target.value } : value) })} /></th>)}</tr></thead>
      <tbody>{chart.categorias.map((category, index) => <tr key={index}><td className="p-1"><Input aria-label={`Categoría ${index + 1}`} value={category} onChange={event => onChart({ ...chart, categorias: chart.categorias.map((value, i) => i === index ? event.target.value : value) })} /></td>{chart.series.map((series, s) => <td className="p-1" key={s}><Input type="number" step="any" aria-label={`Valor ${index + 1} de serie ${s + 1}`} value={Number.isFinite(series.valores[index]) ? series.valores[index] : ''} onChange={event => onChart({ ...chart, series: chart.series.map((value, i) => i === s ? { ...value, valores: value.valores.map((number, j) => j === index ? event.target.value === '' ? NaN : Number(event.target.value) : number) } : value) })} /></td>)}</tr>)}</tbody></table></div>
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={chart.categorias.length >= 30} onClick={() => onChart({ ...chart, categorias: [...chart.categorias, `Categoría ${chart.categorias.length + 1}`], series: chart.series.map(series => ({ ...series, valores: [...series.valores, 0] })) })}>Añadir categoría</Button>
      <Button variant="outline" disabled={chart.tipo === 'circular' || chart.series.length >= 6} onClick={() => onChart({ ...chart, series: [...chart.series, { nombre: `Serie ${chart.series.length + 1}`, valores: chart.categorias.map(() => 0) }] })}>Añadir serie</Button>
      <Button variant="ghost" disabled={chart.categorias.length <= 1} onClick={() => onChart({ ...chart, categorias: chart.categorias.slice(0, -1), series: chart.series.map(series => ({ ...series, valores: series.valores.slice(0, -1) })) })}>Quitar última categoría</Button>
      <Button variant="ghost" disabled={chart.series.length <= 1} onClick={() => onChart({ ...chart, series: chart.series.slice(0, -1) })}>Quitar última serie</Button></div>
    {(['eje_x', 'eje_y', 'unidad'] as const).map(key => <Field key={key} label={key === 'eje_x' ? 'Etiqueta horizontal' : key === 'eje_y' ? 'Etiqueta vertical' : 'Unidad'}><Input value={chart[key] || ''} onChange={event => onChart({ ...chart, [key]: event.target.value || null })} /></Field>)}
  </div>;
}

export function QuestionVisualEditor({ evaluationId, materiaId, questionId, versionId, generationEnabled = false, existing, onAccept, onRemove, onBegin, pendingJobId, onJobChange, suggestedArea }: {
  evaluationId: string; materiaId: string; questionId: string; versionId?: string | null;
  generationEnabled?: boolean; existing?: TeacherVisualBlock; onAccept: (block: TeacherVisualBlock) => void; onRemove?: () => void; onBegin?: () => void;
  pendingJobId?: string; onJobChange?: (id: string | null) => void;
  suggestedArea?: string | null;
}) {
  const [open, setOpen] = useState(Boolean(pendingJobId));
  const [kind, setKind] = useState<Kind>(existing?.tipo === 'tabla' || existing?.tipo === 'grafica' || existing?.tipo === 'dibujo' ? existing.tipo : 'imagen');
  const [description, setDescription] = useState(existing?.descripcion || 'Material de apoyo para esta pregunta');
  const [table, setTable] = useState<EvaluationVisualTable>(existing?.tabla || { encabezados: ['Dato', 'Valor'], filas: [['', '']] });
  const [chart, setChart] = useState<EvaluationVisualChart>(existing?.grafica || { tipo: 'barras', categorias: ['Categoría 1', 'Categoría 2'], series: [{ nombre: 'Cantidad', valores: [1, 2] }] });
  const [proposal, setProposal] = useState<TeacherVisualBlock | null>(null);
  const [clean, setClean] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [jobId, setJobId] = useState<string | null>(pendingJobId || null);
  const [previewReady, setPreviewReady] = useState(false);
  const [library, setLibrary] = useState(false);
  const [purpose, setPurpose] = useState<'academico' | 'decoracion'>('academico');
  const [blackAndWhite, setBlackAndWhite] = useState(true);
  const [transparent, setTransparent] = useState(false);
  const jobChangeRef = useRef(onJobChange); jobChangeRef.current = onJobChange;
  function trackJob(id: string | null) { setJobId(id); jobChangeRef.current?.(id); }
  const [region, setRegion] = useState([0, 0, 100, 100]);
  const sequence = useRef(0);
  const formRef = useRef<HTMLDivElement>(null);
  const mobile = useMobileFormViewport(open, formRef);
  const structured = kind === 'tabla' || kind === 'grafica';
  const scope = { materia_id: materiaId, evaluacion_id: evaluationId, expected_version_id: versionId || null };
  const job = useQuery({ queryKey: ['evaluation-visual-proposal', jobId], queryFn: () => readVisualJob(jobId!), enabled: Boolean(open && jobId), retry: false,
    refetchInterval: query => ['queued', 'running', 'retrying'].includes(query.state.data?.estado || 'queued') ? 2000 : false });
  useEffect(() => {
    if (!jobId || !job.data) return;
    if (job.data.estado === 'success') {
      const block = job.data.resultado_json.bloque;
      if (block && block.pregunta_ids.includes(questionId) && job.data.resultado_json.expected_version_id === (versionId || null)) {
        setProposal(block); setClean(false); setPreviewReady(false); setKind(block.tipo as Kind);
        if (block.tabla) setTable(block.tabla);
        if (block.grafica) setChart(block.grafica);
      } else setError('La evaluación cambió. Abre la versión actual antes de añadir esta propuesta.');
      // Keep the durable ID in the draft until acceptance/cancel, so reload can
      // retrieve this completed (but not yet accepted) proposal without inference.
      setJobId(null); setBusy(false);
    } else if (!['queued', 'running', 'retrying'].includes(job.data.estado)) {
      setError(job.data.error || 'No pudimos preparar el material. Tus datos siguen disponibles.'); trackJob(null); setBusy(false);
    }
  }, [job.data, jobId, versionId, questionId]);
  useEffect(() => { if (job.isError) { setError('No pudimos consultar el avance. Puedes volver a consultarlo o cancelar; tu evaluación sigue igual.'); setBusy(false); } }, [job.isError]);
  useEffect(() => () => { sequence.current += 1; }, []);
  async function close() {
    sequence.current += 1;
    if (jobId) void cancelVisualJob(jobId).catch(() => undefined);
    trackJob(null); setBusy(false); setOpen(false); setProposal(null); setClean(false); setPreviewReady(false); setLibrary(false);
  }
  function change() { sequence.current += 1; setProposal(null); setClean(false); setPreviewReady(false); setError(''); }
  async function prepareLibrary(item: Motif) {
    const token = ++sequence.current;
    setBusy(true); setError(''); setProposal(null); setClean(false); setPreviewReady(false); setLibrary(false);
    try {
      const file = await motifFile(item);
      if (token !== sequence.current) return;
      const resource = await uploadVisual(scope, file, 'imagen');
      if (token !== sequence.current) return;
      const description = `Biblioteca temática: ${item.description}`;
      setKind('imagen'); setDescription(description);
      setProposal({ id: crypto.randomUUID(), tipo: 'imagen', orden: 0, pregunta_ids: [questionId], recurso_id: resource.id, descripcion: description, seguridad_contenido: 'pendiente_revision' });
    } catch {
      if (token === sequence.current) setError('No pudimos preparar esta ilustración. Puedes elegir otra o subir una imagen; tu evaluación sigue igual.');
    } finally { if (token === sequence.current) setBusy(false); }
  }
  async function prepare(mode: 'data' | 'ai' | 'crop', file?: File) {
    const token = ++sequence.current; setBusy(true); setError(''); setProposal(null); setClean(false); setPreviewReady(false);
    try {
      if (description.trim().length < 3) throw new Error('Describe el material que necesitas.');
      const request: VisualRequest = { ...scope, request_key: crypto.randomUUID(), pregunta_id: questionId, tipo: kind, descripcion: description.trim(),
        uso: purpose, blanco_negro: blackAndWhite, fondo_transparente: mode === 'ai' && !structured && transparent };
      let block: TeacherVisualBlock;
      if (mode === 'crop' && existing?.recurso_id) {
        block = (await cropVisual({ ...request, tipo: 'imagen', source_resource_id: existing.recurso_id, region: region.map(value => value / 100) })).bloque;
      } else if (file) {
        if (file.size > 20 * 1024 * 1024) throw new Error('Utiliza una imagen de hasta 20 MB.');
        const imageKind = kind === 'dibujo' ? 'dibujo' : 'imagen';
        const resource = await uploadVisual(scope, file, imageKind);
        block = { id: crypto.randomUUID(), tipo: imageKind, orden: 0, pregunta_ids: [questionId], recurso_id: resource.id, descripcion: description, seguridad_contenido: 'pendiente_revision' };
      } else if (mode === 'ai') {
        const result = await generateVisual(request);
        if (token === sequence.current) trackJob(result.job_id);
        else void cancelVisualJob(result.job_id).catch(() => undefined);
        return;
      } else {
        if (kind === 'grafica' && chart.series.some(series => series.valores.some(value => !Number.isFinite(value)))) throw new Error('Completa todos los valores de la gráfica con números.');
        block = (await createStructuredVisual({ ...request, ...(kind === 'tabla' ? { tabla: table } : { grafica: chart }) })).bloque;
      }
      if (token === sequence.current) { setProposal(block); setClean(false); }
    } catch (cause) {
      if (token === sequence.current) setError(cause instanceof Error && !('isAxiosError' in cause) ? cause.message : toApiError(cause).status === 422 ? toApiError(cause).detail : 'No pudimos preparar el material. Revisa los datos y vuelve a intentarlo; tu edición se conserva.');
    } finally { if (token === sequence.current && mode !== 'ai') setBusy(false); else if (token === sequence.current && !jobId) setBusy(false); }
  }
  return <div className="min-w-0 space-y-2">
    <Button type="button" variant="outline" aria-label={existing ? 'Editar material' : 'Añadir contenido'} onClick={() => { onBegin?.(); setOpen(true); }}>{existing ? 'Editar material' : 'Añadir contenido'}{!existing && <span className="text-xs font-normal"> · figura, tabla o gráfico</span>}</Button>
    {onRemove && <Button variant="ghost" onClick={onRemove}>Quitar material de esta pregunta</Button>}
    {createPortal(<Modal open={open} onClose={() => { void close(); }} title="Material de la pregunta" className="max-w-6xl bg-surface" mobileViewport={mobile.viewport} mobileWriting={mobile.isWriting}>
      <div ref={formRef} className="min-w-0 space-y-4">
        <p className="text-sm text-muted">{proposal ? 'Comprueba el material antes de añadirlo.' : 'Previsualiza el material y comprueba la respuesta correcta. Nada cambia hasta que lo aceptes y guardes la evaluación.'}</p>
        <fieldset hidden={Boolean(proposal)} disabled={busy || Boolean(jobId)} className="min-w-0 space-y-4">
          <Field label="Tipo de material"><select aria-label="Tipo de material" className="min-h-11 w-full rounded-lg border border-border bg-surface px-3" value={kind} onChange={event => { change(); setKind(event.target.value as Kind); }}>
            <option value="imagen">Imagen</option><option value="dibujo">Dibujo</option><option value="tabla">Tabla editable</option><option value="grafica">Gráfica con datos</option></select></Field>
          {!structured && <Field label="Uso de la figura"><select className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base" value={purpose} onChange={event => { change(); setPurpose(event.target.value as 'academico' | 'decoracion'); }}>
            <option value="academico">Necesaria para responder</option><option value="decoracion">Decoración</option></select></Field>}
          <Field label="Descripción del material"><Textarea value={description} maxLength={4000} onChange={event => { change(); setDescription(event.target.value); }} /></Field>
          {existing?.seguridad_contenido === 'privado_original' && existing.recurso_id && <details className="rounded-lg border border-border p-3"><summary className="min-h-11 cursor-pointer font-semibold">Recortar una figura de esta página</summary>
            <ProposalImage id={existing.recurso_id} />
            <p className="my-2 text-sm text-muted">Indica los bordes en porcentaje de la página. El original no cambia. Comprueba que el recorte no incluya respuestas.</p>
            <div className="grid grid-cols-2 gap-2">{['Izquierda', 'Arriba', 'Derecha', 'Abajo'].map((label, index) => <Field key={label} label={`${label} (%)`}><Input type="number" min={0} max={100} value={region[index]} onChange={event => { change(); setRegion(values => values.map((value, i) => i === index ? Number(event.target.value) : value)); }} /></Field>)}</div>
            <Button onClick={() => { void prepare('crop'); }}>Previsualizar recorte</Button></details>}
          {structured ? <><StructuredFields kind={kind} table={table} chart={chart} onTable={value => { change(); setTable(value); }} onChart={value => { change(); setChart(value); }} />
            <Button onClick={() => { void prepare('data'); }}>Previsualizar datos</Button></> : null}
          <Field label={structured ? 'O subir como imagen (sin celdas ni datos editables)' : 'Subir imagen (PNG, JPEG o WebP)'}><input className="block min-h-11 w-full max-w-full text-base" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) void prepare('data', file); event.target.value = ''; }} /></Field>
          <Button variant="outline" onClick={() => setLibrary(value => !value)}>Elegir de la biblioteca</Button>
          {library && <><p className="text-sm text-muted">Ilustraciones temáticas. Comprueba que la imagen sea adecuada para esta pregunta; no reemplaza un gráfico científico ni una respuesta correcta.</p><MotifPicker suggestedArea={suggestedArea} disabled={busy} onSelect={item => { void prepareLibrary(item); }} onCancel={() => setLibrary(false)} /></>}
          {generationEnabled && <div className="space-y-2 rounded-lg border border-border p-3">
            {!structured && <>
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={blackAndWhite} onChange={event => { change(); setBlackAndWhite(event.target.checked); }} />Trazos para imprimir en blanco y negro</label>
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={transparent} onChange={event => { change(); setTransparent(event.target.checked); }} />Solicitar figura sin fondo</label>
              <p className="text-xs leading-5 text-muted">Se crea solo una figura, no una hoja completa. Si el color es necesario para responder, desmarca blanco y negro. El fondo transparente depende del modelo configurado.</p>
            </>}
            <Button variant="outline" onClick={() => { void prepare('ai'); }}>Crear propuesta con IA</Button>
            <p className="text-xs text-muted">Esta acción usa la API de IA. Elegir de la biblioteca o introducir datos no genera una imagen de pago.</p>
          </div>}
        </fieldset>
        {(busy || jobId) && <p role="status">Preparando material… Puedes cancelar sin cambiar la evaluación.</p>}
        {error && <p role="alert" className="rounded-lg border border-amber-300 p-3 text-sm">{error}</p>}
        {job.isError && jobId && <Button variant="outline" onClick={() => { void job.refetch(); }}>Consultar avance</Button>}
        {proposal && <section className="space-y-3 rounded-xl border border-border p-3">
          <ProposalImage key={proposal.recurso_id} id={proposal.recurso_id!} onReady={setPreviewReady} />
          <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" disabled={!previewReady} checked={clean} onChange={event => setClean(event.target.checked)} />He revisado el material: es adecuado para esta pregunta y no contiene respuestas de estudiantes ni soluciones que deban ocultarse.</label>
          <Button disabled={!previewReady || !clean || busy || Boolean(jobId)} onClick={() => { onAccept({ ...proposal, seguridad_contenido: 'publicable_confirmado' }); void close(); }}>Añadir a la pregunta</Button>
          <Button variant="outline" onClick={() => { setProposal(null); setClean(false); }}>Editar antes de añadir</Button>
        </section>}
        <Button variant="outline" onClick={() => { void close(); }}>Cancelar</Button>
      </div>
    </Modal>, document.body)}
  </div>;
}
