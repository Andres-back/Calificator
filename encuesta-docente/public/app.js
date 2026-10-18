export const escapeHTML = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = (s, root = document) => root.querySelector(s);
const base = new URL('./', location.href);
const api = path => new URL(path, base);
let config, csrf, step = 0, submitted = false, sending = false, receipt, submissionId = crypto.randomUUID(), strokes = [];
const labels = ['Información y consentimiento','Su contexto docente','Tiempos de calificación','Dificultades actuales','Prioridad de requisitos','Calificación y comentarios','Calidad y confianza','Casos y participación','Revisión y firma'];
const esc = escapeHTML;
const qid = id => 'q-' + id.replaceAll('.', '-');

function message(text) { const box = $('#message'); box.textContent = text; box.hidden = !text; if (text) { box.focus(); box.scrollIntoView({behavior:'smooth', block:'center'}); } }
function question(q) {
  const id = qid(q.id), label = `${/^\d/.test(q.id) ? `<span class="q-number">${esc(q.id)}</span> ` : ''}${esc(q.label)}`;
  if (q.type === 'radio' || q.type === 'multi' || q.type === 'scale') {
    const options = q.options.map((o,i) => `<label class="option" for="${id}-${i}"><input id="${id}-${i}" type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="${esc(q.id)}" value="${esc(o.value)}"><span>${esc(o.label)}</span></label>`).join('');
    return `<fieldset class="question" data-q="${esc(q.id)}"><legend>${label}</legend><div class="${q.type === 'scale' ? 'scale' : 'options'}">${options}</div></fieldset>`;
  }
  const attrs = `id="${id}" name="${esc(q.id)}" ${q.required ? 'required' : ''} ${q.maxlength ? `maxlength="${q.maxlength}"` : ''}`;
  return `<div class="question" data-q="${esc(q.id)}"><label class="field-label" for="${id}">${label}${q.required ? '' : ' <span class="optional">· opcional</span>'}</label>${q.type === 'textarea' ? `<textarea ${attrs} rows="3"></textarea>` : `<input ${attrs} type="${q.type}" ${q.type==='number' ? `min="${q.min}" max="${q.max}" step="1" inputmode="numeric"` : ''}>`}</div>`;
}

function timeFields() {
  return `<div class="notice small">Estos tiempos describen una evaluación de un grupo. No escriba el tiempo de todos sus grupos ni convierta el total de estudiantes a su cargo en entregas medidas.</div>${config.schema.time_activities.map((label,i) => `<div class="time-card"><h3><span class="q-number">2.${i+1}</span>${esc(label)}</h3><div class="field-grid"><label class="field-label" for="time-${i}">Minutos<input id="time-${i}" type="number" min="0" max="10080" step="any" inputmode="decimal" placeholder="Sin dato" disabled></label><label class="field-label" for="method-${i}">¿Cómo obtuvo este tiempo?<select id="method-${i}"><option value="">Sin responder</option>${config.schema.time_methods.map(o=>`<option value="${o.value}">${esc(o.label)}</option>`).join('')}</select></label></div><label class="time-note hint" for="note-${i}">Alcance u observación (opcional)<input id="note-${i}" type="text" maxlength="500" placeholder="Ej.: actividad independiente o de otra sesión"></label></div>`).join('')}<h3>Si cronometró alguna actividad</h3><p class="hint">Complete estos datos de la sesión para poder interpretar el tiempo. El número de respuestas abiertas es distinto del número de entregas.</p><div class="field-grid"><label class="question field-label" for="measured-date">Fecha de medición<input id="measured-date" type="date"></label><label class="question field-label" for="measured-group">Grado y grupo medido<input id="measured-group" maxlength="500" placeholder="Ej.: sexto B"></label><label class="question field-label" for="measured-deliveries">Entregas efectivamente calificadas<input id="measured-deliveries" type="number" min="1" max="100000" step="1" inputmode="numeric"></label><label class="question field-label" for="measured-open">Respuestas abiertas calificadas (si conoce el dato)<input id="measured-open" type="number" min="0" max="100000" step="1" inputmode="numeric"></label></div><label class="question field-label" for="measured-condition">Condición de la sesión<select id="measured-condition"><option value="">Sin responder</option><option value="manual">Manual, sin XCalificator</option><option value="assisted">Con XCalificator</option><option value="other">Otra (explique en el alcance)</option></select></label><label class="question field-label" for="measured-scope">¿Qué incluyó la sesión y qué incidencias hubo?<textarea id="measured-scope" maxlength="500" rows="3" placeholder="Ej.: revisión de 24 entregas, sin incluir registro de notas; una interrupción de 5 minutos."></textarea></label>`;
}

