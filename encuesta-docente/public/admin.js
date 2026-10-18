import {escapeHTML as esc, downloadReceipt, printReceipt} from './app.js';
const root=new URL('./',location.href);
if(!root.pathname.endsWith('/admin/'))root.pathname+='admin/';
let schema;
async function load(){
  try{
    const config=await fetch(new URL('../api/config',root)).then(r=>r.json());schema=config.schema;
    const response=await fetch(new URL('records',root),{cache:'no-store'});if(!response.ok)throw new Error('No fue posible consultar las respuestas.');const records=await response.json();
    document.querySelector('#admin-status').textContent=`${records.length} respuestas guardadas`;
    const tbody=document.querySelector('#records');tbody.innerHTML='';
    records.forEach(record=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${esc(record.id)}<br>${esc(new Date(record.received_at).toLocaleString('es-CO'))}</td><td>${esc(record.name)}</td><td><button type="button" class="text-button" data-download>Descargar</button><br><button type="button" class="text-button" data-print>Imprimir</button></td>`;
      const get=async()=>{const response=await fetch(new URL(`receipt/${encodeURIComponent(record.id)}`,root),{cache:'no-store'});if(!response.ok)throw new Error('No se pudo abrir la constancia.');return response.json();};
      tr.querySelector('[data-download]').addEventListener('click',async()=>{try{downloadReceipt(await get(),schema);}catch(e){document.querySelector('#admin-status').textContent=e.message;}});
      tr.querySelector('[data-print]').addEventListener('click',async()=>{try{printReceipt(await get(),schema);}catch(e){document.querySelector('#admin-status').textContent=e.message;}});tbody.append(tr);});
  }catch(error){document.querySelector('#admin-status').textContent=error.message;}
}
document.querySelector('#refresh').addEventListener('click',load);load();
