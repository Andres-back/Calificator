import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { copyFeedbackAccesses, listFeedbackAccesses, type FeedbackAccess, type FeedbackCopiedAccess } from './api';
import { deriveDeliveryAvailability, type AccessRecovery } from './deliveryAvailability';
import { buildIndividualFeedbackMessage, buildPrivateFeedbackList } from './feedbackShareMessage';

interface CopyIssue { text: string; code?: string }
interface ManageTarget { gradeId: string; name: string }

function copyErrorMessage(code?: string) {
  if (code === 'expired') return 'El enlace está vencido. Revisa sus opciones.';
  if (code === 'disabled' || code === 'revoked') return 'El enlace está desactivado. Revisa sus opciones.';
  if (code === 'suspended') return 'Necesita reenvío. Revisa y aprueba el contenido antes de copiar.';
  if (code === 'legacy_unrecoverable') return 'La copia antigua no se puede recuperar. Revisa sus opciones sin reemplazarla automáticamente.';
  if (code === 'multiple') return 'Hay varios enlaces vigentes. Elige el que quieres usar.';
  return 'No pudimos recuperar su enlace. Vuelve a consultar y reintenta.';
}

export function FeedbackLinkActions({evaluationId,accesses,selectedIds,signal,valid,disabled=false,onBusy,compact=false,direct=false,selectionOnly=false,evaluationName,onManage}: {
  evaluationId:string; accesses:FeedbackAccess[]; selectedIds:string[]; signal:AbortSignal; valid:()=>boolean; disabled?:boolean; onBusy?:(busy:boolean)=>void; compact?:boolean;
  direct?:boolean; selectionOnly?:boolean; evaluationName?:string; onManage?:(gradeId:string)=>void;
}) {
  const user=useAuth(state=>state.user);
  const [owner]=useState(user?.id);
  const [busy,setBusy]=useState(false);
  const [manual,setManual]=useState('');
  const [message,setMessage]=useState('');
  const [errors,setErrors]=useState<CopyIssue[]>([]);
  const [manageTargets,setManageTargets]=useState<ManageTarget[]>([]);
  const [outputScope,setOutputScope]=useState('');
  const lock=useRef(false);
  const mounted=useRef(true);
  const busyCallback=useRef(onBusy);busyCallback.current=onBusy;
  const contextKey=JSON.stringify([user?.id,user?.rol,user?.permissions?.includes('grading.publish'),user?.permissions?.includes('grading.read'),evaluationId,direct,compact,selectionOnly,selectedIds,accesses.map(item=>[item.id,item.calificacion_id,item.estado,item.version,item.expires_at,item.fingerprint])]);
  const contextVersion=useRef({key:contextKey,signal,generation:0});
  if(contextVersion.current.key!==contextKey||contextVersion.current.signal!==signal)contextVersion.current={key:contextKey,signal,generation:contextVersion.current.generation+1};
  const scope=JSON.stringify([contextVersion.current.generation,contextKey]);
  const scopeRef=useRef(scope);scopeRef.current=scope;
  const permitted=user?.id===owner && ['profesor','admin'].includes(user?.rol??'') && Boolean(user?.permissions?.includes('grading.publish')) && (!direct||Boolean(user?.permissions?.includes('grading.read')));
  const current=()=>{
    const actor=useAuth.getState().user;
    return mounted.current && scopeRef.current===scope && valid() && !signal.aborted && actor?.id===owner && ['profesor','admin'].includes(actor?.rol??'')
      && Boolean(actor?.permissions?.includes('grading.publish')) && (!direct||Boolean(actor?.permissions?.includes('grading.read')));
  };
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(lock.current)busyCallback.current?.(false);};},[]);
  useEffect(()=>{
    if(lock.current)busyCallback.current?.(false);
    lock.current=false;setBusy(false);setOutputScope('');setManual('');setMessage('');setErrors([]);setManageTargets([]);
  },[scope]);
  const active=accesses.filter(access=>access.estado==='active');
  const gradeIds=[...new Set(selectionOnly||(compact&&selectedIds.length===1)?selectedIds:accesses.map(item=>item.calificacion_id))];
  const groups=gradeIds.map(gradeId=>{
    const saved=accesses.filter(item=>item.calificacion_id===gradeId);
    return {gradeId,name:saved[0]?.estudiante??'Estudiante seleccionado',active:saved.filter(item=>item.estado==='active'&&Date.parse(item.expires_at)>Date.now())};
  });
  const individual=direct&&compact&&!selectionOnly;
  const directTargets=individual&&groups.length!==1?[]:groups.filter(group=>group.active.length===1);
  const multipleGroups=groups.filter(group=>group.active.length>1);
  async function copy(items:FeedbackAccess[]) {
    if(!current()||lock.current||!items.length) return;
    lock.current=true;setBusy(true);onBusy?.(true);setOutputScope(scope);setManual('');setErrors([]);setMessage('');
    try {
      const results:FeedbackCopiedAccess[]=[];
      for(let offset=0;offset<items.length;offset+=100){results.push(...await copyFeedbackAccesses(evaluationId,items.slice(offset,offset+100).map(item=>item.id),signal));if(!current())return;}
      const links=results.filter(item=>item.url && item.estudiante && !item.code && !item.error);
      if(results.length!==items.length || items.some(item=>results.filter(result=>result.id===item.id).length!==1)) throw new Error('Incomplete copy');
      setErrors(results.filter(item=>item.error||item.code).map(item=>({text:`${accesses.find(access=>access.id===item.id)?.estudiante??'Enlace'}: ${item.error??copyErrorMessage(item.code)}`,code:item.code})));
      const text=links.map(item=>`${item.estudiante!.replace(/[\r\n]+/g,' ')}\n${item.url}`).join('\n\n');
      if(!text) {setMessage('No hay enlaces disponibles para copiar en esta selección. Revisa los casos indicados.');return;}
      try {await navigator.clipboard.writeText(text);if(current())setMessage(`${links.length} de ${items.length} enlaces copiados. Entrégalos individualmente; no envíes esta lista al grupo.`);}
      catch {if(current()){setManual(text);setMessage('El navegador no permitió copiar. Mantén pulsado el texto y selecciona «Copiar».');}}
    } catch {if(current())setErrors([{text:'No pudimos recuperar todos los enlaces. Actualiza su estado y vuelve a intentarlo; no se crearon ni reemplazaron accesos.'}]);}
    finally {if(scopeRef.current===scope){lock.current=false;if(current()){setBusy(false);onBusy?.(false);}}}
  }
  async function copyDirect() {
    if(!current()||lock.current||!directTargets.length)return;
    lock.current=true;setBusy(true);onBusy?.(true);setOutputScope(scope);setManual('');setMessage('');setErrors([]);setManageTargets([]);
    const failures:CopyIssue[]=[];
    const choices:ManageTarget[]=[];
    try {
      let fresh:FeedbackAccess[];
      try {fresh=await listFeedbackAccesses(evaluationId,signal);}
      catch {if(current())setErrors([{code:'query_error',text:'No pudimos consultar sus enlaces. Reintenta; no se creó ningún acceso.'}]);return;}
      if(!current())return;
      const eligible:FeedbackAccess[]=[];
      for(const target of directTargets){
        const saved=fresh.filter(item=>item.calificacion_id===target.gradeId);
        const candidates=saved.filter(item=>item.estado==='active'&&Date.parse(item.expires_at)>Date.now());
        if(candidates.length===1){eligible.push(candidates[0]);continue;}
        const only=saved.length===1?saved[0]:undefined;
        const code=candidates.length>1?'multiple':only&&Date.parse(only.expires_at)<=Date.now()&&only.estado!=='disabled'?'expired':only?.estado??'unavailable';
        failures.push({code,text:`${target.name}: ${copyErrorMessage(code)}`});
        if(code==='multiple')choices.push({gradeId:target.gradeId,name:target.name});
      }
      const links:{studentName:string;url:string;confirmed:true}[]=[];
      for(let offset=0;offset<eligible.length;offset+=100){
        const batch=eligible.slice(offset,offset+100);
        let results:FeedbackCopiedAccess[];
        try {results=await copyFeedbackAccesses(evaluationId,batch.map(item=>item.id),signal);}
        catch {
          if(!current())return;
          failures.push(...batch.map(item=>({code:'recovery_error',text:`${item.estudiante}: ${copyErrorMessage()}`})));
          continue;
        }
        if(!current())return;
        for(const access of batch){
          const matches=results.filter(result=>result.id===access.id);
          if(matches.length!==1){failures.push({code:'invalid_response',text:`${access.estudiante}: ${copyErrorMessage()}`});continue;}
          const result=matches[0];
          const recovery:AccessRecovery=result.url&&!result.error&&!result.code?{status:'ready',result}:{status:'unavailable',code:result.code,error:result.error};
          const availability=deriveDeliveryAvailability({gradeId:access.calificacion_id,query:{status:'loaded',accesses:fresh},recoveries:{[access.id]:recovery},selectedAccessId:access.id});
          if(availability.kind==='available')links.push({studentName:result.estudiante||access.estudiante,url:availability.url,confirmed:true});
          else {
            const code=availability.code??availability.cause;
            failures.push({code,text:`${access.estudiante}: ${availability.error??copyErrorMessage(code)}`});
          }
        }
      }
      if(!current())return;
      setErrors(failures);setManageTargets(choices);
      if(!links.length){setMessage('No hay enlaces disponibles para copiar en esta selección. Revisa los casos indicados.');return;}
      const text=individual?buildIndividualFeedbackMessage({studentName:links[0].studentName,evaluationName:evaluationName?.trim()||'esta evaluación',url:links[0].url}):buildPrivateFeedbackList(links);
      try {
        await navigator.clipboard.writeText(text);
        if(current())setMessage(individual?'Enlace copiado. Entrégalo individualmente.':`${links.length} de ${directTargets.length} enlaces copiados. Lista privada: entrégalos individualmente; no la publiques en grupos.`);
      }catch{if(current()){setManual(text);setMessage('El navegador no permitió copiar. Mantén pulsado el texto y selecciona «Copiar».');}}
    }catch{if(current())setErrors([...failures,{code:'recovery_error',text:copyErrorMessage()}]);}
    finally{if(scopeRef.current===scope){lock.current=false;if(current()){setBusy(false);onBusy?.(false);}}}
  }
  if(!permitted||signal.aborted||!valid()||!accesses.length||(!direct&&compact&&!active.length)) return null;
  const chosen=accesses.filter(access=>selectedIds.includes(access.calificacion_id));
  const outputCurrent=outputScope===scope;
  const choices=[...multipleGroups.map(group=>({gradeId:group.gradeId,name:group.name})),...(outputCurrent?manageTargets:[])]
    .filter((target,index,all)=>all.findIndex(other=>other.gradeId===target.gradeId)===index);
  return <section className={compact||selectionOnly?'min-w-0 max-w-full space-y-2':'min-w-0 space-y-3 rounded-xl border border-border p-3'} aria-label={compact?'Copia individual':'Copiar enlaces guardados'}>
    {!compact && <><h3 className={selectionOnly?'sr-only':'font-bold'}>Copiar enlaces</h3><p className={selectionOnly?'sr-only':'text-sm text-muted'}>Lista privada para el docente. Copiar no cambia la vigencia ni las preguntas disponibles.</p></>}
    <div className="grid gap-2 sm:flex sm:flex-wrap">{direct?<>
      {(!individual||directTargets.length===1)&&(!selectionOnly||directTargets.length>0)&&<Button variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal px-[12px] py-2 [overflow-wrap:normal]" aria-label={individual?`Copiar enlace de ${directTargets[0]?.name}`:undefined} disabled={disabled||busy||!directTargets.length} onClick={()=>void copyDirect()}>{individual?'Copiar enlace':`Copiar lista de ${directTargets.length}`}</Button>}
      {choices.map(target=><Button key={target.gradeId} variant="outline" className="h-auto min-h-11 py-2" aria-label={`Elegir enlace de ${target.name}`} disabled={disabled||busy||!onManage} onClick={()=>onManage?.(target.gradeId)}>Elegir enlace</Button>)}
    </>:<><Button variant="outline" className="h-auto min-h-11 py-2" disabled={disabled||busy||!active.length} onClick={()=>void copy(active)}>{compact?'Copiar enlace de '+active[0].estudiante:'Copiar todos los enlaces activos'}</Button>{!compact&&<Button variant="outline" disabled={disabled||busy||!chosen.length} onClick={()=>void copy(chosen)}>Copiar enlaces seleccionados</Button>}</>}</div>
    {outputCurrent&&message&&<p role="status" className="text-sm">{message}</p>}
    {outputCurrent&&errors.length>0&&<div role="alert" className="space-y-1 text-sm text-amber-700 dark:text-amber-300">{errors.map((error,index)=><p key={index} data-error-code={error.code}>{error.text}</p>)}</div>}
    {outputCurrent&&manual&&<label className="block text-sm font-semibold">Enlaces para copiar manualmente<textarea readOnly aria-label="Enlaces para copiar manualmente" value={manual} onFocus={event=>event.currentTarget.select()} className={`mt-2 w-full rounded-lg border border-border bg-surface p-3 text-base font-normal ${selectionOnly?'h-[max(88px,20dvh)]':'min-h-48'}`}/></label>}
  </section>;
}
