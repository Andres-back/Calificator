import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, BookOpenCheck, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, ConfirmDialog, EducationalIcon, Field, Input, LoadingScreen, Modal, Select } from '@/components/ui';
import {
  assignMaterialAsSupport,
  convertToEvaluacion,
  deleteMaterial,
  duplicateMaterial,
  getMaterial,
  listMaterialEvaluaciones,
  setMaterialVisibility,
  type IntentPolicy,
} from './api';
import { TOOL_BY_TIPO, TOOL_EDUCATIONAL_ICON } from './meta';
import { ResourceEditorPanel } from './components/ResourceEditorPanel';
import { ResourceActions } from './components/ResourceActions';
import { resourceCapabilities, resourceLinkClass, resourceReturnPath, resourceState } from './resourcePresentationModel';
import { useAuth } from '@/stores/auth';
import { CrucigramaView, SopaLetrasView, MatchingView, ContenidoView } from './views';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import type { ToolContent } from './views/ContenidoView';
import { toApiError } from '@/lib/api';
import { routes } from '@/config/routes';
import type { CrucigramaContenido, EvaluacionModalidad, MatchingContenido, SopaContenido } from '@/types/api';

export function DetailPage() {
  const { id = '' } = useParams();
  const accountId = useAuth(state => state.user?.id);
  return <ResourceDetail key={`${accountId}:${id}`} id={id} />;
}

