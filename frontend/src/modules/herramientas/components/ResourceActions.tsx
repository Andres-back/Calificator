import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal } from '@/components/ui';
import { pdfUrl } from '../api';
import { resourceLinkClass, type resourceCapabilities } from '../resourcePresentationModel';

interface Props {
  id: string;
  capabilities: ReturnType<typeof resourceCapabilities>;
  activityPath: string | null;
  visible: boolean;
  canShow: boolean;
  busy: boolean;
  onEdit: () => void;
  onAssign: () => void;
  onShare: () => void;
  onDuplicate: () => void;
  onVisibility: (visible: boolean) => void;
  onDelete: () => void;
}

/** Separate documents from operations; opening either panel performs no request. */
export function ResourceActions(props: Props) {
  const [panel, setPanel] = useState<'download' | 'more' | null>(null);
  const run = (action: () => void) => { setPanel(null); action(); };
  const c = props.capabilities;
  return <>
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&>button]:w-full sm:[&>button]:w-auto" aria-label="Acciones del recurso">
      {c.edit && <Button variant="outline" onClick={event => { event.currentTarget.focus({ preventScroll: true }); props.onEdit(); }}>Editar contenido</Button>}
      {props.activityPath ? c.openActivity && <Link to={props.activityPath} className={resourceLinkClass}>Abrir actividad</Link> : c.assign && <Button variant="outline" onClick={event => { event.currentTarget.focus({ preventScroll: true }); props.onAssign(); }}>Asignar a clase</Button>}
      {c.read && <Button variant="outline" onClick={event => { event.currentTarget.focus({ preventScroll: true }); setPanel('download'); }}>Descargar</Button>}
      <Button variant="ghost" onClick={event => { event.currentTarget.focus({ preventScroll: true }); setPanel('more'); }}>Más opciones</Button>
    </div>
    <Modal open={panel !== null} onClose={() => setPanel(null)} title={panel === 'download' ? 'Descargar recurso' : 'Opciones del recurso'}>
      <div className="flex flex-col items-stretch gap-2">
        {panel === 'download' ? <>
          <a className={resourceLinkClass} href={pdfUrl(props.id, false, true)} target="_blank" rel="noreferrer">PDF para estudiantes</a>
          {c.solutions && <a className={resourceLinkClass} href={pdfUrl(props.id, true, true)} target="_blank" rel="noreferrer">Solucionario docente</a>}
          <a className={resourceLinkClass} href={pdfUrl(props.id)} target="_blank" rel="noreferrer">Abrir PDF para imprimir sin respuestas</a>
          <p className="text-sm text-muted">El PDF de estudiantes no incluye el solucionario. Imprímelo desde el visor del documento.</p>
        </> : <>
          <p className="text-sm text-muted">Compartir el enlace no publica el recurso ni concede acceso a otras personas.</p>
          <Button variant="outline" onClick={() => run(props.onShare)}>Compartir enlace</Button>
          {c.duplicate && <Button variant="outline" disabled={props.busy} onClick={() => run(props.onDuplicate)}>Duplicar recurso</Button>}
          {c.assign && (props.visible || props.canShow) && <Button variant="outline" disabled={props.busy} onClick={() => run(() => props.onVisibility(!props.visible))}>{props.visible ? 'Ocultar a estudiantes' : 'Mostrar a estudiantes'}</Button>}
          {c.remove && <Button variant="danger" disabled={props.busy} onClick={() => run(props.onDelete)}>Eliminar recurso</Button>}
        </>}
      </div>
    </Modal>
  </>;
}

/** Cards cannot prove authorship: they navigate to the checked detail before any write. */
export function ResourceCardActions({ id, title, destination, origin, canManage }: { id: string; title: string; destination: string; origin?: unknown; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="ghost" className="!px-3" aria-label={`Más opciones para ${title}`} onClick={event => { event.currentTarget.focus({ preventScroll: true }); setOpen(true); }}>Más</Button>
    <Modal open={open} onClose={() => setOpen(false)} title={`Opciones de ${title}`}>
      <div className="flex flex-col gap-2">
        <a className={resourceLinkClass} href={pdfUrl(id, false, true)} target="_blank" rel="noreferrer">PDF para estudiantes</a>
        {canManage && <Link to={destination} state={origin} className={resourceLinkClass}>Ver opciones del recurso</Link>}
      </div>
    </Modal>
  </>;
}