function setup() {
  const s = config.settings;
  $('#version').textContent = `${s.instrument_code} · ${s.instrument_version}`;
  $('#contact').textContent = s.contact_emails.join(' · ');
  $('#steps').innerHTML = labels.map((v,i)=>`<div class="step" data-step="${i}"><span class="num">${i+1}</span><span>${esc(v)}</span></div>`).join('');
  $('#panels').innerHTML = `<section class="panel" id="panel-0"><span class="tag">ANTES DE COMENZAR</span><h2 tabindex="-1">Una invitación a participar</h2><p class="intro">Queremos conocer sus necesidades reales al calificar y retroalimentar. Lea esta información y decida libremente si desea responder.</p><div class="notice">Sus respuestas no son públicas. La tesis y un eventual artículo mostrarán resultados agrupados, sin nombres, contactos ni firmas.</div>${config.consent_document.map((b,i)=>`<details ${i===0 ? 'open' : ''}><summary>${esc(b.title)}</summary><p>${esc(b.text)}</p></details>`).join('')}<label class="check"><input id="consent-participation" type="checkbox"><span>He leído la información, he podido consultar los contactos indicados y acepto participar voluntariamente en esta encuesta.</span></label><label class="check"><input id="consent-data" type="checkbox"><span>Autorizo a los responsables indicados a recolectar, almacenar y usar mis datos para las finalidades, conservación y derechos descritos.</span></label><button class="text-button" type="button" id="decline">No deseo participar</button></section>${config.schema.sections.map((section,i)=>`<section class="panel" id="panel-${i+1}" hidden><span class="tag">${esc(section.id.toUpperCase())}</span><h2 tabindex="-1">${esc(section.title)}</h2><p class="intro">${esc(section.intro)}</p>${i===0 ? `<div class="notice small">Las preguntas de opinión son opcionales. Nombre e institución permiten vincular su autorización; no se pide documento de identidad.</div><label class="question field-label" for="identity-name">Nombre completo<input id="identity-name" autocomplete="name" maxlength="180" minlength="3" required></label><div class="field-grid"><label class="question field-label" for="identity-email">Correo <span class="optional">· opcional</span><input id="identity-email" type="email" autocomplete="email" maxlength="254"></label><label class="question field-label" for="identity-phone">Teléfono <span class="optional">· opcional</span><input id="identity-phone" type="tel" autocomplete="tel" maxlength="50"></label></div>` : ''}${section.id==='tiempos' ? timeFields() : section.questions.map(question).join('')}</section>`).join('')}<section class="panel" id="panel-8" hidden><span class="tag">REVISIÓN FINAL</span><h2 tabindex="-1">Revise y deje su constancia</h2><p class="intro">Puede volver a cualquier paso con “Anterior”. Una omisión se guardará como tal; no como una respuesta negativa o cero.</p><div id="review"></div><h3>Constancia de aceptación</h3><div class="options"><label class="option"><input type="radio" name="signature-method" value="drawn" checked><span>Dibujar mi firma con el dedo o el ratón</span></label><label class="option"><input type="radio" name="signature-method" value="typed"><span>Confirmar con mi nombre completo y las aceptaciones expresas</span></label></div><div id="draw-area"><p id="signature-help" class="hint">Firme dentro del recuadro. La imagen no se publicará ni certifica por sí sola su identidad.</p><div class="signature-wrap"><canvas id="signature" width="1000" height="350" role="img" aria-label="Área para dibujar su firma" aria-describedby="signature-help"></canvas></div><div class="sign-actions"><span id="signature-status" role="status">Sin firma dibujada</span><button class="text-button" type="button" id="clear-signature">Borrar firma</button></div><label class="check"><input id="consent-signature" type="checkbox"><span>Autorizo guardar el dibujo estático de mi firma únicamente como constancia de este consentimiento. Puedo elegir confirmar con mi nombre sin guardar un dibujo.</span></label></div><label class="question field-label" for="signature-name">Escriba su nombre completo para confirmar<input id="signature-name" maxlength="180" autocomplete="name" required></label><div class="notice small">Al enviar se guardarán sus respuestas junto con esta autorización (${esc(s.consent_version)}), fecha del servidor y constancia. Esto no autoriza automáticamente otras pruebas del piloto.</div></section>`;
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
  for(let i=0;i<6;i++) { $(`#method-${i}`).addEventListener('change',updateTimes); $(`#time-${i}`).addEventListener('input',updateTimes); }
  document.querySelectorAll('[name="signature-method"]').forEach(input=>input.addEventListener('change',()=>{const drawn=input.value==='drawn'; $('#draw-area').hidden=!drawn;if(!drawn){strokes=[];$('#consent-signature').checked=false;redraw();}}));
  $('#clear-signature').addEventListener('click',()=>{strokes=[];redraw();});
  initSignature(); show(0,false);
}

