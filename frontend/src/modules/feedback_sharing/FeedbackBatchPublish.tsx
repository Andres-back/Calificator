import { useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { formatGradeScore } from '@/modules/calificaciones/gradePresentation';
import { FeedbackMessage } from './FeedbackMessage';
import { publishFeedbackBatch, readFeedbackBatch, type FeedbackBatchResult, type FeedbackBatchResultItem, type FeedbackBatchSelection, type FeedbackPreview } from './api';

interface Row { nombre: string; calificacion_id?: string | null; preview?: FeedbackPreview }
interface Operation { parts: {request_id:string; selecciones:FeedbackBatchSelection[]}[]; cursor:number; results:FeedbackBatchResultItem[]; skipped:number }
export function FeedbackBatchPublish({ evaluationId, rows, selectedIds, signal, valid, disabled=false, onBusy, onCompleted, individual=false }: {
  evaluationId:string; rows:Row[]; selectedIds:string[]; signal:AbortSignal; valid:()=>boolean; disabled?:boolean;
  onBusy:(busy:boolean)=>void; onCompleted:(results:FeedbackBatchResultItem[],skipped:number)=>void|Promise<void>;
  individual?:boolean;
}) {
  const user=useAuth(state=>state.user);
  const [owner]=useState(user?.id);
  const [summary,setSummary]=useState<Row[]|null>(null);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [results,setResults]=useState<FeedbackBatchResultItem[]>([]);
  const operation=useRef<Operation|null>(null);
  const stop=useRef(false);
  const lock=useRef(false);
  const permitted=user?.id===owner && ['profesor','admin'].includes(user?.rol??'') && ['grading.grade','grading.publish'].every(permission=>user?.permissions?.includes(permission));
  const current=()=>permitted && valid() && !signal.aborted && useAuth.getState().user?.id===owner && ['grading.grade','grading.publish'].every(permission=>useAuth.getState().user?.permissions?.includes(permission));
  const available=(items:Row[])=>items.filter(row=>row.calificacion_id && row.preview?.batch_candidate);
  function prepare(items:Row[]) {
    if (!current() || busy || lock.current) return;
    operation.current=null; setSummary(items); setError(''); setResults([]); setStatus('');
  }
  async function run() {
    if (!current() || lock.current || !operation.current) return;
    const op=operation.current;
    lock.current=true;stop.current=false;setBusy(true);onBusy(true);setError('');
    try {
      while(op.cursor<op.parts.length && !stop.current && current()) {
        const part=op.parts[op.cursor];
        let result:FeedbackBatchResult;
        try { result=await publishFeedbackBatch(evaluationId,part,signal); }
        catch {
          if(!current()) return;
          // A lost response is not proof that the server rolled back.
          result=await readFeedbackBatch(evaluationId,part.request_id,signal);
        }
        if(!current()) return;
        if(result.total!==part.selecciones.length || part.selecciones.some(selection=>!result.resultados.some(item=>item.calificacion_id===selection.calificacion_id))) throw new Error('Incomplete receipt');
        op.results.push(...result.resultados);op.cursor++;
        setResults([...op.results]);
        setStatus(`${op.results.length} de ${op.parts.reduce((total,item)=>total+item.selecciones.length,0)} resultados confirmados.`);
      }
      if(!current()) return;
      const successes=op.results.filter(item=>item.estado!=='failed').length;
      const remaining=op.parts.slice(op.cursor).reduce((total,part)=>total+part.selecciones.length,0);
      setStatus(`${successes} resultados publicados o ya publicados · ${op.results.length-successes} necesitan atención${op.skipped?` · ${op.skipped} no disponibles`:''}${remaining?` · ${remaining} pendientes sin enviar`:''}.`);
      operation.current=null;setSummary(null);
      onBusy(false);
      await onCompleted(op.results,op.skipped+remaining);
    } catch {
      if(current()) setError('No pudimos confirmar la última respuesta. Puedes reintentar esta misma solicitud sin duplicar cambios. No inicies otra publicación mientras aclaramos su resultado.');
    } finally {
      lock.current=false;
      if(current()){setBusy(false);onBusy(false);}
    }
  }
  function confirm() {
    if(!summary || !current() || lock.current) return;
    const choices=available(summary).map(row=>({calificacion_id:row.calificacion_id!,source_fingerprint:row.preview!.batch_candidate!.source_fingerprint,feedback_text:row.preview!.batch_candidate!.feedback_text,scope:row.preview!.batch_candidate!.scope}));
    if(!choices.length) return;
    const parts:Operation['parts']=[];
    for(let offset=0;offset<choices.length;offset+=25) parts.push({request_id:crypto.randomUUID(),selecciones:choices.slice(offset,offset+25)});
    operation.current={parts,cursor:0,results:[],skipped:summary.length-choices.length};
    void run();
  }
  if(!permitted) return null;
  const selected=rows.filter(row=>selectedIds.includes(row.calificacion_id??''));
  return <section className="min-w-0 space-y-3 rounded-xl border border-border bg-surface-2 p-3 sm:p-4" aria-label="Publicación de notas en lote">
    <h3 className="font-bold">{individual ? 'Aceptar la nota y dejar la devolución lista' : 'Aceptar notas y dejar las devoluciones listas'}</h3>
    <p className="text-sm text-muted">Aceptas las notas mostradas sin volver a usar la IA. Los ajustes que ya hiciste se conservan. Crear enlaces e imprimir siguen siendo acciones aparte.</p>
    {!summary && !operation.current && <div className="grid gap-2 sm:flex sm:flex-wrap">
      <Button disabled={disabled||busy||!available(rows).length} onClick={()=>prepare(rows)}>{individual ? 'Revisar antes de publicar' : 'Aceptar todas y publicar'}</Button>
      {!individual && <Button variant="outline" disabled={disabled||busy||!available(selected).length} onClick={()=>prepare(selected)}>Aceptar y publicar seleccionadas</Button>}
    </div>}
    {summary && <section className="space-y-3" aria-label="Resumen antes de publicar">
      <p className="font-semibold">{available(summary).length} notas para aceptar o conservar · {summary.length-available(summary).length} no disponibles</p>
      <p className="text-sm">Al confirmar autorizas las notas y los mensajes que se muestran. No se cambiarán fotos ni se borrarán los avisos del análisis original.</p>
      <ul className="max-h-[45dvh] space-y-2 overflow-y-auto overscroll-contain pr-1">{summary.map(row=><li key={row.calificacion_id??row.nombre} className="rounded-lg border border-border bg-surface p-3">
        <p className="break-words font-semibold">{row.nombre}{row.preview?.batch_candidate && <span className="ml-2 tabular-nums">{formatGradeScore(Number(row.preview.batch_candidate.nota))}</span>}</p>
        {row.preview?.batch_candidate ? <details><summary className="min-h-11 cursor-pointer py-3 text-sm">Ver mensaje y alcance</summary><FeedbackMessage text={row.preview.batch_candidate.feedback_text}/>{row.preview.batch_candidate.avisos.map(warning=><p key={warning} className="mt-2 text-sm text-muted">{warning}</p>)}</details>:<p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{row.preview?.batch_unavailable_reason??row.preview?.motivo??'Todavía no tiene una nota y devolución disponibles.'}</p>}
      </li>)}</ul>
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        {operation.current ? <Button disabled={busy} onClick={()=>void run()}>Reintentar la misma solicitud</Button>:<Button disabled={busy||disabled||!available(summary).length} loading={busy} onClick={confirm}>Confirmar y publicar {available(summary).length}</Button>}
        {!busy && !operation.current && <Button variant="outline" onClick={()=>setSummary(null)}>Cancelar publicación</Button>}
        {busy && <Button variant="outline" onClick={()=>{stop.current=true;}}>Detener después de esta tanda</Button>}
      </div>
    </section>}
    {status && <p role="status" className="text-sm">{status}</p>}
    {error && <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">{error}</p>}
    {results.some(item=>item.estado==='failed') && <ul className="space-y-1 text-sm">{results.filter(item=>item.estado==='failed').map(item=><li key={item.calificacion_id}><strong>{rows.find(row=>row.calificacion_id===item.calificacion_id)?.nombre??'Estudiante'}: </strong>{item.error??'Revisa este resultado antes de publicarlo.'}</li>)}</ul>}
  </section>;
}
