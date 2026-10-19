export const escapeHTML = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = (s, root = document) => root.querySelector(s);
const base = new URL('./', location.href);
const api = path => new URL(path, base);
let config, csrf, step = 0, submitted = false, sending = false, receipt, submissionId = crypto.randomUUID(), strokes = [];
let labels = [];
const esc = escapeHTML;
const isFeedback = () => config?.settings.kind === 'pilot_feedback';
function colombiaDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
const qid = id => 'q-' + id.replaceAll('.', '-');

function message(text) { const box = $('#message'); box.textContent = text; box.hidden = !text; if (text) { box.focus(); box.scrollIntoView({behavior:'smooth', block:'center'}); } }
function question(q) {
  const id = qid(q.id), label = `${q.number ? `<span class="q-number">${q.number}.</span> ` : ''}${esc(q.label)}`;
  if (q.type === 'radio' || q.type === 'multi' || q.type === 'scale') {
    const options = q.options.map((o,i) => `<label class="option" for="${id}-${i}"><input id="${id}-${i}" type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="${esc(q.id)}" value="${esc(o.value)}" ${q.required && q.type!=='multi' ? 'required' : ''}><span>${esc(o.label)}</span></label>`).join('');
    const compact=['3.1','3.2','rubric.use','evidence.traceability','evidence.reporting'].includes(q.id);
    return `<fieldset class="question" data-q="${esc(q.id)}"><legend>${label}</legend><div class="${q.type === 'scale' ? 'scale' : compact ? 'options compact' : 'options'}">${options}</div></fieldset>`;
  }
  const attrs = `id="${id}" name="${esc(q.id)}" ${q.required ? 'required' : ''} ${q.maxlength ? `maxlength="${q.maxlength}"` : ''} ${q.type==='date'?`max="${colombiaDate()}"`:''} ${q.hint?`aria-describedby="${id}-hint"`:''}`;
  return `<div class="question" data-q="${esc(q.id)}"><label class="field-label" for="${id}">${label}${q.required ? '' : ' <span class="optional">· opcional</span>'}</label>${q.type === 'textarea' ? `<textarea ${attrs} rows="3"></textarea>` : `<input ${attrs} type="${q.type}" ${q.type==='number' ? `min="${q.min}" max="${q.max}" step="1" inputmode="numeric"` : ''}>`}${q.hint?`<span class="hint" id="${id}-hint">${esc(q.hint)}</span>`:''}</div>`;
}