function updateTimes() {
  const t = readTimes();
  t.forEach((row,i)=>{const input=$(`#time-${i}`); const numeric=['measured','estimated'].includes(row.method);input.disabled=!numeric;input.required=numeric;if(!numeric)input.value='';});
  const measured=t.some(x=>x.method==='measured');
  ['date','group','deliveries','condition','scope'].forEach(id=>$(`#measured-${id}`).required=measured);
  $('#note-1').required=t[0].minutes!==null&&t[1].minutes!==null&&t[1].minutes>t[0].minutes;
  $('#note-1').placeholder=$('#note-1').required?'Explique por qué abiertas supera el tiempo de todas las entregas':'Ej.: actividad independiente o de otra sesión';
}
const num = input => input.value === '' ? null : Number(input.value);
function readTimes() {return config.schema.time_activities.map((_,i)=>({minutes:$(`#time-${i}`).disabled?null:num($(`#time-${i}`)),method:$(`#method-${i}`).value||null,note:$(`#note-${i}`).value.trim()}));}
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
  const method=$('[name="signature-method"]:checked').value;
  return {submission_id:submissionId,instrument_version:config.settings.instrument_version,consent_version:config.settings.consent_version,identity:{name:$('#identity-name').value.trim(),email:$('#identity-email').value.trim(),phone:$('#identity-phone').value.trim()},answers:readAnswers(),times:readTimes(),measurement:{date:$('#measured-date').value,group:$('#measured-group').value.trim(),deliveries:num($('#measured-deliveries')),open_answers:num($('#measured-open')),condition:$('#measured-condition').value,scope:$('#measured-scope').value.trim()},consent:{participation:$('#consent-participation').checked,data_processing:$('#consent-data').checked,signature_storage:method==='drawn'&&$('#consent-signature').checked},signature:{method,name:$('#signature-name').value.trim(),strokes:method==='drawn'?strokes:[]}};
}

