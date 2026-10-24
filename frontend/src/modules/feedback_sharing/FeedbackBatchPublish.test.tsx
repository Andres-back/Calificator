import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/stores/auth';
import type { User } from '@/types/api';
import * as api from './api';
import { FeedbackBatchPublish } from './FeedbackBatchPublish';

vi.mock('./api');
const teacher = { id: 'teacher', rol: 'profesor', permissions: ['grading.read','grading.grade','grading.publish'] } as User;
const message = 'Identificaste al personaje. Siguiente paso: relee el segundo párrafo y explica su emoción.';
const rows = ['Ana','Luis'].map((nombre,index) => ({ nombre, calificacion_id:'g'+index,
  preview:{ calificacion_id:'g'+index, elegible:false, batch_candidate:{source_fingerprint:'a'.repeat(64),nota:index?'4.2':'0',feedback_text:message,scope:'summary' as const,avisos:[]} } }));
const result = {id:'receipt',request_id:'request',total:2,exitosos:2,fallidos:0,resultados:rows.map(row=>({calificacion_id:row.calificacion_id,estado:'published' as const,estado_academico:'publicada'}))};
beforeEach(()=>{vi.resetAllMocks();useAuth.setState({user:teacher});vi.mocked(api.publishFeedbackBatch).mockResolvedValue(result);});
function view(onCompleted=vi.fn()) {
  render(<FeedbackBatchPublish evaluationId="e1" rows={rows} selectedIds={[]} signal={new AbortController().signal} valid={()=>true} onBusy={()=>{}} onCompleted={onCompleted} />);
  return onCompleted;
}
describe('decisión global explícita',()=>{
  it('muestra resumen, permite cancelar y nunca publica al consultar',()=>{
    view();fireEvent.click(screen.getByRole('button',{name:'Aceptar todas y publicar'}));
    expect(screen.getByText('Ana')).toBeInTheDocument();expect(screen.getByText('Luis')).toBeInTheDocument();
    expect(api.publishFeedbackBatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Cancelar publicación'}));
    expect(api.publishFeedbackBatch).not.toHaveBeenCalled();
  });
  it('confirma todos en una llamada sin volver a calificar',async()=>{
    const completed=view();fireEvent.click(screen.getByRole('button',{name:'Aceptar todas y publicar'}));
    fireEvent.click(screen.getByRole('button',{name:'Confirmar y publicar 2'}));
    await waitFor(()=>expect(completed).toHaveBeenCalled());
    expect(api.publishFeedbackBatch).toHaveBeenCalledWith('e1',expect.objectContaining({request_id:expect.any(String),selecciones:rows.map(row=>({calificacion_id:row.calificacion_id,source_fingerprint:'a'.repeat(64),feedback_text:message,scope:'summary'}))}),expect.any(AbortSignal));
    expect(screen.getByRole('status')).toHaveTextContent('2');
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
  });
  it('consulta el recibo si se pierde la respuesta sin repetir la decisión',async()=>{
    vi.mocked(api.publishFeedbackBatch).mockRejectedValueOnce(new Error('response lost'));
    vi.mocked(api.readFeedbackBatch).mockResolvedValue(result);
    const completed=view();fireEvent.click(screen.getByRole('button',{name:'Aceptar todas y publicar'}));fireEvent.click(screen.getByRole('button',{name:'Confirmar y publicar 2'}));
    await waitFor(()=>expect(completed).toHaveBeenCalled());
    expect(api.publishFeedbackBatch).toHaveBeenCalledTimes(1);expect(api.readFeedbackBatch).toHaveBeenCalledTimes(1);
  });
  it('oculta la decisión a quien no puede calificar',()=>{
    useAuth.setState({user:{...teacher,permissions:['grading.read','grading.publish']}});view();
    expect(screen.queryByRole('button',{name:'Aceptar todas y publicar'})).toBeNull();
  });
});
