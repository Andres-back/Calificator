import {escapeHTML as esc} from './app.js';

const $=selector=>document.querySelector(selector);
const same=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
const actionNames={correct:'Corrección',remove:'Eliminación de la lista',restore:'Restauración'};

export function createManagement({root,request,onSaved,setSaving,isSaving,answerLabel}) {
  let state,receipt,mode,fields=[],pending=null,busy=false,dirty=false;
  const message=text=>{$('#management-message').textContent=text;};
  const controls=value=>{
    $('#management-fields').disabled=value;
    for(const id of ['change-reason','confirm-code','edit-response','remove-response','restore-response','cancel-management'])$('#'+id).disabled=value;
  };
  const canLeave=()=>!busy && (!(pending || dirty) || window.confirm('Hay cambios sin confirmar. ¿Desea salir? Si perdió la conexión, vuelva a consultar el registro antes de repetir el cambio.'));

  function show(next,original,initialMode) {
    state=next;receipt=original;pending=null;dirty=false;mode=null;
    $('#management-form').hidden=true;$('#reload-management').hidden=true;
    $('#change-reason').value='';$('#confirm-code').value='';controls(false);
    $('#save-management').disabled=false;
    $('#record-title').textContent=next.effective.identity.name;
    $('#management-state').textContent=next.deleted?'En papelera: no participa en los informes activos. La constancia se conserva.':next.corrected?'Respuesta activa con correcciones administrativas. La constancia firmada no cambia.':'Respuesta activa. Sin correcciones administrativas.';
    $('#edit-response').hidden=next.deleted;$('#edit-response').disabled=!next.editable;
    $('#remove-response').hidden=next.deleted;$('#restore-response').hidden=!next.deleted;
    message(next.edit_notice);
    $('#effective-details').hidden=!next.corrected;
    const effective=$('#effective-answers');effective.replaceChildren();
    if(next.corrected){
      const identity=document.createElement('p');identity.textContent=Object.values(next.effective.identity).filter(Boolean).join(' · ');effective.append(identity);
      for(const section of receipt.schema_snapshot?.sections??[]){
        const heading=document.createElement('h4');heading.textContent=section.title;effective.append(heading);
        const dl=document.createElement('dl');dl.className='review-list';
        for(const q of section.questions){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=q.label;dd.textContent=answerLabel(q,next.effective.answers[q.id]);dl.append(dt,dd);}
        effective.append(dl);
      }
    }
    const history=$('#management-history');history.replaceChildren();
    if(!next.history.length)history.textContent='Todavía no hay cambios administrativos.';
    for(const item of [...next.history].reverse()){
      const block=document.createElement('div');block.className='history-event';
      const stamp=new Date(item.created_at).toLocaleString('es-CO',{timeZone:'America/Bogota'});
      block.innerHTML=`<strong>${esc(actionNames[item.action])} · revisión ${item.revision}</strong><p>${esc(stamp)} · Cuenta: ${esc(item.actor)}</p><p>${esc(item.reason)}</p>`;
      const list=document.createElement('ul');
      for(const [path,change] of Object.entries(item.changes)){
        const li=document.createElement('li');li.textContent=`${fieldLabel(path)}: ${display(path,change.before)} → ${display(path,change.after)}`;list.append(li);
      }
      block.append(list);history.append(block);
    }
    if(initialMode)begin(initialMode);
  }

  const questions=()=>receipt.schema_snapshot?.sections.flatMap(section=>section.questions)??[];
  function fieldLabel(path){
    if(path==='deleted')return 'Conservación';
    const [group,...rest]=path.split('.'),key=rest.join('.');
    return group==='identity'?({name:'Nombre',email:'Correo',phone:'Teléfono'}[key]??key):questions().find(q=>q.id===key)?.label??key;
  }
  function display(path,value){
    if(path==='deleted')return value?'Papelera':'Activa';
    if(path.startsWith('answers.')){const q=questions().find(q=>q.id===path.slice(8));if(q)return answerLabel(q,value);}
    return value===null || value===undefined || value===''?'Sin dato':String(value);
  }

  function addField(group,key,question,value){
    const id='correction-'+fields.length,wrap=document.createElement('div');wrap.className='correction-field';
    const label=document.createElement('label');label.className='field-label';label.htmlFor=id;label.textContent=question.label;wrap.append(label);
    let read;
    if(question.type==='multi'){
      label.removeAttribute('for');const box=document.createElement('fieldset');box.className='options';
      const legend=document.createElement('legend');legend.className='sr-only';legend.textContent=question.label;box.append(legend);
      for(const option of question.options){const row=document.createElement('label');row.className='option';const input=document.createElement('input');input.type='checkbox';input.value=option.value;input.checked=Array.isArray(value)&&value.includes(option.value);row.append(input,document.createTextNode(option.label));box.append(row);}
      wrap.append(box);read=()=>[...box.querySelectorAll('input:checked')].map(input=>input.value);
    }else{
      const input=document.createElement(question.options?'select':question.type==='text'?'textarea':'input');input.id=id;
      if(question.options){input.add(new Option('Sin respuesta',''));for(const option of question.options)input.add(new Option(option.label,option.value));}
      else if(input.tagName==='INPUT')input.type=question.type==='number'?'number':question.type==='date'?'date':question.type==='email'?'email':question.type==='tel'?'tel':'text';
      for(const attr of ['min','max','step','maxlength'])if(question[attr]!==undefined)input.setAttribute(attr,question[attr]);
      input.required=Boolean(question.required);input.value=value??'';wrap.append(input);
      read=()=>input.value===''?null:question.type==='number'?Number(input.value):input.value;
    }
    fields.push({group,key,read});$('#management-inputs').append(wrap);
  }

  function buildPatch(){
    const patch={};
    for(const field of fields){let value=field.read();if(field.group==='identity' && value===null)value='';
      const before=state.effective[field.group][field.key]??(Array.isArray(value)?[]:null);
      if(!same(value,before))(patch[field.group]??={})[field.key]=value;
    }
    return patch;
  }
  function preview(){
    const list=$('#changes-list');list.replaceChildren();
    if(mode!=='correct')return;
    for(const [group,values] of Object.entries(buildPatch()))for(const [key,value] of Object.entries(values)){
      const path=group+'.'+key,li=document.createElement('li');li.textContent=`${fieldLabel(path)}: ${display(path,state.effective[group][key])} → ${display(path,value)}`;list.append(li);
    }
    if(!list.children.length)list.textContent='No hay cambios todavía.';
  }
  function begin(action){
    if(busy || isSaving() || pending || (dirty&&!window.confirm('¿Descartar los cambios sin guardar?')))return;
    mode=action;dirty=false;fields=[];$('#management-inputs').replaceChildren();message('');
    $('#management-form').hidden=false;$('#management-fields').hidden=action!=='correct';
    $('#confirm-code-label').hidden=action!=='remove';$('#confirm-code').required=action==='remove';
    $('#confirm-code-hint').textContent=state.id;$('#changes-preview').hidden=action!=='correct';
    $('#management-explanation').textContent=action==='correct'?'Corrección administrativa: no cambia la constancia ni la firma del docente. Revise los cambios y explique el motivo.':action==='remove'?'Se retirará de la lista y los informes activos. El original firmado permanece en papelera y puede restaurarse; no es un borrado definitivo.':'La respuesta volverá a la lista y los informes activos. No se creará una nueva entrega.';
    $('#save-management').textContent={correct:'Guardar corrección',remove:'Confirmar eliminación de la lista',restore:'Confirmar restauración'}[action];
    if(action==='correct'){
      for(const [key,label,type] of [['name','Nombre','input'],['email','Correo','email'],['phone','Teléfono','tel']])addField('identity',key,{label,type,maxlength:key==='name'?180:key==='email'?254:50,required:key==='name'},state.effective.identity[key]);
      for(const section of receipt.schema_snapshot.sections){const heading=document.createElement('h4');heading.textContent=section.title;$('#management-inputs').append(heading);for(const question of section.questions)addField('answers',question.id,question,state.effective.answers[question.id]);}
    }
    preview();$('#management-form').scrollIntoView({block:'start'});(action==='correct'?$('#management-inputs input'):action==='remove'?$('#confirm-code'):$('#change-reason'))?.focus();
  }

  $('#management-form').addEventListener('input',()=>{dirty=true;preview();});
  $('#management-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy || isSaving())return;
    if(!pending){
      const reason=$('#change-reason').value.trim();if(!reason){message('Escriba el motivo del cambio.');return;}
      if(mode==='remove' && $('#confirm-code').value!==state.id){message('Escriba el código exacto mostrado para confirmar.');return;}
      const patch=mode==='correct'?buildPatch():null;if(patch&&!Object.keys(patch).length){message('No hay cambios para guardar.');return;}
      pending={action:mode,expected_revision:state.revision,request_id:crypto.randomUUID(),reason,...(patch?{patch}:{}),...(mode==='remove'?{confirm_id:state.id}:{})};
    }
    busy=true;setSaving(true);controls(true);$('#save-management').disabled=true;message('Guardando…');
    try{
      const session=await request(new URL('../api/session',root));
      const confirmed=await request(new URL('manage/'+encodeURIComponent(state.id),root),{method:'POST',headers:{'Content-Type':'application/json','X-Survey-CSRF':session.csrf},body:JSON.stringify(pending)});
      if(confirmed.id!==state.id || confirmed.revision!==pending.expected_revision+1 || confirmed.action!==pending.action)throw new Error('La confirmación recibida no corresponde al cambio.');
      pending=null;dirty=false;
      const next=await request(new URL('manage/'+encodeURIComponent(state.id),root));show(next,receipt);
      await onSaved();message('Cambio guardado. El original firmado se conserva.');$('#management-message').scrollIntoView({block:'center'});$('#management-message').focus();
    }catch(error){
      if(error.status && error.status<500){pending=null;controls(false);message(error.message);if(error.status===409){$('#reload-management').hidden=false;$('#save-management').disabled=true;}}
      else {message(pending?'No se confirmó el guardado. Conserve esta ventana y pulse «Reintentar el mismo cambio». También puede consultar el registro.':'El cambio fue confirmado, pero no se pudo actualizar la vista. Vuelva a consultar.');$('#reload-management').hidden=false;}
    }finally{busy=false;setSaving(false);if(pending){$('#save-management').textContent='Reintentar el mismo cambio';$('#save-management').disabled=false;}else if(!$('#reload-management').hidden){$('#save-management').disabled=true;}else{$('#save-management').disabled=false;}}
  });
  for(const [id,action] of [['edit-response','correct'],['remove-response','remove'],['restore-response','restore']])$('#'+id).addEventListener('click',()=>begin(action));
  $('#cancel-management').addEventListener('click',()=>{if(canLeave()){dirty=false;pending=null;$('#management-form').hidden=true;}});
  $('#reload-management').addEventListener('click',async()=>{
    if(!canLeave())return;
    try{const next=await request(new URL('manage/'+encodeURIComponent(state.id),root));show(next,receipt);await onSaved();message('Respuesta actualizada. Revise el historial antes de volver a modificarla.');}catch(error){message(error.message);}
  });
  return {show,canLeave,begin};
}