function setup() {
  const s = config.settings;
  const ui=s.ui||{};
  document.title=ui.page_title||'Voz docente · XCalificator';
  for(const [key,id] of Object.entries({eyebrow:'survey-eyebrow',heading:'survey-heading',description:'survey-description',duration:'survey-duration',aside:'survey-aside'})){
    if(ui[key])$('#'+id).textContent=ui[key];
  }
  labels = ['Información y consentimiento', ...config.schema.sections.map(section=>section.title), 'Revisión y firma'];
  $('#progress').max = labels.length;
  $('#version').textContent = `${s.instrument_code} · ${s.instrument_version}`;
  $('#contact').textContent = s.contact_emails.join(' · ');
  $('#steps').innerHTML = labels.map((v,i)=>`<div class="step" data-step="${i}"><span class="num">${i+1}</span><span>${esc(v)}</span></div>`).join('');
  $('#panels').innerHTML = `<section class="panel" id="panel-0"><span class="tag">ANTES DE COMENZAR</span><h2 tabindex="-1">Una invitación a participar</h2><p class="intro">${esc(ui.invitation||'Queremos conocer sus necesidades reales al calificar y retroalimentar. Lea esta información y decida libremente si desea responder.')}</p><div class="notice">Sus respuestas no son públicas. La tesis y un eventual artículo mostrarán resultados agrupados, sin nombres, contactos ni firmas.</div>${config.consent_document.map((b,i)=>`<details ${i===0 ? 'open' : ''}><summary>${esc(b.title)}</summary><p>${esc(b.text)}</p></details>`).join('')}<label class="check"><input id="consent-participation" type="checkbox"><span>${esc(ui.participation_label||'He leído la información, he podido consultar los contactos indicados y acepto participar voluntariamente en esta encuesta.')}</span></label><label class="check"><input id="consent-data" type="checkbox"><span>Autorizo a los responsables indicados a recolectar, almacenar y usar mis datos para las finalidades, conservación y derechos descritos.</span></label><button class="text-button" type="button" id="decline">No deseo participar</button></section>${config.schema.sections.map((section,i)=>`<section class="panel" id="panel-${i+1}" hidden><span class="tag">${esc(section.id.toUpperCase())}</span><h2 tabindex="-1">${esc(section.title)}</h2><p class="intro">${esc(section.intro)}</p>${i===0 ? `<div class="notice small">${esc(ui.identity_note||'Las preguntas de opinión son opcionales. Nombre e institución permiten vincular su autorización; no se pide documento de identidad.')}</div><label class="question field-label" for="identity-name">Nombre completo<input type="text" id="identity-name" autocomplete="name" maxlength="180" minlength="3" required></label><div class="field-grid"><label class="question field-label" for="identity-email">Correo <span class="optional">· opcional</span><input id="identity-email" type="email" autocomplete="email" maxlength="254"></label><label class="question field-label" for="identity-phone">Teléfono <span class="optional">· opcional</span><input id="identity-phone" type="tel" autocomplete="tel" maxlength="50"></label></div>` : ''}${section.questions.map(question).join('')}</section>`).join('')}<section class="panel" id="panel-${labels.length-1}" hidden><span class="tag">REVISIÓN FINAL</span><h2 tabindex="-1">Revise y deje su constancia</h2><p class="intro">Puede volver a cualquier paso con “Anterior”. Una omisión se guardará como tal; no como una respuesta negativa o cero.</p><div id="review"></div>${isFeedback()?`<label class="check"><input id="feedback-confirmation" type="checkbox"><span>Confirmo que estas observaciones describen mi experiencia de uso o demostración de XCalificator y que deseo dejarlas registradas con mi constancia de aceptación.</span></label>`:''}<h3>Firma obligatoria</h3><div id="draw-area"><p id="signature-help" class="hint">Dibuje su firma con el dedo o el ratón dentro del recuadro. El nombre escrito no reemplaza la firma. La imagen no se publicará.</p><div class="signature-wrap"><canvas id="signature" width="1000" height="350" role="img" aria-label="Área para dibujar su firma" aria-describedby="signature-help"></canvas></div><div class="sign-actions"><span id="signature-status" role="status">Sin firma dibujada</span><button class="text-button" type="button" id="clear-signature">Borrar firma</button></div><label class="check"><input id="consent-signature" type="checkbox"><span>Autorizo guardar el dibujo estático de mi firma únicamente como constancia de este consentimiento. Esta autorización y el dibujo son necesarios para enviar el formulario.</span></label></div><label class="question field-label" for="signature-name">Nombre completo de quien firma<input type="text" id="signature-name" maxlength="180" autocomplete="name" required></label><div class="notice small">Al enviar se guardarán sus respuestas junto con esta autorización (${esc(s.consent_version)}), fecha del servidor y constancia. ${esc(ui.final_note||'Esto no autoriza automáticamente otras pruebas del piloto.')}</div></section>`;
  $('#actions').hidden = false;
  $('#decline').addEventListener('click',()=>{
    if (!confirm('¿Desea finalizar sin enviar información?')) return;
    $('#survey').reset(); strokes=[]; submitted=true;
    $('#panels').innerHTML='<section class="panel"><h2>Gracias por considerar la invitación</h2><p>No se enviaron sus respuestas ni su firma. Puede cerrar esta página.</p><a href="./" class="button secondary">Volver a la invitación</a></section>';
    $('#actions').hidden=true; message('');
  });
  $('#next').addEventListener('click', next);
  $('#back').addEventListener('click',()=>show(step-1));
  $('#survey').addEventListener('submit',e=>{e.preventDefault(); next();});
  $('#clear-signature').addEventListener('click',()=>{strokes=[];redraw();});
  initSignature(); show(0,false);
}

const num = input => input.value === '' ? null : Number(input.value);
function readAnswers(){
  const answers={};
  config.schema.sections.flatMap(s=>s.questions).forEach(q=>{
    const wrap=$(`[data-q="${q.id}"]`);
    if(q.type==='multi')answers[q.id]=[...wrap.querySelectorAll('input:checked')].map(x=>x.value);
    else if(q.type==='radio'||q.type==='scale')answers[q.id]=$('input:checked',wrap)?.value??null;
    else {const input=$('input,textarea',wrap);answers[q.id]=q.type==='number'?num(input):input.value.trim()||null;}
  });return answers;
}
function payload(){
  const method='drawn';
  return {submission_id:submissionId,instrument_version:config.settings.instrument_version,consent_version:config.settings.consent_version,identity:{name:$('#identity-name').value.trim(),email:$('#identity-email').value.trim(),phone:$('#identity-phone').value.trim()},answers:readAnswers(),times:[],measurement:{date:'',group:'',deliveries:null,open_answers:null,condition:isFeedback()?'pilot_feedback':'manual',scope:''},consent:{...(isFeedback()?{feedback_confirmation:$('#feedback-confirmation').checked}:{}),participation:$('#consent-participation').checked,data_processing:$('#consent-data').checked,signature_storage:method==='drawn'&&$('#consent-signature').checked},signature:{method,name:$('#signature-name').value.trim(),strokes:method==='drawn'?strokes:[]}};
}