function formatAnswer(q,value){
  if(value===null||value===''||(Array.isArray(value)&&!value.length))return 'Sin respuesta';
  if(q.options){const values=Array.isArray(value)?value:[value];return values.map(v=>q.options.find(o=>o.value===v)?.label??v).join('; ');}
  return String(value);
}
function buildReview(){
  const answers=readAnswers();let empty=0;
  const sections=config.schema.sections.map(s=>`<details><summary>${esc(s.title)}</summary><dl class="review-list">${s.id==='tiempos'?readTimes().map((v,i)=>`<dt>${esc(config.schema.time_activities[i])}</dt><dd>${v.minutes===null?'Sin minutos consignados':esc(v.minutes)+' minutos'} · ${esc(config.schema.time_methods.find(m=>m.value===v.method)?.label||'Sin método')} ${v.note?'· '+esc(v.note):''}</dd>`).join(''):s.questions.map(q=>{const value=answers[q.id];if(value===null||value===''||(Array.isArray(value)&&!value.length))empty++;return `<dt>${esc(q.label)}</dt><dd>${esc(formatAnswer(q,value))}</dd>`;}).join('')}</dl></details>`).join('');
  $('#review').innerHTML=`<div class="notice"><strong>${esc($('#identity-name').value)}</strong><br>${esc(answers.institution)}<br>${esc($('#identity-email').value||'Sin correo consignado')}</div><div class="notice small">${empty} campos de contexto u opinión sin responder. Puede volver para completarlos o enviarlos así.</div>${sections}<details><summary>Contexto de la medición</summary><dl class="review-list">${[['Fecha',$('#measured-date').value],['Grupo',$('#measured-group').value],['Entregas',$('#measured-deliveries').value],['Respuestas abiertas',$('#measured-open').value],['Condición',$('#measured-condition').selectedOptions[0].text],['Alcance',$('#measured-scope').value]].map(([k,v])=>`<dt>${k}</dt><dd>${esc(v||'Sin respuesta')}</dd>`).join('')}</dl></details><details><summary>Leer de nuevo el consentimiento completo</summary>${config.consent_document.map(b=>`<h3>${esc(b.title)}</h3><p class="intro">${esc(b.text)}</p>`).join('')}</details>`;
}
function show(value,focus=true){
  step=value;message('');
  document.querySelectorAll('.panel').forEach((p,i)=>p.hidden=i!==step);
  document.querySelectorAll('.step').forEach((p,i)=>{p.classList.toggle('current',i===step);p.classList.toggle('complete',i<step);if(i===step)p.setAttribute('aria-current','step');else p.removeAttribute('aria-current');});
  $('#step-count').textContent=`Paso ${step+1} de 9 · ${labels[step]}`;$('#progress').value=step+1;
  $('#back').hidden=step===0;$('#next').innerHTML=step===8?'Firmar y enviar':'Continuar <span aria-hidden="true">→</span>';
  if(step===8){buildReview();requestAnimationFrame(redraw);}
  if(focus){$(`#panel-${step} h2`).focus();$('#progress').scrollIntoView({behavior:'smooth',block:'start'});}
}
async function next(){
  if(sending)return;
  message('');
  if(step===0&&(!$('#consent-participation').checked||!$('#consent-data').checked)){message('Para participar, lea la información y marque ambas aceptaciones. También puede elegir no participar.');return;}
  if(step===2)updateTimes();
  for(const input of $(`#panel-${step}`).querySelectorAll('input,select,textarea')){if(!input.checkValidity()){input.reportValidity();return;}}
  if(step===1&&[...document.querySelectorAll('[name="1.6"]:checked')].some(x=>x.value==='9')&&!$('#q-1-6-other').value.trim()){message('Describa el otro tipo de pregunta o quite la opción Otro.');return;}
  if(step===1&&[...document.querySelectorAll('[name="evidence.storage"]:checked')].some(x=>x.value==='6')&&!$('#q-evidence-other').value.trim()){message('Describa el otro medio de conservación o quite la opción Otro medio.');return;}
  if(step<8){show(step+1);return;}
  const data=payload();
  if(data.signature.name.toLocaleLowerCase()!==data.identity.name.toLocaleLowerCase()){message('El nombre de la firma debe coincidir con su nombre completo.');return;}
  if(data.signature.method==='drawn'&&(!data.consent.signature_storage||strokes.flat().length<8)){message('Dibuje su firma y autorice guardar el dibujo, o elija confirmar con su nombre.');return;}
  sending=true;$('#next').disabled=true;$('#back').disabled=true;$('#next').textContent='Guardando…';
  try{
    await session();
    const response=await fetch(api('api/responses'),{method:'POST',headers:{'Content-Type':'application/json','X-Survey-CSRF':csrf},body:JSON.stringify(data),credentials:'same-origin'});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'No se confirmó el guardado.');
    receipt=result;submitted=true;strokes=[];$('#survey').reset();
    $('#panels').innerHTML=`<section class="panel"><div class="success-icon" aria-hidden="true">✓</div><span class="tag">RESPUESTA GUARDADA</span><h2 tabindex="-1">Gracias por compartir su experiencia</h2><p class="intro">Su respuesta y la constancia de consentimiento se guardaron en el servidor. Conserve su código para cualquier consulta.</p><div class="receipt-code">${esc(receipt.submission_id)}</div><p class="hint">Fecha de recepción: ${esc(new Date(receipt.received_at_utc).toLocaleString('es-CO'))}</p><div class="inline-actions"><button type="button" class="button primary" id="download-receipt">Descargar constancia</button><button type="button" class="button secondary" id="print-receipt">Imprimir / guardar PDF</button></div><p class="hint">La constancia contiene sus respuestas, autorización y firma. Guárdela en un lugar privado.</p><p>Consultas: ${esc(config.settings.contact_emails.join(' · '))}</p></section>`;
    $('#actions').hidden=true;$('#step-count').textContent='Cuestionario finalizado';$('#progress').value=9;
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
function redraw(){const canvas=$('#signature');if(!canvas)return;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#18372e';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';for(const stroke of strokes){ctx.beginPath();stroke.forEach((p,i)=>{if(i)ctx.lineTo(p[0]*canvas.width,p[1]*canvas.height);else ctx.moveTo(p[0]*canvas.width,p[1]*canvas.height);});ctx.stroke();}$('#signature-status').textContent=strokes.length?'Firma dibujada · puede borrarla para repetir':'Sin firma dibujada';}
async function session(){const response=await fetch(api('api/session'),{cache:'no-store',credentials:'same-origin'});const value=await response.json();if(!response.ok)throw new Error(value.error||'No fue posible preparar el envío.');csrf=value.csrf;}

function signatureSVG(signature){
  if(signature.method!=='drawn')return `<p>Confirmación mediante nombre completo: <strong>${esc(signature.name)}</strong>.</p>`;
  const paths=signature.strokes.map(stroke=>`<path d="${stroke.map((p,i)=>`${i?'L':'M'}${(p[0]*1000).toFixed(2)},${(p[1]*350).toFixed(2)}`).join(' ')}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 350" width="500" style="max-width:100%;border:1px solid #ddd" aria-label="Dibujo de firma"><g fill="none" stroke="#18372e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg><p>${esc(signature.name)}</p>`;
}
export function receiptHTML(r,schema){
  schema=r.schema_snapshot||schema;
  const p=r.response;
  const line=(key,value)=>`<dt>${esc(key)}</dt><dd>${esc(value??'Sin respuesta')}</dd>`;
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Constancia XCalificator ${esc(r.submission_id)}</title><style>body{font:14px/1.6 Arial,sans-serif;color:#18372e;max-width:850px;margin:35px auto;padding:20px}h1{font-size:25px}h2{font-size:19px;margin-top:30px;border-top:1px solid #ddd;padding-top:15px}h3{font-size:15px}dt{color:#555;margin-top:10px}dd{margin-left:0;white-space:pre-wrap;overflow-wrap:anywhere}.small{font-size:11px;overflow-wrap:anywhere}@media print{body{margin:0;padding:0}h2,h3,dt{break-after:avoid}svg{break-inside:avoid}}</style><h1>Constancia de participación y autorización</h1><p>${esc(r.settings.title)} · ${esc(r.settings.instrument_code)} ${esc(p.instrument_version)}</p><dl>${line('Código',r.submission_id)}${line('Recepción del servidor (UTC)',r.received_at_utc)}${line('Nombre',p.identity.name)}${line('Correo',p.identity.email||'No facilitado')}${line('Teléfono',p.identity.phone||'No facilitado')}</dl><h2>Consentimiento aceptado</h2><p>Versión ${esc(p.consent_version)}. Participación voluntaria: ${p.consent.participation?'aceptada':'no aceptada'}. Tratamiento de datos: ${p.consent.data_processing?'autorizado':'no autorizado'}. Dibujo de firma: ${p.consent.signature_storage?'autorizado':'no recogido'}.</p>${r.consent_document.map(b=>`<h3>${esc(b.title)}</h3><p>${esc(b.text)}</p>`).join('')}${schema.sections.map(s=>`<h2>${esc(s.title)}</h2><dl>${s.id==='tiempos'?schema.time_activities.map((label,i)=>{const t=p.times[i];return line(label,`${t.minutes===null?'Sin minutos':t.minutes+' min'} · ${schema.time_methods.find(m=>m.value===t.method)?.label||'Sin método'}${t.note?' · '+t.note:''}`);}).join(''):s.questions.map(q=>line(q.label,formatAnswer(q,p.answers[q.id]))).join('')}</dl>`).join('')}<h2>Contexto de la medición</h2><dl>${Object.entries(p.measurement).map(([k,v])=>line(({date:'Fecha',group:'Grupo',deliveries:'Entregas efectivas',open_answers:'Respuestas abiertas',condition:'Condición',scope:'Alcance'})[k],v===''?'Sin respuesta':v)).join('')}</dl><h2>Constancia de aceptación electrónica</h2>${signatureSVG(p.signature)}<p class="small">No es una firma digital certificada. La aplicación no certifica la identidad del remitente. SHA-256 del contenido canónico de la constancia (sin este campo): ${esc(r.sha256)}. La huella permite comparar contenido; no equivale a un sello de tiempo independiente.</p><p>Guarde esta copia en un lugar privado. Para consultar o solicitar cambios contacte a ${esc(r.settings.contact_emails.join(' · '))}.</p></html>`;
}
export function downloadReceipt(r,schema){const url=URL.createObjectURL(new Blob([receiptHTML(r,schema)],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`constancia-${r.submission_id}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export function printReceipt(r,schema){const win=window.open('','_blank');if(!win){alert('Permita abrir la constancia o descárguela y ábrala para imprimir.');return;}win.opener=null;win.document.open();win.document.write(receiptHTML(r,schema));win.document.close();win.focus();setTimeout(()=>win.print(),350);}

if($('#survey')){
  window.addEventListener('beforeunload',event=>{if(step>0&&!submitted){event.preventDefault();event.returnValue='';}});
  fetch(api('api/config'),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('No fue posible cargar el cuestionario.');return r.json();}).then(value=>{config=value;if(!value.settings.enabled){$('#panels').innerHTML='<section class="panel"><h2>Recolección cerrada</h2><p>Esta encuesta ya no está recibiendo respuestas.</p></section>';return;}setup();}).catch(error=>{$('#panels').innerHTML='<section class="panel"><h2>No se pudo cargar la encuesta</h2><p>Revise su conexión y vuelva a cargar esta página.</p></section>';message(error.message);});
}
