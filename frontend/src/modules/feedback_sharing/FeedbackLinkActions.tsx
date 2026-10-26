import { useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { copyFeedbackAccesses, type FeedbackAccess, type FeedbackCopiedAccess } from './api';

export function FeedbackLinkActions({evaluationId,accesses,selectedIds,signal,valid,disabled=false,onBusy,compact=false}: {
  evaluationId:string; accesses:FeedbackAccess[]; selectedIds:string[]; signal:AbortSignal; valid:()=>boolean; disabled?:boolean; onBusy?:(busy:boolean)=>void; compact?:boolean;
}) {
  const user=useAuth(state=>state.user);
  const [owner]=useState(user?.id);
  const [busy,setBusy]=useState(false);
  const [manual,setManual]=useState('');
  const [message,setMessage]=useState('');
  const [errors,setErrors]=useState<string[]>([]);
  const lock=useRef(false);
  const permitted=user?.id===owner && ['profesor','admin'].includes(user?.rol??'') && Boolean(user?.permissions?.includes('grading.publish'));
  const current=()=>permitted && valid() && !signal.aborted && useAuth.getState().user?.id===owner && Boolean(useAuth.getState().user?.permissions?.includes('grading.publish'));
  const active=accesses.filter(access=>access.estado==='active');
  async function copy(items:FeedbackAccess[]) {
    if(!current()||lock.current||!items.length) return;
    lock.current=true;setBusy(true);onBusy?.(true);setManual('');setErrors([]);setMessage('');
    try {
      const results:FeedbackCopiedAccess[]=[];
      for(let offset=0;offset<items.length;offset+=100){results.push(...await copyFeedbackAccesses(evaluationId,items.slice(offset,offset+100).map(item=>item.id),signal));if(!current())return;}
      const links=results.filter(item=>item.url && item.estudiante);
      if(results.length!==items.length || items.some(item=>results.filter(result=>result.id===item.id).length!==1)) throw new Error('Incomplete copy');
      setErrors(results.filter(item=>item.error).map(item=>`${accesses.find(access=>access.id===item.id)?.estudiante??'Enlace'}: ${item.error}`));
      const text=links.map(item=>`${item.estudiante!.replace(/[\r\n]+/g,' ')}\n${item.url}`).join('\n\n');
      if(!text) {setMessage('No hay enlaces disponibles para copiar en esta selección. Revisa los casos indicados.');return;}
      try {await navigator.clipboard.writeText(text);if(current())setMessage(`${links.length} de ${items.length} enlaces copiados. Entrégalos individualmente; no envíes esta lista al grupo.`);}
      catch {if(current()){setManual(text);setMessage('El navegador no permitió copiar. Mantén pulsado el texto y selecciona «Copiar».');}}
    } catch {if(current())setErrors(['No pudimos recuperar todos los enlaces. Actualiza su estado y vuelve a intentarlo; no se crearon ni reemplazaron accesos.']);}
    finally {lock.current=false;if(current()){setBusy(false);onBusy?.(false);}}
  }
  if(!permitted||!accesses.length||(compact&&!active.length)) return null;
  const chosen=accesses.filter(access=>selectedIds.includes(access.calificacion_id));
  return <section className={compact?'min-w-0 space-y-2':'min-w-0 space-y-3 rounded-xl border border-border p-3'} aria-label={compact?'Copia individual':'Copiar enlaces guardados'}>
    {!compact && <><h3 className="font-bold">Copiar enlaces</h3><p className="text-sm text-muted">Lista privada para el docente. Copiar no cambia la vigencia ni las preguntas disponibles.</p></>}
    <div className="grid gap-2 sm:flex sm:flex-wrap"><Button variant="outline" className="h-auto min-h-11 py-2" disabled={disabled||busy||!active.length} onClick={()=>void copy(active)}>{compact?'Copiar enlace de '+active[0].estudiante:'Copiar todos los enlaces activos'}</Button>{!compact&&<Button variant="outline" disabled={disabled||busy||!chosen.length} onClick={()=>void copy(chosen)}>Copiar enlaces seleccionados</Button>}</div>
    {message&&<p role="status" className="text-sm">{message}</p>}
    {errors.length>0&&<div role="alert" className="space-y-1 text-sm text-amber-700 dark:text-amber-300">{errors.map((error,index)=><p key={index}>{error}</p>)}</div>}
    {manual&&<label className="block text-sm font-semibold">Enlaces para copiar manualmente<textarea readOnly aria-label="Enlaces para copiar manualmente" value={manual} onFocus={event=>event.currentTarget.select()} className="mt-2 min-h-48 w-full rounded-lg border border-border bg-surface p-3 text-base font-normal"/></label>}
  </section>;
}