function formatAnswer(q,value){
  if(value===null||value===''||(Array.isArray(value)&&!value.length))return 'Sin respuesta';
  if(q.options){const values=Array.isArray(value)?value:[value];return values.map(v=>q.options.find(o=>o.value===v)?.label??v).join('; ');}
  return String(value);
}
function buildReview(){
  const answers=readAnswers();let empty=0;
  const sections=config.schema.sections.map(s=>`<details><summary>${esc(s.title)}</summary><dl class="review-list">${s.questions.map(q=>{const value=answers[q.id];if(value===null||value===''||(Array.isArray(value)&&!value.length))empty++;return `<dt>${esc(q.label)}</dt><dd>${esc(formatAnswer(q,value))}</dd>`;}).join('')}</dl></details>`).join('');
  $('#review').innerHTML=`<div class="notice"><strong>${esc($('#identity-name').value)}</strong><br>${esc(answers.institution)}<br>${esc($('#identity-email').value||'Sin correo consignado')}</div><div class="notice small">${empty} campos sin responder. Puede volver para completar los opcionales o enviarlos así si los requeridos están completos.</div>${sections}<details><summary>Leer de nuevo el consentimiento completo</summary>${config.consent_document.map(b=>`<h3>${esc(b.title)}</h3><p class="intro">${esc(b.text)}</p>`).join('')}</details>`;
}
function show(value,focus=true){
  step=value;message('');
  document.querySelectorAll('.panel').forEach((p,i)=>p.hidden=i!==step);
  document.querySelectorAll('.step').forEach((p,i)=>{p.classList.toggle('current',i===step);p.classList.toggle('complete',i<step);if(i===step)p.setAttribute('aria-current','step');else p.removeAttribute('aria-current');});
  $('#step-count').textContent=`Paso ${step+1} de ${labels.length} · ${labels[step]}`;$('#progress').value=step+1;
  $('#back').hidden=step===0;$('#next').innerHTML=step===labels.length-1?'Firmar y enviar':'Continuar <span aria-hidden="true">→</span>';
  if(step===labels.length-1){buildReview();requestAnimationFrame(redraw);}
  if(focus){$(`#panel-${step} h2`).focus();$('#progress').scrollIntoView({behavior:'smooth',block:'start'});}
}
async function next(){
  if(sending)return;
  message('');
  if(step===0&&(!$('#consent-participation').checked||!$('#consent-data').checked)){message('Para participar, lea la información y marque ambas aceptaciones. También puede elegir no participar.');return;}
  for(const input of $(`#panel-${step}`).querySelectorAll('input,select,textarea')){if(!input.checkValidity()){input.reportValidity();return;}}
  const answers=readAnswers();
  const section=config.schema.sections[step-1];
  for(const q of section?.questions||[]){
    if(!q.required)continue;
    const value=answers[q.id];
    if(value===null||value===''||(Array.isArray(value)&&!value.length)){
      message('Complete el campo requerido: '+q.label);return;
    }
  }
  if(answers['needs.support']?.includes('none')&&answers['needs.support'].length>1){message('Elija las tareas que requieren apoyo o la opción No necesito apoyo, sin combinarlas.');return;}
  const duration=answers['manual.duration'],basis=answers['manual.basis'];
  if(['measured','estimated'].includes(basis)&&[null,'unknown','na','skip'].includes(duration)){message('Indique un rango de tiempo o quite el método de obtención.');return;}
  if(['lt30','30to59','60to119','120to239','240plus'].includes(duration)&&basis==='na'){message('Si indicó un tiempo, elija cómo lo obtuvo o deje esa pregunta sin responder.');return;}
  if(step<labels.length-1){show(step+1);return;}
  const data=payload();
  if(isFeedback()&&!data.consent.feedback_confirmation){message('Confirme que las observaciones corresponden a su experiencia antes de firmar.');return;}
  if(data.signature.name.toLocaleLowerCase()!==data.identity.name.toLocaleLowerCase()){message('El nombre de la firma debe coincidir con su nombre completo.');return;}
  if(!data.consent.signature_storage||strokes.flat().length<8){message('Dibuje su firma dentro del recuadro y autorice guardar el dibujo antes de enviar.');return;}
  sending=true;$('#next').disabled=true;$('#back').disabled=true;$('#next').textContent='Guardando…';
  try{
    await session();
    const response=await fetch(api('api/responses'),{method:'POST',headers:{'Content-Type':'application/json','X-Survey-CSRF':csrf},body:JSON.stringify(data),credentials:'same-origin'});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'No se confirmó el guardado.');
    receipt=result;submitted=true;strokes=[];$('#survey').reset();
    $('#panels').innerHTML=`<section class="panel"><div class="success-icon" aria-hidden="true">✓</div><span class="tag">RESPUESTA GUARDADA</span><h2 tabindex="-1">Gracias por compartir su experiencia</h2><p class="intro">Su respuesta y la constancia de consentimiento se guardaron en el servidor. Conserve su código para cualquier consulta.</p><div class="receipt-code">${esc(receipt.submission_id)}</div><p class="hint">Fecha de recepción: ${esc(new Date(receipt.received_at_utc).toLocaleString('es-CO'))}</p><div class="inline-actions"><button type="button" class="button primary" id="download-receipt">Descargar constancia</button><button type="button" class="button secondary" id="print-receipt">Imprimir / guardar PDF</button></div><p class="hint">La constancia contiene sus respuestas, autorización y firma. Guárdela en un lugar privado.</p><p>Consultas: ${esc(config.settings.contact_emails.join(' · '))}</p></section>`;
    $('#actions').hidden=true;$('#step-count').textContent=isFeedback()?'Retroalimentación registrada':'Cuestionario finalizado';$('#progress').value=labels.length;
    $('#download-receipt').addEventListener('click',()=>downloadReceipt(receipt,config.schema));
    $('#print-receipt').addEventListener('click',()=>printReceipt(receipt,config.schema));
    $('.panel h2').focus();window.scrollTo({top:0,behavior:'smooth'});
  }catch(error){message(`${error.message} Sus respuestas siguen en esta página. Revise los campos o reintente; no cierre la pestaña hasta recibir la confirmación.`);}
  finally{sending=false;$('#next').disabled=false;$('#back').disabled=false;$('#next').textContent='Firmar y enviar';}
}

