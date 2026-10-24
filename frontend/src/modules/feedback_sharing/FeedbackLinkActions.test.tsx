import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
