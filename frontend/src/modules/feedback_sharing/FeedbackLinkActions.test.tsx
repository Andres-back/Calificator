import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/stores/auth';
import type { User } from '@/types/api';
import * as api from './api';
import { FeedbackLinkActions } from './FeedbackLinkActions';

vi.mock('./api');
const url='https://example.test/devolucion#'+'a'.repeat(43);
const accesses=[{id:'a1',calificacion_id:'g1',estudiante:'Ana Pérez',estado:'active' as const,version:1,expires_at:'2099-01-01T00:00:00Z',fingerprint:'a'.repeat(64)}];
const writeText=vi.fn();
beforeEach(()=>{vi.resetAllMocks();useAuth.setState({user:{id:'teacher',rol:'profesor',permissions:['grading.publish','grading.read']} as User});
  Object.defineProperty(navigator,'clipboard',{value:{writeText},configurable:true});
  vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([{id:'a1',estudiante:'Ana Pérez',url}]);
  vi.mocked(api.listFeedbackAccesses).mockResolvedValue(accesses);
});

describe('Spec139 copia directa individual y de la selección', () => {
  const copied = { id: 'a1', calificacion_id: 'g1', estudiante: 'Ana Pérez', url, expires_at: accesses[0].expires_at };
  const individualMessage = `Hola. Esta es la retroalimentación de Ana Pérez en Evaluación sintética: ${url}`;
  const props = () => ({ evaluationId: 'e1', evaluationName: 'Evaluación sintética', accesses, selectedIds: ['g1'], signal: new AbortController().signal, valid: () => true, direct: true });

  it('solo consulta al gesto y copia el mensaje individual sin nota ni publicación', async () => {
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([copied]);
    render(<FeedbackLinkActions {...props()} compact />);
    const button = screen.getByRole('button', { name: 'Copiar enlace de Ana Pérez' });
    expect(button).toHaveTextContent(/^Copiar enlace$/);
    expect(api.listFeedbackAccesses).not.toHaveBeenCalled();
    expect(api.copyFeedbackAccesses).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(individualMessage));
    expect(api.listFeedbackAccesses).toHaveBeenCalledTimes(1);
    expect(api.copyFeedbackAccesses).toHaveBeenCalledWith('e1', ['a1'], expect.any(AbortSignal));
    expect(screen.getByRole('status')).toHaveTextContent('Enlace copiado');
    expect(screen.queryByText(/enviado|visto/i)).not.toBeInTheDocument();
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(api.publishFeedbackBatch).not.toHaveBeenCalled();
    expect(api.changeFeedbackAccess).not.toHaveBeenCalled();
  });

  it('copia una línea por calificación seleccionada y revalida el grupo con una sola consulta', async () => {
    const second = { ...accesses[0], id: 'a2', calificacion_id: 'g2', estudiante: 'Luis\nSintético' };
    const outside = { ...accesses[0], id: 'a3', calificacion_id: 'g3', estudiante: 'Fuera de selección' };
    vi.mocked(api.listFeedbackAccesses).mockResolvedValue([...accesses, second, outside]);
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([copied, { ...copied, id: second.id, calificacion_id: second.calificacion_id, estudiante: second.estudiante, url: `${url}_second` }]);
    render(<FeedbackLinkActions {...props()} accesses={[...accesses, second, outside]} selectedIds={['g1', 'g2', 'without-access', 'g1']} selectionOnly />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar lista de 2' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`Ana Pérez: ${url}\nLuis Sintético: ${url}_second`));
    expect(api.listFeedbackAccesses).toHaveBeenCalledTimes(1);
    expect(api.copyFeedbackAccesses).toHaveBeenCalledExactlyOnceWith('e1', ['a1', 'a2'], expect.any(AbortSignal));
    expect(screen.getByText(/^Lista privada para el docente/)).toBeInTheDocument();
    expect(writeText.mock.calls[0][0]).not.toContain('Fuera de selección');
  });

  it('ofrece el mensaje íntegro para copia manual sin anunciar éxito cuando se deniega copiar', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([copied]);
    render(<FeedbackLinkActions {...props()} compact />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace de Ana Pérez' }));
    const fallback = await screen.findByRole('textbox', { name: 'Enlaces para copiar manualmente' });
    expect(fallback).toHaveValue(individualMessage);
    expect(screen.getByRole('status')).not.toHaveTextContent('Enlace copiado');
    fireEvent.focus(fallback);
    expect((fallback as HTMLTextAreaElement).selectionEnd).toBe(individualMessage.length);
  });

  it.each(['expired', 'disabled', 'suspended'] as const)('no recupera una credencial que al consultar quedó %s', async estado => {
    vi.mocked(api.listFeedbackAccesses).mockResolvedValue([{ ...accesses[0], estado }]);
    render(<FeedbackLinkActions {...props()} compact />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace de Ana Pérez' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ana Pérez');
    expect(screen.getByRole('alert').querySelector(`[data-error-code="${estado}"]`)).not.toBeNull();
    expect(api.copyFeedbackAccesses).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('no crea ni copia si falla consultar: error no equivale a ausencia', async () => {
    vi.mocked(api.listFeedbackAccesses).mockRejectedValue(new Error('network'));
    render(<FeedbackLinkActions {...props()} compact />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace de Ana Pérez' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar');
    expect(api.copyFeedbackAccesses).not.toHaveBeenCalled();
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('conserva códigos de fallos parciales y copia únicamente éxitos confirmados', async () => {
    const second = { ...accesses[0], id: 'a2', calificacion_id: 'g2', estudiante: 'Luis Sintético' };
    vi.mocked(api.listFeedbackAccesses).mockResolvedValue([...accesses, second]);
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([copied, { id: second.id, code: 'legacy_unrecoverable', error: 'Copia antigua no recuperable.' }]);
    render(<FeedbackLinkActions {...props()} accesses={[...accesses, second]} selectedIds={['g1', 'g2']} selectionOnly />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar lista de 2' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`Ana Pérez: ${url}`));
    expect(screen.getByRole('alert')).toHaveTextContent('Luis Sintético: Copia antigua no recuperable.');
    expect(screen.getByRole('alert').querySelector('[data-error-code="legacy_unrecoverable"]')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('1 de 2');
  });

  it('múltiples vigentes requieren elegir explícitamente sin escoger el primero', () => {
    const onManage = vi.fn();
    render(<FeedbackLinkActions {...props()} accesses={[...accesses, { ...accesses[0], id: 'a2' }]} compact onManage={onManage} />);
    expect(screen.queryByRole('button', { name: 'Copiar enlace de Ana Pérez' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Elegir enlace de Ana Pérez' }));
    expect(onManage).toHaveBeenCalledExactlyOnceWith('g1');
    expect(api.listFeedbackAccesses).not.toHaveBeenCalled();
    expect(api.copyFeedbackAccesses).not.toHaveBeenCalled();
  });

  it('detecta múltiples creados concurrentemente al gesto y ofrece elegir sin copiar ninguno', async () => {
    const onManage = vi.fn();
    vi.mocked(api.listFeedbackAccesses).mockResolvedValue([...accesses, { ...accesses[0], id: 'concurrent' }]);
    render(<FeedbackLinkActions {...props()} compact onManage={onManage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace de Ana Pérez' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('varios enlaces');
    fireEvent.click(screen.getByRole('button', { name: 'Elegir enlace de Ana Pérez' }));
    expect(onManage).toHaveBeenCalledWith('g1');
    expect(api.copyFeedbackAccesses).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it.each([
    { calificacion_id: 'other-grade' }, { expires_at: '2099-01-02T00:00:00Z' }, { id: 'unknown-access' },
  ])('no copia respuestas ajenas u obsoletas (%j)', async change => {
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([{ ...copied, ...change }]);
    render(<FeedbackLinkActions {...props()} compact />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace de Ana Pérez' }));
    await screen.findByRole('alert');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('descarta resultados tardíos después de cambiar cuenta y no filtra la URL', async () => {
    let resolve!: (value: api.FeedbackAccess[]) => void;
    vi.mocked(api.listFeedbackAccesses).mockImplementation(() => new Promise(done => { resolve = done; }));
    const view = render(<FeedbackLinkActions {...props()} compact />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace de Ana Pérez' }));
    act(() => useAuth.setState({ user: { id: 'other-teacher', rol: 'profesor', permissions: ['grading.publish', 'grading.read'] } as User }));
    resolve(accesses);
    await waitFor(() => expect(view.container).toBeEmptyDOMElement());
    expect(api.copyFeedbackAccesses).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('un doble clic conserva una sola recuperación sin escrituras académicas', async () => {
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([copied]);
    render(<FeedbackLinkActions {...props()} compact />);
    const button = screen.getByRole('button', { name: 'Copiar enlace de Ana Pérez' });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(api.listFeedbackAccesses).toHaveBeenCalledTimes(1);
    expect(api.copyFeedbackAccesses).toHaveBeenCalledTimes(1);
  });

  it('descarta el fallback privado al cambiar de evaluación o perder permiso', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([copied]);
    const initial = props();
    const view = render(<FeedbackLinkActions {...initial} compact />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace de Ana Pérez' }));
    await screen.findByRole('textbox', { name: 'Enlaces para copiar manualmente' });
    view.rerender(<FeedbackLinkActions {...initial} evaluationId="e2" compact />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace de Ana Pérez' }));
    await screen.findByRole('textbox', { name: 'Enlaces para copiar manualmente' });
    act(() => useAuth.setState({ user: { id: 'teacher', rol: 'profesor', permissions: ['grading.read'] } as User }));
    expect(view.container).toBeEmptyDOMElement();
    act(() => useAuth.setState({ user: { id: 'teacher', rol: 'profesor', permissions: ['grading.read', 'grading.publish'] } as User }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('recupera lotes de hasta 100 sin volver a listar ni perder éxitos del otro lote', async () => {
    const many = Array.from({ length: 105 }, (_, index) => ({ ...accesses[0], id: `access-${index}`, calificacion_id: `grade-${index}`, estudiante: `Sintético ${index}` }));
    vi.mocked(api.listFeedbackAccesses).mockResolvedValue(many);
    vi.mocked(api.copyFeedbackAccesses).mockImplementation(async (_evaluation, ids) => {
      if (ids.includes('access-100')) throw new Error('second batch failed');
      return ids.map(id => { const access = many.find(item => item.id === id)!; return { ...copied, id, calificacion_id: access.calificacion_id, estudiante: access.estudiante }; });
    });
    render(<FeedbackLinkActions {...props()} accesses={many} selectedIds={many.map(item => item.calificacion_id)} selectionOnly />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar lista de 105' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0].split('\n')).toHaveLength(100);
    expect(api.listFeedbackAccesses).toHaveBeenCalledTimes(1);
    expect(api.copyFeedbackAccesses).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('100 de 105');
    expect(screen.getByRole('alert')).toHaveTextContent('Sintético 104');
  });
});
describe('copia de enlaces guardados',()=>{
  it('copia nombre y enlace sin emitir ni renovar accesos',async()=>{
    render(<FeedbackLinkActions evaluationId="e1" accesses={accesses} selectedIds={['g1']} signal={new AbortController().signal} valid={()=>true} />);
    fireEvent.click(screen.getByRole('button',{name:'Copiar todos los enlaces activos'}));
    await waitFor(()=>expect(writeText).toHaveBeenCalledWith('Ana Pérez\n'+url));
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();expect(api.changeFeedbackAccess).not.toHaveBeenCalled();
  });
  it('ofrece texto completo seleccionable si el portapapeles está bloqueado',async()=>{
    writeText.mockRejectedValueOnce(new Error('denied'));
    render(<FeedbackLinkActions evaluationId="e1" accesses={accesses} selectedIds={['g1']} signal={new AbortController().signal} valid={()=>true} />);
    fireEvent.click(screen.getByRole('button',{name:'Copiar enlaces seleccionados'}));
    expect(await screen.findByRole('textbox',{name:'Enlaces para copiar manualmente'})).toHaveValue('Ana Pérez\n'+url);
  });
  it('informa históricos no recuperables sin reemplazarlos',async()=>{
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([{id:'a1',code:'legacy_unrecoverable',error:'Este enlace antiguo no guardó una copia recuperable.'}]);
    render(<FeedbackLinkActions evaluationId="e1" accesses={accesses} selectedIds={['g1']} signal={new AbortController().signal} valid={()=>true} />);
    fireEvent.click(screen.getByRole('button',{name:'Copiar todos los enlaces activos'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('no guardó una copia recuperable');
    expect(api.changeFeedbackAccess).not.toHaveBeenCalled();expect(writeText).not.toHaveBeenCalled();
  });
  it('identifica por nombre los fallos parciales sin excluir los seleccionados vencidos',async()=>{
    const expired={...accesses[0],id:'a2',calificacion_id:'g2',estudiante:'Luis',estado:'expired' as const};
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([{id:'a1',estudiante:'Ana Pérez',url},{id:'a2',error:'El enlace está vencido.'}]);
    render(<FeedbackLinkActions evaluationId="e1" accesses={[...accesses,expired]} selectedIds={['g1','g2']} signal={new AbortController().signal} valid={()=>true}/>);
    fireEvent.click(screen.getByRole('button',{name:'Copiar enlaces seleccionados'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Luis: El enlace está vencido.');
    expect(api.copyFeedbackAccesses).toHaveBeenCalledWith('e1',['a1','a2'],expect.any(AbortSignal));
    expect(await screen.findByRole('status')).toHaveTextContent('1 de 2 enlaces copiados');
  });
});
