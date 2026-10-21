const DEFAULT_LIMITS={min_points:8,min_length:.08,max_points:12000,max_strokes:100};
export function signatureError(signature,authorized,limits=DEFAULT_LIMITS){
  limits={...DEFAULT_LIMITS,...limits};
  if(!authorized)return 'Debe autorizar guardar el dibujo de su firma para enviar.';
  if(signature?.method!=='drawn'||!Array.isArray(signature.strokes)||signature.strokes.length>limits.max_strokes)return 'Borre la firma y vuelva a dibujarla dentro del recuadro.';
  let count=0,length=0;
  for(const stroke of signature.strokes){
    if(!Array.isArray(stroke)||stroke.length<2)return 'Dibuje su firma dentro del recuadro.';
    for(let i=0;i<stroke.length;i++){
      const p=stroke[i];count++;
      if(!Array.isArray(p)||p.length!==2||p.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1))return 'Borre la firma y vuelva a dibujarla dentro del recuadro.';
      if(i)length+=Math.hypot(p[0]-stroke[i-1][0],p[1]-stroke[i-1][1]);
    }
  }
  if(count<limits.min_points||length<limits.min_length)return 'Dibuje una firma más amplia dentro del recuadro antes de enviar.';
  if(count>limits.max_points)return 'La firma es demasiado extensa. Bórrela y vuelva a firmar.';
  return null;
}
const canonical=v=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):v);
export function confirmedReceipt(r,data){
  return Boolean(r&&r.submission_id===data.submission_id&&typeof r.received_at_utc==='string'&&Number.isFinite(Date.parse(r.received_at_utc))&&/^[a-f0-9]{64}$/.test(r.sha256)&&r.settings?.instrument_version===data.instrument_version&&Array.isArray(r.schema_snapshot?.sections)&&Array.isArray(r.consent_document)&&canonical(r.response)===canonical(data));
}
export async function requestJSON(url,{timeoutMs=20000,...options}={},fetcher=fetch){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetcher(url,{...options,signal:controller.signal});
    let value;
    try{value=await response.json();}catch{throw new Error('No pudimos confirmar la recepción. Conserve esta página y vuelva a intentar.');}
    if(!response.ok){const error=new Error(typeof value?.error==='string'?value.error:'No pudimos confirmar la recepción.');error.status=response.status;error.field=value?.field;throw error;}
    return value;
  }catch(error){
    if(error.name==='AbortError')throw new Error('La conexión tardó demasiado. No cierre esta página; vuelva a comprobar el envío.');
    if(error instanceof TypeError)throw new Error('No pudimos conectar con el servidor. Conserve esta página y vuelva a intentar.');
    throw error;
  }finally{clearTimeout(timer);}
}
