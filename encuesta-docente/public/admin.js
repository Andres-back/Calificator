import {escapeHTML as esc, downloadReceipt, printReceipt} from './app.js';

const $ = selector => document.querySelector(selector);
const root = new URL('./', location.href);
const statuses = {pending:'Por revisar', reviewed:'Revisada', follow_up:'Seguimiento', excluded:'Excluida del análisis'};
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const day = value => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Bogota', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date(value));
const dateLabel = value => new Date(value).toLocaleString('es-CO', {timeZone:'America/Bogota', dateStyle:'medium', timeStyle:'short'});
let records = [], schema, activeRecord, activeReceipt, saving = false;

async function request(url, options = {}) {
  const response = await fetch(url, {cache:'no-store', credentials:'same-origin', ...options});
  if (response.status === 401) location.replace(new URL('login', root));
  const value = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(value.error || 'No fue posible consultar las respuestas.');
  return value;
}

function populate(selector, values, allLabel) {
  const select = $(selector), selected = select.value;
  select.replaceChildren(new Option(allLabel, ''));
  [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b, 'es')).forEach(value => select.add(new Option(value, value)));
  if ([...select.options].some(option => option.value === selected)) select.value = selected;
}

async function load() {
  $('#refresh').disabled = true;
  try {
    const config = await request(new URL('../api/config', root));
    schema = config.schema;
    document.querySelector('h1').textContent=config.settings.title;
    document.title=config.settings.title+' · Administración';
    $('#interest').closest('label').hidden=config.settings.kind==='pilot_feedback';
    records = await request(new URL('records', root));
    populate('#institution', records.map(record => record.institution), 'Todas');
    populate('#version', records.map(record => record.version), 'Todas');
    populate('#tag', records.flatMap(record => record.review.tags), 'Todas');
    render();
  } catch (error) { $('#admin-status').textContent = error.message; }
  finally { $('#refresh').disabled = false; }
}

function render() {
  $('#count-total').textContent = records.length;
  $('#count-pending').textContent = records.filter(record => record.review.status === 'pending').length;
  $('#count-reviewed').textContent = records.filter(record => record.review.status === 'reviewed').length;
  $('#count-follow').textContent = records.filter(record => record.review.status === 'follow_up').length;
  const query = normalize($('#search').value.trim());
  const filtered = records.filter(record => {
    const received = day(record.received_at);
    return (!query || normalize([record.name, record.id, record.institution, record.area, record.grades, record.review.notes, ...record.review.tags].join(' ')).includes(query))
      && (!$('#institution').value || record.institution === $('#institution').value)
      && (!$('#status').value || record.review.status === $('#status').value)
      && (!$('#tag').value || record.review.tags.includes($('#tag').value))
      && (!$('#version').value || record.version === $('#version').value)
      && (!$('#interest').value || (record.demo_interest || 'unanswered') === $('#interest').value)
      && (!$('#date-from').value || received >= $('#date-from').value)
      && (!$('#date-to').value || received <= $('#date-to').value);
  });
  const order = $('#sort').value;
  filtered.sort((a,b) => order === 'name' || order === 'institution'
    ? a[order].localeCompare(b[order], 'es')
    : order === 'oldest' ? a.received_at.localeCompare(b.received_at) : b.received_at.localeCompare(a.received_at));
  $('#admin-status').textContent = `${filtered.length} de ${records.length} respuestas`;
  $('#empty-state').hidden = filtered.length > 0;
  const tbody = $('#records');
  tbody.replaceChildren();
  for (const record of filtered) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><strong>${esc(record.name)}</strong><small class="record-code">${esc(record.id)}</small></td><td>${esc(record.institution)}<small>${esc([record.area, record.grades].filter(Boolean).join(' · '))}</small></td><td><time datetime="${esc(record.received_at)}">${esc(dateLabel(record.received_at))}</time><small>${esc(record.version)}</small></td><td><span class="review-state ${esc(record.review.status)}">${esc(statuses[record.review.status])}</span><div class="review-tags">${record.review.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div></td><td><button type="button" class="button secondary open-record">Ver y organizar</button></td>`;
    tr.querySelector('.open-record').addEventListener('click', () => openRecord(record));
    tbody.append(tr);
  }
}

function answerLabel(question, value) {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) return 'Sin respuesta';
  const values = Array.isArray(value) ? value : [value];
  return values.map(item => question.options?.find(option => option.value === item)?.label ?? String(item)).join('; ');
}

async function openRecord(record) {
  try {
    const receipt = await request(new URL(`receipt/${encodeURIComponent(record.id)}`, root));
    activeRecord = record;
    activeReceipt = receipt;
    const response = receipt.response;
    $('#record-title').textContent = record.name;
    $('#record-identity').textContent = [record.institution, dateLabel(record.received_at), response.identity.email, response.identity.phone].filter(Boolean).join(' · ');
    $('#review-status').value = record.review.status;
    $('#review-tags').value = record.review.tags.join(', ');
    $('#review-notes').value = record.review.notes;
    $('#review-status-message').textContent = '';
    const original = receipt.schema_snapshot || schema;
    $('#record-answers').innerHTML = original.sections.map(section => `<details open><summary>${esc(section.title)}</summary><dl class="review-list">${section.questions.map(question => `<dt>${esc(question.label)}</dt><dd>${esc(answerLabel(question, response.answers[question.id]))}</dd>`).join('')}</dl></details>`).join('');
    $('#record-dialog').showModal();
  } catch (error) { $('#admin-status').textContent = error.message; }
}

$('#review-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (saving) return;
  const tags = $('#review-tags').value.split(',').map(value => value.trim()).filter(Boolean);
  if (tags.length > 8 || tags.some(tag => tag.length > 40)) {
    $('#review-status-message').textContent = 'Use hasta 8 etiquetas de máximo 40 caracteres.';
    return;
  }
  saving = true;
  $('#save-review').disabled = true;
  $('#close-record').disabled = true;
  try {
    const session = await request(new URL('../api/session', root));
    activeRecord.review = await request(new URL(`review/${encodeURIComponent(activeRecord.id)}`, root), {
      method:'PUT', headers:{'Content-Type':'application/json', 'X-Survey-CSRF':session.csrf},
      body:JSON.stringify({status:$('#review-status').value, tags, notes:$('#review-notes').value})
    });
    populate('#tag', records.flatMap(record => record.review.tags), 'Todas');
    render();
    $('#review-status-message').textContent = 'Organización guardada.';
  } catch (error) { $('#review-status-message').textContent = error.message; }
  finally { saving = false; $('#save-review').disabled = false; $('#close-record').disabled = false; }
});

$('#close-record').addEventListener('click', () => $('#record-dialog').close());
$('#record-dialog').addEventListener('cancel', event => { if (saving) event.preventDefault(); });
$('#download-record').addEventListener('click', () => downloadReceipt(activeReceipt, schema));
$('#print-record').addEventListener('click', () => printReceipt(activeReceipt, schema));
$('#refresh').addEventListener('click', load);
$('#logout').addEventListener('click', async () => {
  $('#logout').disabled = true;
  try {
    const session = await request(new URL('../api/session', root));
    await request(new URL('logout', root), {method:'POST', headers:{'X-Survey-CSRF':session.csrf}});
    location.replace(new URL('login', root));
  } catch (error) { $('#admin-status').textContent = error.message; $('#logout').disabled = false; }
});
$('#filters').addEventListener('submit', event => event.preventDefault());
$('#filters').addEventListener('input', render);
$('#filters').addEventListener('reset', () => setTimeout(render, 0));
load();