function initSignature(){
  const canvas=$('#signature');let active=null;
  const point=e=>{const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))].map(v=>Math.round(v*10000)/10000);};
  canvas.addEventListener('pointerdown',e=>{if(strokes.length>=100||strokes.flat().length>=11900){message('La firma es muy extensa. Bórrela y vuelva a firmar.');return;}e.preventDefault();active=[point(e)];strokes.push(active);canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!active)return;e.preventDefault();if(strokes.flat().length>=12000)return;active.push(point(e));redraw();});
  const end=()=>{if(active&&active.length<2)strokes=strokes.filter(x=>x!==active);active=null;redraw();};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);window.addEventListener('resize',redraw);
}
function redraw(){const canvas=$('#signature');if(!canvas)return;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#312e81';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';for(const stroke of strokes){ctx.beginPath();stroke.forEach((p,i)=>{if(i)ctx.lineTo(p[0]*canvas.width,p[1]*canvas.height);else ctx.moveTo(p[0]*canvas.width,p[1]*canvas.height);});ctx.stroke();}$('#signature-status').textContent=strokes.length?'Firma dibujada · puede borrarla para repetir':'Sin firma dibujada';}
async function session(){const response=await fetch(api('api/session'),{cache:'no-store',credentials:'same-origin'});const value=await response.json();if(!response.ok)throw new Error(value.error||'No fue posible preparar el envío.');csrf=value.csrf;}

function signatureSVG(signature){
  if(signature.method!=='drawn')return `<p>Confirmación mediante nombre completo: <strong>${esc(signature.name)}</strong>.</p>`;
  const paths=signature.strokes.map(stroke=>`<path d="${stroke.map((p,i)=>`${i?'L':'M'}${(p[0]*1000).toFixed(2)},${(p[1]*350).toFixed(2)}`).join(' ')}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 350" width="500" style="max-width:100%;border:1px solid #ddd" aria-label="Dibujo de firma"><g fill="none" stroke="#312e81" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg><p>${esc(signature.name)}</p>`;
}
export function receiptHTML(r,schema){
  schema=r.schema_snapshot||schema;
  const p=r.response;
  const line=(key,value)=>`<dt>${esc(key)}</dt><dd>${esc(value??'Sin respuesta')}</dd>`;
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Constancia XCalificator ${esc(r.submission_id)}</title><style>body{font:14px/1.6 Arial,sans-serif;color:#312e81;max-width:850px;margin:35px auto;padding:20px}h1{font-size:25px}h2{font-size:19px;margin-top:30px;border-top:1px solid #ddd;padding-top:15px}h3{font-size:15px}dt{color:#555;margin-top:10px}dd{margin-left:0;white-space:pre-wrap;overflow-wrap:anywhere}.small{font-size:11px;overflow-wrap:anywhere}@media print{body{margin:0;padding:0}h2,h3,dt{break-after:avoid}svg{break-inside:avoid}}</style><h1>${r.settings.kind==='pilot_feedback'?'Retroalimentación docente del piloto de XCalificator':'Constancia de participación y autorización'}</h1><p>${esc(r.settings.title)} · ${esc(r.settings.instrument_code)} ${esc(p.instrument_version)}</p><dl>${line('Código',r.submission_id)}${line('Recepción del servidor (UTC)',r.received_at_utc)}${line('Nombre',p.identity.name)}${line('Correo',p.identity.email||'No facilitado')}${line('Teléfono',p.identity.phone||'No facilitado')}</dl><h2>Consentimiento aceptado</h2><p>Versión ${esc(p.consent_version)}. Participación voluntaria: ${p.consent.participation?'aceptada':'no aceptada'}. Tratamiento de datos: ${p.consent.data_processing?'autorizado':'no autorizado'}. Dibujo de firma: ${p.consent.signature_storage?'autorizado':'no recogido'}.</p>${r.consent_document.map(b=>`<h3>${esc(b.title)}</h3><p>${esc(b.text)}</p>`).join('')}${schema.sections.map(s=>`<h2>${esc(s.title)}</h2><dl>${s.id==='tiempos'?schema.time_activities.map((label,i)=>{const t=p.times[i];return line(label,`${t.minutes===null?'Sin minutos':t.minutes+' min'} · ${schema.time_methods.find(m=>m.value===t.method)?.label||'Sin método'}${t.note?' · '+t.note:''}`);}).join(''):s.questions.map(q=>line(q.label,formatAnswer(q,p.answers[q.id]))).join('')}</dl>`).join('')}${schema.time_activities.length?`<h2>Contexto de la medición</h2><dl>${Object.entries(p.measurement).map(([k,v])=>line(({date:'Fecha',group:'Grupo',deliveries:'Entregas efectivas',open_answers:'Respuestas abiertas',condition:'Condición',scope:'Alcance'})[k],v===''?'Sin respuesta':v)).join('')}</dl>`:''}${r.settings.kind==='pilot_feedback'?`<h2>Confirmación de las observaciones</h2><p>El docente ${p.consent.feedback_confirmation?'confirmó':'no confirmó'} que el contenido describe su experiencia de uso o demostración. La constancia no certifica por sí sola su identidad, participación efectiva ni eficacia del programa.</p>`:''}<h2>Constancia de aceptación electrónica</h2>${signatureSVG(p.signature)}<p class="small">No es una firma digital certificada. La aplicación no certifica la identidad del remitente. SHA-256 del contenido canónico de la constancia (sin este campo): ${esc(r.sha256)}. La huella permite comparar contenido; no equivale a un sello de tiempo independiente.</p><p>Guarde esta copia en un lugar privado. Para consultar o solicitar cambios contacte a ${esc(r.settings.contact_emails.join(' · '))}.</p></html>`;
}
export function downloadReceipt(r,schema){const url=URL.createObjectURL(new Blob([receiptHTML(r,schema)],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`constancia-${r.submission_id}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export function printReceipt(r,schema){const win=window.open('','_blank');if(!win){alert('Permita abrir la constancia o descárguela y ábrala para imprimir.');return;}win.opener=null;win.document.open();win.document.write(receiptHTML(r,schema));win.document.close();win.focus();setTimeout(()=>win.print(),350);}

if($('#survey')){
  window.addEventListener('beforeunload',event=>{if(step>0&&!submitted){event.preventDefault();event.returnValue='';}});
  fetch(api('api/config'),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('No fue posible cargar el cuestionario.');return r.json();}).then(value=>{config=value;if(!value.settings.enabled){$('#panels').innerHTML='<section class="panel"><h2>Recolección cerrada</h2><p>Esta encuesta ya no está recibiendo respuestas.</p></section>';return;}setup();}).catch(error=>{$('#panels').innerHTML='<section class="panel"><h2>No se pudo cargar la encuesta</h2><p>Revise su conexión y vuelva a cargar esta página.</p></section>';message(error.message);});
}
