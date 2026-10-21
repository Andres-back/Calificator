import test from 'node:test';
import assert from 'node:assert/strict';
import {signatureError, confirmedReceipt, requestJSON} from '../public/submission.js';

const signature={method:'drawn',name:'DOCENTE FICTICIO',strokes:[Array.from({length:12},(_,i)=>[.1+i*.025,.3+i*.01])]};
test('firma: coincide mínimo de puntos y longitud del servidor',()=>{
  assert.equal(signatureError(signature,true),null);
  assert.match(signatureError({...signature,strokes:[Array.from({length:11},(_,i)=>[.1+i*.0001,.3])]},true),/más amplia/);
  assert.match(signatureError({...signature,strokes:[[[.1,.1],[.5,.5]]]},true),/firma/);
  assert.match(signatureError(signature,false),/autorizar/i);
  assert.ok(signatureError({...signature,strokes:[[[NaN,.2]]]},true));
});
test('confirmación no acepta un 200 arbitrario ni otra respuesta',()=>{
  const data={submission_id:'sintetico',instrument_version:'5.0-web-medicion',consent_version:'v5',answers:{n:3}};
  const receipt={submission_id:data.submission_id,response:structuredClone(data),received_at_utc:'2026-10-20T12:00:00Z',sha256:'a'.repeat(64),settings:{instrument_version:data.instrument_version},schema_snapshot:{sections:[]},consent_document:[]};
  assert.equal(confirmedReceipt(receipt,data),true);
  assert.equal(confirmedReceipt({status:'ok'},data),false);
  assert.equal(confirmedReceipt({...receipt,submission_id:'otro'},data),false);
  assert.equal(confirmedReceipt({...receipt,response:{...data,answers:{n:4}}},data),false);
});
test('errores no JSON y timeout se muestran sin falso éxito',async()=>{
  await assert.rejects(requestJSON('/test',{},async()=>new Response('<html/>',{status:502})),/confirmar/);
  await assert.rejects(requestJSON('/test',{timeoutMs:5},(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))))),/conexión/);
  await assert.rejects(requestJSON('/test',{},async()=>{throw new TypeError('Failed to fetch');}),/conectar con el servidor/);
  await assert.rejects(requestJSON('/test',{},async()=>new Response('null',{status:502})),/confirmar/);
});
