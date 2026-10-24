import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, ConfirmDialog, Field, Input, Modal } from '@/components/ui';
import { useMobileFormViewport } from '@/hooks/useMobileFormViewport';
import { toApiError } from '@/lib/api';
import { MaterialContentEditor } from '../MaterialContentEditor';
import { editMaterial } from '../api';
import type { Material } from '@/types/api';
import toast from 'react-hot-toast';
import { MotifPicker } from '@/modules/motif_library/MotifPicker';
import { ResourceHeaderMotif } from '@/modules/motif_library/ResourceHeaderMotif';
import { readDecoration, readDecorationUrl } from '@/modules/motif_library/resourceDecoration';

export function ResourceEditorPanel({ material, onClose, criteria = false }: { material: Material; onClose: () => void; criteria?: boolean }) {
  const [title, setTitle] = useState(material.titulo);
  const [content, setContent] = useState(() => structuredClone(material.contenido_json));
  const [decoration, setDecoration] = useState(() => readDecoration(material.contenido_json));
  const [decorationUrl, setDecorationUrl] = useState(() => readDecorationUrl(material.contenido_json));
  const [library, setLibrary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const active = useRef(true);
  const savingRef = useRef(false);
  const contentChanged = JSON.stringify(content) !== JSON.stringify(material.contenido_json);
  const decorationChanged = JSON.stringify(decoration) !== JSON.stringify(readDecoration(material.contenido_json));
  const dirty = title !== material.titulo || contentChanged || decorationChanged;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const client = useQueryClient();
  const viewport = useMobileFormViewport(true, scope);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);
  useEffect(() => {
    if (!criteria) return;
    const frame = requestAnimationFrame(() => {
      const scroller = scope.current;
      const section = scroller?.querySelector<HTMLElement>('[data-resource-field="criterios"]');
      if (!scroller || !section) return;
      scroller.scrollTop += section.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 8;
      section.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [criteria]);
  const close = () => { if (savingRef.current) return; if (dirty) setDiscard(true); else onClose(); };
  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setError('');
    try {
      const nextTitle = title.trim() || material.titulo;
      const payload: Parameters<typeof editMaterial>[1] = {};
      if (nextTitle !== material.titulo) payload.titulo = nextTitle;
      if (contentChanged || nextTitle !== material.titulo) payload.contenido_json = { ...content, titulo: nextTitle };
      if (decorationChanged) payload.decoracion = decoration;
      if (Object.keys(payload).length) await editMaterial(material.id, payload);
      if (!active.current) return;
      dirtyRef.current = false;
      await Promise.all([client.invalidateQueries({ queryKey: ['material', material.id] }), client.invalidateQueries({ queryKey: ['materials'] }), client.invalidateQueries({ queryKey: ['materia-resources'] })]);
      if (!active.current) return;
      toast.success('Material actualizado'); onClose();
    } catch (err) {
      if (active.current) setError(toApiError(err).detail);
    } finally {
      savingRef.current = false;
      if (active.current) setSaving(false);
    }
  };
  const confirmDiscard = discard || blocker.state === 'blocked';
  return <>
    <Modal open onClose={close} ariaLabel="Editar recurso" initialFocusRef={heading} mobileViewport={viewport.viewport} mobileWriting={viewport.isWriting} closeOnEscape={!saving && !confirmDiscard} closeOnBackdrop={!saving && !confirmDiscard} showCloseButton={false} className="flex h-[min(90dvh,900px)] max-w-5xl flex-col overflow-hidden !p-0">
      <header className="shrink-0 border-b border-border p-4">
        <h2 ref={heading} tabIndex={-1} className="focus-ring rounded font-display text-lg font-bold">Editar recurso</h2>
        {!viewport.isWriting && <p className="text-sm text-muted">Tus cambios se aplican al guardar.</p>}
      </header>
      <div ref={scope} data-mobile-scroll className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 [&_input]:text-base [&_textarea]:text-base [&_button]:min-h-11">
        {error && <p role="alert" className="rounded-xl border border-rose-300 p-3 text-sm">No se guardaron los cambios. {error} Puedes volver a intentarlo.</p>}
        {material.publicado_estudiantes && <p className="text-sm text-amber-700 dark:text-amber-200">Al guardar, los estudiantes verán el contenido actualizado.</p>}
        <fieldset disabled={saving} className="min-w-0 space-y-4">
          <Field label="Título del recurso"><Input value={title} onChange={event => setTitle(event.target.value)} /></Field>
          <section className="space-y-2 rounded-xl border border-border p-3" aria-label="Decoración de cabecera">
            <h3 className="font-semibold">Decoración de cabecera</h3>
            <p className="text-sm text-muted">Opcional. No sustituye la ilustración ni cambia las preguntas.</p>
            <ResourceHeaderMotif content={{ _presentacion: { decoracion: decoration && { ...decoration, asset_url: decorationUrl } } }} />
            <Button variant="outline" onClick={() => setLibrary(value => !value)}>{decoration ? 'Cambiar decoración' : 'Elegir decoración'}</Button>
            {decoration && <Button variant="ghost" onClick={() => { setDecoration(null); setDecorationUrl(null); }}>Sin decoración</Button>}
            {library && <MotifPicker disabled={saving} onSelect={motif => { setDecoration({ motif_id: motif.id, placement: 'header' }); setDecorationUrl(motif.full_url); setLibrary(false); }} onCancel={() => setLibrary(false)} />}
          </section>
          <MaterialContentEditor value={content} onChange={setContent} />
        </fieldset>
      </div>
      <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-surface p-3">
        {viewport.isWriting && <Button variant="outline" onClick={viewport.finishWriting}>Listo</Button>}
        <Button variant="ghost" disabled={saving} onClick={close}>Cancelar</Button>
        <Button disabled={saving} loading={saving} onClick={() => void save()}>Guardar cambios</Button>
      </footer>
    </Modal>
    <ConfirmDialog open={confirmDiscard} title="¿Descartar los cambios?" description="Los cambios sin guardar se perderán." confirmLabel="Descartar cambios" cancelLabel="Seguir editando" onClose={() => { setDiscard(false); if (blocker.state === 'blocked') blocker.reset(); }} onConfirm={() => { dirtyRef.current = false; if (blocker.state === 'blocked') blocker.proceed(); else onClose(); }} />
  </>;
}