function ResourceDetail({ id }: { id: string }) {
  const user = useAuth(state => state.user);
  const queryClient = useQueryClient();
  const location = useLocation();
  const returnPath = resourceReturnPath(location.state?.resourceOrigin, user?.id);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [handledAction, setHandledAction] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [supportMateria, setSupportMateria] = useState('');
  const [publishingSupport, setPublishingSupport] = useState(false);
  const [convertMateria, setConvertMateria] = useState('');
  const [convertNombre, setConvertNombre] = useState('');
  const [convertNota, setConvertNota] = useState(5);
  const [convertModalidad, setConvertModalidad] = useState<EvaluacionModalidad>('fisica');
  const [convertPolicy, setConvertPolicy] = useState<IntentPolicy>('un_intento');
  const [convertAttempts, setConvertAttempts] = useState(2);
  const [convertTimeLimit, setConvertTimeLimit] = useState('');
  const [converting, setConverting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: materias = [] } = useMaterias();
  const materialQuery = useQuery({ queryKey: ['material', id, user?.id], queryFn: () => getMaterial(id), enabled: Boolean(user?.id) });
  const { data: material, isLoading } = materialQuery;
  const meta = material ? TOOL_BY_TIPO[material.tipo] : undefined;
  const linkedEvaluationsQuery = useQuery({
    queryKey: ['material-evaluations', id, user?.id],
    queryFn: () => listMaterialEvaluaciones(id),
    enabled: Boolean(id && user?.id && material),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const capabilities = resourceCapabilities(user?.permissions ?? [], linkedEvaluationsQuery.isFetchedAfterMount && linkedEvaluationsQuery.isSuccess && Array.isArray(linkedEvaluationsQuery.data));
  useEffect(() => {
    if (!capabilities.edit) setEditing(false);
    if (!capabilities.assign) { setShowAssignment(false); setShowConvert(false); }
    if (!capabilities.remove) setConfirmDelete(false);
  }, [capabilities.edit, capabilities.assign, capabilities.remove]);
  const content = useMemo(() => material?.contenido_json ?? {}, [material?.contenido_json]);
  const contentTitle = ((typeof content.titulo === 'string' ? content.titulo : material?.titulo) ?? '');
  const instructions = typeof content.instrucciones === 'string' ? content.instrucciones : null;
  const aiTrace = (
    content._xcalificator
    && typeof content._xcalificator === 'object'
    && !Array.isArray(content._xcalificator)
  ) ? content._xcalificator as Record<string, unknown> : null;
  const alignedDba = Array.isArray(aiTrace?.dba_seleccionados) ? aiTrace.dba_seleccionados.length : 0;
  const pedagogicalApproach = aiTrace?.enfoque_pedagogico;
  const approachLabel = pedagogicalApproach === 'dba_rubrica' || pedagogicalApproach === 'dba'
    ? `Basado en ${alignedDba} criterios de aprendizaje`
    : pedagogicalApproach === 'rubrica' ? 'Orientado por criterios de rúbrica' : 'Creado a partir del tema y el grado';

  const linkedEvaluation = linkedEvaluationsQuery.data?.[0] ?? null;
  const linkedEvaluationId = linkedEvaluation?.id ?? material?.evaluacion_id ?? null;
  const linkedMateriaId = linkedEvaluation?.materia_id ?? material?.materia_id ?? null;
  const linkedState = linkedEvaluation?.estado ?? material?.evaluacion_estado ?? null;
  const activityCanBeShown = ['publicada', 'en_calificacion', 'pendiente_revision', 'cerrada'].includes(linkedState ?? '');

  const openConvert = () => {
    if (!capabilities.convert) return;
    setConvertMateria(supportMateria || material?.materia_id || '');
    setConvertNombre(material?.titulo ?? contentTitle);
    setConvertModalidad(material?.evaluacion_modalidad ?? 'fisica');
    setConvertPolicy('un_intento');
    setConvertAttempts(2);
    setConvertTimeLimit('');
    setShowConvert(true);
  };

  const remove = async () => {
    if (isDeleting || !capabilities.remove) return;
    setIsDeleting(true);
    try {
      await deleteMaterial(id);
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
      if (!active.current) return;
      toast.success('Material eliminado');
      navigate(returnPath);
    } catch {
      toast.error('No fue posible eliminar el material. Intenta nuevamente.');
      setIsDeleting(false);
    }
  };

  const canonicalShareUrl = new URL(material?.publicado_estudiantes ? `/app/recursos/${id}` : `/app/herramientas/${id}`, window.location.origin).href;
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: contentTitle,
          text: `Revisa este material: ${contentTitle}`,
          url: canonicalShareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(canonicalShareUrl);
        toast.success('Enlace copiado al portapapeles');
      } else {
        toast.error('No se pudo compartir el material.');
      }
    } catch {
      // user cancelled
    }
  };

  const startEditing = useCallback(() => {
    if (!capabilities.edit) return;
    setEditingCriteria(false);
    setEditing(true);
  }, [capabilities.edit]);

  const openAssignment = useCallback(() => {
    if (!capabilities.assign) return;
    setSupportMateria(material?.materia_id ?? '');
    setShowAssignment(true);
  }, [material?.materia_id, capabilities.assign]);

  useEffect(() => {
    if (!material || handledAction) return;
    const action = searchParams.get('action');
    if (action === 'edit' && capabilities.edit) startEditing();
    if (action === 'assign' && !linkedEvaluationId && capabilities.assign) openAssignment();
    if ((action === 'edit' && capabilities.edit) || (action === 'assign' && capabilities.assign)) setHandledAction(true);
  }, [handledAction, linkedEvaluationId, material, openAssignment, searchParams, startEditing, capabilities.edit, capabilities.assign]);
  const handlePublishSupport = async () => {
    if (!supportMateria || publishingSupport || !capabilities.assign) return;
    setPublishingSupport(true);
    try {
      await assignMaterialAsSupport(id, supportMateria);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['material', id] }),
        queryClient.invalidateQueries({ queryKey: ['materials'] }),
        queryClient.invalidateQueries({ queryKey: ['materia-resources', supportMateria] }),
      ]);
      setShowAssignment(false);
      toast.success('Material publicado como apoyo para el salón');
    } catch (err) {
      toast.error(toApiError(err).detail);
    } finally {
      setPublishingSupport(false);
    }
  };

  const handleToggleVisibility = async (visible: boolean) => {
    if (publishingSupport || !capabilities.assign) return;
    setPublishingSupport(true);
    try {
      await setMaterialVisibility(id, visible);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['material', id] }),
        queryClient.invalidateQueries({ queryKey: ['materials'] }),
        queryClient.invalidateQueries({ queryKey: ['materia-resources', material?.materia_id] }),
        queryClient.invalidateQueries({ queryKey: ['evaluaciones', material?.materia_id] }),
      ]);
      toast.success(visible ? 'El recurso ya es visible para los estudiantes' : 'El recurso quedó oculto sin borrar entregas ni notas');
    } catch (err) {
      toast.error(toApiError(err).detail);
    } finally {
      setPublishingSupport(false);
    }
  };
  const handleDuplicate = async () => {
    if (duplicating || !capabilities.duplicate) return;
    setDuplicating(true);
    try {
      const newMaterial = await duplicateMaterial(id);
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
      if (!active.current) return;
      toast.success('Material duplicado');
      navigate(`/app/herramientas/${newMaterial.id}`);
    } catch (err) {
      toast.error(toApiError(err).detail);
    } finally {
      setDuplicating(false);
    }
  };

  const handleConvert = async () => {
    if (converting || !capabilities.convert) return;
    if (!convertMateria) {
      toast.error('Selecciona la materia donde se administrará la evaluación.');
      return;
    }
    setConverting(true);
    try {
      const parsedTimeLimit = Number(convertTimeLimit);
      const attempts = convertPolicy === 'un_intento'
        ? 1
        : convertPolicy === 'practica_libre'
          ? undefined
          : Math.max(2, Math.floor(convertAttempts || 2));
      const result = await convertToEvaluacion(id, {
        materia_id: convertMateria,
        nombre: convertNombre.trim() || undefined,
        nota_maxima: convertNota,
        modalidad: convertModalidad,
        politica_intento: convertPolicy,
        intentos_permitidos: attempts,
        tiempo_limite_minutos: parsedTimeLimit > 0 ? parsedTimeLimit : undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['evaluaciones'] }),
        queryClient.invalidateQueries({ queryKey: ['material-evaluations', id] }),
        queryClient.invalidateQueries({ queryKey: ['material', id] }),
        queryClient.invalidateQueries({ queryKey: ['materials'] }),
        queryClient.invalidateQueries({ queryKey: ['materia-resources', convertMateria] }),
      ]);
      if (!active.current) return;
      setShowConvert(false);
      toast.success(`Evaluación creada: ${result.nombre} (${result.preguntas?.length ?? 0} preguntas)`);
      navigate(routes.materiaEvaluaciones(result.materia_id));
    } catch (err) {
      toast.error(toApiError(err).detail);
    } finally {
      setConverting(false);
    }
  };
  if (isLoading) return <LoadingScreen />;
  if (materialQuery.isError) {
    const status = toApiError(materialQuery.error).status;
    return <div role="alert" className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <p>{status === 404 ? 'Este recurso no está disponible.' : status === 403 ? 'No tienes acceso a este recurso.' : 'No pudimos abrir el recurso. Intenta de nuevo.'}</p>
      <Button variant="outline" onClick={() => void materialQuery.refetch()}>Volver a intentar</Button>
      <Link to={returnPath} className={resourceLinkClass}>Volver a recursos</Link>
    </div>;
  }
  if (!material) return null;

  const renderBody = () => {
    switch (material.tipo) {
      case 'crucigrama': return <CrucigramaView data={content as unknown as CrucigramaContenido} />;
      case 'sopa_letras': return <SopaLetrasView data={content as unknown as SopaContenido} />;
      case 'unir_columnas':
      case 'emparejar': return <MatchingView data={content as unknown as MatchingContenido} />;
      default: return <ContenidoView tipo={material.tipo} data={content as unknown as ToolContent} />;
    }
  };

  const state = resourceState(material);
  return (
    <div className="min-w-0 space-y-4">
      <Link to={returnPath} className={resourceLinkClass}><ArrowLeft className="h-4 w-4" /> Volver a recursos</Link>
      <header className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <EducationalIcon name={TOOL_EDUCATIONAL_ICON[material.tipo]} className="h-11 w-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">{meta?.label ?? material.tipo}{material.materia_nombre ? ` · ${material.materia_nombre}` : ''}</p>
            <h1 className="break-words font-display text-xl font-extrabold sm:text-2xl">{contentTitle}</h1>
          </div>
        </div>
        <Badge tone={state.tone}>{state.label}</Badge>
        <ResourceActions id={id} capabilities={capabilities} activityPath={linkedEvaluationId ? (linkedMateriaId ? routes.materiaEvaluaciones(linkedMateriaId) : '/app/evaluaciones') : null}
          visible={Boolean(material.publicado_estudiantes)} canShow={material.asignacion_tipo === 'apoyo' || activityCanBeShown}
          busy={duplicating || publishingSupport || isDeleting} onEdit={startEditing} onAssign={openAssignment}
          onShare={() => void handleShare()} onDuplicate={() => void handleDuplicate()}
          onVisibility={visible => void handleToggleVisibility(visible)} onDelete={() => setConfirmDelete(true)} />
      </header>
      {Array.isArray(aiTrace?.errores_criterios) && aiTrace.errores_criterios.length > 0 && (
        <Card role="alert" className="border-amber-300 p-4">
          <p className="font-bold">Revisa los criterios antes de evaluar</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{aiTrace.errores_criterios.map((error, index) => <li key={index}>{String(error)}</li>)}</ul>
          {capabilities.edit && <Button variant="outline" className="mt-3" onClick={() => { setEditingCriteria(true); setEditing(true); }}>Corregir criterios</Button>}
        </Card>
      )}
      <Card role="region" aria-label="Contenido del recurso" tabIndex={0} className="focus-ring min-w-0 overflow-x-auto p-4 sm:p-6" data-resource-body>
        {instructions && material.tipo !== 'examen' && <p className="mb-4 whitespace-pre-wrap text-sm"><strong>Instrucciones: </strong>{instructions}</p>}
        {renderBody()}
      </Card>
      {material.tipo !== 'rubrica' && Array.isArray(content.criterios) && content.criterios.length > 0 && (
        <details className="rounded-xl border border-border bg-surface p-4">
          <summary className="focus-ring min-h-11 cursor-pointer content-center rounded font-semibold">Qué se evaluará · criterios propuestos</summary>
          <div className="space-y-3 py-3">{content.criterios.map((value, index) => {
            const criterion = value && typeof value === 'object' ? value as Record<string, unknown> : {};
            return <div key={index} className="text-sm"><p className="font-bold">{String(criterion.nombre ?? `Criterio ${index + 1}`)}</p><p className="whitespace-pre-wrap">{String(criterion.descripcion ?? '')}</p></div>;
          })}</div>
          {capabilities.edit && <Button variant="outline" onClick={() => { setEditingCriteria(true); setEditing(true); }}>Editar criterios</Button>}
        </details>
      )}
      <details className="rounded-xl border border-border bg-surface p-4">
        <summary className="focus-ring min-h-11 cursor-pointer content-center rounded font-semibold">Información del recurso</summary>
        <p className="mt-2 text-sm text-muted">{material.asignacion_tipo === 'apoyo' ? 'Material para repasar: no genera nota.' : linkedEvaluationId ? 'La actividad se administra desde Evaluaciones de la materia. Ocultar no borra entregas ni notas.' : 'Guardado como borrador. Asigna como apoyo para repasar o como actividad calificable.'}</p>
        {aiTrace && <p className="mt-2 text-sm text-muted">Creado con ayuda de IA · {approachLabel}. Revisa su contenido antes de compartirlo.</p>}
        {linkedEvaluationsQuery.isError && <div className="mt-3 space-y-2 text-sm"><p>Puedes leer este recurso. No pudimos habilitar sus opciones de edición.</p><Button variant="outline" onClick={() => void linkedEvaluationsQuery.refetch()}>Comprobar opciones de edición</Button></div>}
      </details>
      {editing && capabilities.edit && <ResourceEditorPanel material={material} criteria={editingCriteria} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
        title="Eliminar material"
        description={<>Se eliminará <strong className="text-fg">{material.titulo}</strong>. Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar"
        tone="danger"
        loading={isDeleting}
      />
      {showAssignment && capabilities.assign && (
        <Modal open onClose={() => setShowAssignment(false)} ariaLabel="Asignar recurso a una clase">
          <div className="space-y-4 [&_input]:text-base [&_select]:text-base">
            <div>
              <h2 className="font-display text-xl font-extrabold">Asignar a una clase</h2>
              <p className="mt-1 text-sm text-muted">Elige qué harán tus estudiantes con este recurso.</p>
            </div>
            <Field label="Materia o salón" required hint={material?.materia_id ? "Conserva la materia elegida al generar. Duplica el recurso para usarlo en otra." : undefined}>
              <Select value={supportMateria} onChange={(event) => setSupportMateria(event.target.value)} disabled={Boolean(material?.materia_id)} required>
                <option value="">Selecciona una materia</option>
                {materias.map((materia) => (
                  <option key={materia.id} value={materia.id}>{materia.nombre}{materia.grado ? ` - ${materia.grado}` : ''}</option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={!supportMateria || publishingSupport}
                onClick={() => void handlePublishSupport()}
                className="focus-ring rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
              >
                <BookOpenCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                <span className="mt-3 block font-bold">Material de apoyo</span>
                <span className="mt-1 block text-sm text-muted">Queda disponible para leer, practicar o descargar. No requiere entrega ni genera nota.</span>
              </button>
              {capabilities.convert && <button
                type="button"
                disabled={!supportMateria || !capabilities.convert}
                onClick={() => { setShowAssignment(false); setConvertMateria(supportMateria); openConvert(); }}
                className="focus-ring rounded-2xl border border-violet-200 bg-violet-50/70 p-4 text-left transition hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-500/30 dark:bg-violet-500/10"
              >
                <ClipboardList className="h-6 w-6 text-violet-600 dark:text-violet-300" />
                <span className="mt-3 block font-bold">Taller o actividad evaluable</span>
                <span className="mt-1 block text-sm text-muted">Crea un borrador editable con entregas, intentos y calificación dentro de Calificator.</span>
              </button>}
            </div>
            <div className="flex justify-end"><Button variant="ghost" onClick={() => setShowAssignment(false)}>Cancelar</Button></div>
          </div>
        </Modal>
      )}
      {showConvert && capabilities.convert && (
        <Modal open onClose={() => setShowConvert(false)} ariaLabel="Asignar como actividad evaluable">
          <div className="space-y-4 [&_input]:text-base [&_select]:text-base">
            <div>
              <h2 className="font-display text-xl font-extrabold">Asignar como actividad evaluable</h2>
              <p className="mt-1 text-sm text-muted">
                XCalificator adaptará este recurso a una evaluación en estado <strong>borrador</strong>.
                Podrás revisarla y publicarla desde la materia seleccionada.
              </p>
            </div>
            <Field label="Nombre de la evaluación">
              <Input value={convertNombre} onChange={(e) => setConvertNombre(e.target.value)} placeholder={contentTitle} />
            </Field>
            <Field label="Materia" required hint="Aquí se administrarán publicación, entregas y calificaciones.">
              <Select value={convertMateria} onChange={(e) => setConvertMateria(e.target.value)} disabled={Boolean(material?.materia_id)} required>
                <option value="">Selecciona una materia</option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}{m.grado ? ` - ${m.grado}` : ''}</option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Modalidad" required>
                <Select value={convertModalidad} onChange={(e) => setConvertModalidad(e.target.value as EvaluacionModalidad)}>
                  <option value="fisica">En papel o por foto</option>
                  <option value="online">En línea</option>
                  <option value="mixta">Mixta</option>
                </Select>
              </Field>
              <Field label="Nota máxima" required>
                <Input type="number" min={1} max={100} step={0.5} value={convertNota} onChange={(e) => setConvertNota(Number(e.target.value) || 5)} />
              </Field>
            </div>
            <Field label="Política de intentos" required>
              <Select value={convertPolicy} onChange={(e) => setConvertPolicy(e.target.value as IntentPolicy)}>
                <option value="un_intento">Un intento</option>
                <option value="multiples_intentos">Múltiples intentos</option>
                <option value="mejor_puntaje">Conservar mejor puntaje</option>
                <option value="ultimo_intento">Conservar último intento</option>
                <option value="practica_libre">Práctica libre</option>
              </Select>
            </Field>
            {convertPolicy !== 'un_intento' && convertPolicy !== 'practica_libre' && (
              <Field label="Intentos permitidos" required>
                <Input type="number" min={2} max={20} step={1} value={convertAttempts} onChange={(e) => setConvertAttempts(Math.max(2, Number(e.target.value) || 2))} />
              </Field>
            )}
            <Field label="Tiempo límite (minutos)" hint="Opcional; déjalo vacío si no habrá límite.">
              <Input type="number" min={1} max={600} step={1} value={convertTimeLimit} onChange={(e) => setConvertTimeLimit(e.target.value)} placeholder="Sin límite" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowConvert(false)}>Cancelar</Button>
              <Button onClick={handleConvert} loading={converting} loadingLabel="Creando…" disabled={!convertMateria || converting}>
                <ClipboardList className="h-4 w-4" /> Crear borrador evaluable
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
