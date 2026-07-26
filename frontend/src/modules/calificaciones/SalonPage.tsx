import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Camera, CheckCircle2, DoorClosed, HelpCircle, ImageUp, Play, SkipForward, Users } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Select, Skeleton, GuidedTour, RichContent } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import { useEstudiantes } from '@/modules/materias/hooks';
import { listEvaluaciones } from '@/modules/evaluaciones/api';
import { toApiError } from '@/lib/api';
import { confidenceLabel } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { queryClient } from '@/lib/queryClient';
import { cerrarSalon, getSalonSesion, iniciarSalon, listCalificaciones, salonFoto } from './api';
import { salonTour } from './tourSteps';
import type { Calificacion, User } from '@/types/api';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

type SessionStatus = 'idle' | 'recovering' | 'active';
type StoredSalonSession = { sesionId: string; evaluacionId: string; materiaId: string };

function studentLabel(student: User) {
  return student.nombre || student.email || student.id.slice(0, 8);
}

function salonStorageKey(userId: string) {
  return `xcalificator:salon-session:${userId}`;
}

export function SalonPage() {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const [materiaId, setMateriaId] = useState('');
  const [evaluacionId, setEvaluacionId] = useState('');
  const [sesionId, setSesionId] = useState('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle');
  const [recoveryCandidate, setRecoveryCandidate] = useState<StoredSalonSession | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [estudianteId, setEstudianteId] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [resultado, setResultado] = useState<Calificacion | null>(null);
  const [processedIds, setProcessedIds] = useState<string[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const storageKey = user?.id ? salonStorageKey(user.id) : null;
  const sessionActive = sessionStatus === 'active' && Boolean(sesionId);
  const sessionRecovering = sessionStatus === 'recovering';

  const removeStoredSession = useCallback(() => {
    if (!storageKey || typeof window === 'undefined') return;
    window.sessionStorage.removeItem(storageKey);
  }, [storageKey]);

  function clearActiveSession() {
    removeStoredSession();
    setSesionId('');
    setSessionStatus('idle');
    setEstudianteId('');
    setFoto(null);
    setResultado(null);
    setProcessedIds([]);
  }

  function persistSession(session: StoredSalonSession) {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(session));
    } catch {
      setRecoveryNotice('La sesión está activa, pero este navegador no pudo recordar su identificador para una recarga.');
    }
  }

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const stored = JSON.parse(raw) as Partial<StoredSalonSession>;
      if (typeof stored.sesionId !== 'string' || typeof stored.evaluacionId !== 'string' || typeof stored.materiaId !== 'string') {
        throw new Error('Formato de sesión inválido');
      }
      setRecoveryCandidate({
        sesionId: stored.sesionId,
        evaluacionId: stored.evaluacionId,
        materiaId: stored.materiaId,
      });
      setSessionStatus('recovering');
    } catch {
      window.sessionStorage.removeItem(storageKey);
      setRecoveryNotice('Se descartó una sesión local inválida. Puedes iniciar una nueva sesión.');
    }
  }, [storageKey]);

  const recoveryQuery = useQuery({
    queryKey: ['salon-session', recoveryCandidate?.sesionId],
    queryFn: () => getSalonSesion(recoveryCandidate!.sesionId),
    enabled: Boolean(recoveryCandidate?.sesionId),
    retry: false,
  });

  useEffect(() => {
    if (!recoveryCandidate) return;

    if (recoveryQuery.isSuccess && recoveryQuery.data) {
      if (recoveryQuery.data.estado === 'activa') {
        setSesionId(recoveryQuery.data.sesion_id);
        setMateriaId(recoveryCandidate.materiaId);
        setEvaluacionId(recoveryQuery.data.evaluacion_id);
        setSessionStatus('active');
        setRecoveryNotice(`Sesión reanudada. ${recoveryQuery.data.estudiantes_pendientes} estudiante(s) siguen pendientes según el servidor.`);
      } else {
        removeStoredSession();
        setSessionStatus('idle');
        setRecoveryNotice('La sesión que este navegador recordaba ya fue cerrada en el servidor.');
      }
      setRecoveryCandidate(null);
    }

    if (recoveryQuery.isError) {
      const apiError = toApiError(recoveryQuery.error);
      removeStoredSession();
      setSessionStatus('idle');
      setRecoveryNotice(
        apiError.status === 403
          ? 'No tienes permiso para reanudar la sesión guardada.'
          : apiError.status === 404
            ? 'La sesión guardada ya no existe en el servidor.'
            : `No fue posible reanudar la sesión: ${apiError.detail}`,
      );
      setRecoveryCandidate(null);
    }
  }, [recoveryCandidate, recoveryQuery.data, recoveryQuery.error, recoveryQuery.isError, recoveryQuery.isSuccess, removeStoredSession]);

  useEffect(() => {
    if (!sessionActive || typeof window === 'undefined') return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [sessionActive]);

  const { data: materias, isLoading: loadingMaterias } = useMaterias();

  useEffect(() => {
    if (!materiaId && materias?.[0] && !sessionRecovering) setMateriaId(materias[0].id);
  }, [materiaId, materias, sessionRecovering]);

  const { data: evaluaciones, isLoading: loadingEvaluaciones } = useQuery({
    queryKey: ['evaluaciones', materiaId],
    queryFn: () => listEvaluaciones(materiaId),
    enabled: Boolean(materiaId),
  });

  useEffect(() => {
    if (sessionActive || sessionRecovering) return;
    if (evaluaciones && evaluaciones.length > 0 && !evaluaciones.find((evaluacion) => evaluacion.id === evaluacionId)) {
      setEvaluacionId(evaluaciones[0].id);
    }
    if (evaluaciones?.length === 0) setEvaluacionId('');
  }, [evaluacionId, evaluaciones, sessionActive, sessionRecovering]);

  const { estudiantes, isLoading: loadingEstudiantes } = useEstudiantes(materiaId);
  const calificacionesSesionQuery = useQuery({
    queryKey: ['calificaciones', evaluacionId, 'salon-progress'],
    queryFn: () => listCalificaciones(evaluacionId),
    enabled: sessionActive && Boolean(evaluacionId),
    retry: false,
  });
  const selectedMateria = materias?.find((materia) => materia.id === materiaId);
  const selectedEvaluacion = evaluaciones?.find((evaluacion) => evaluacion.id === evaluacionId);

  useEffect(() => {
    if (!calificacionesSesionQuery.data || !sessionActive) return;
    setProcessedIds(Array.from(new Set(calificacionesSesionQuery.data.map((calificacion) => calificacion.estudiante_id))));
  }, [calificacionesSesionQuery.data, sessionActive]);

  useEffect(() => {
    if (estudiantes.length > 0 && !estudiantes.find((student) => student.id === estudianteId)) {
      setEstudianteId(estudiantes[0].id);
    }
    if (estudiantes.length === 0) setEstudianteId('');
  }, [estudianteId, estudiantes]);

  const pendingStudents = useMemo(
    () => estudiantes.filter((student) => !processedIds.includes(student.id)),
    [estudiantes, processedIds],
  );

  const startSession = useMutation({
    mutationFn: () => iniciarSalon(evaluacionId),
    onSuccess: (session) => {
      const persisted: StoredSalonSession = {
        sesionId: session.sesion_id,
        evaluacionId: session.evaluacion_id,
        materiaId,
      };
      setSesionId(session.sesion_id);
      setEvaluacionId(session.evaluacion_id);
      setSessionStatus('active');
      setProcessedIds([]);
      setResultado(null);
      setFoto(null);
      persistSession(persisted);
      void queryClient.invalidateQueries({ queryKey: ['calificaciones', session.evaluacion_id] });
      toast.success('Modo Salón iniciado.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const gradePhoto = useMutation({
    mutationFn: () => salonFoto(sesionId, estudianteId, foto!),
    onSuccess: (data) => {
      setResultado(data);
      setProcessedIds((current) => Array.from(new Set([...current, data.estudiante_id])));
      setFoto(null);
      void queryClient.invalidateQueries({ queryKey: ['calificaciones', evaluacionId] });
      toast.success('Foto calificada.');
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.status === 404 || apiError.status === 409) {
        clearActiveSession();
        setRecoveryNotice('La sesión dejó de estar activa en el servidor. Inicia o reanuda una sesión válida antes de continuar.');
      }
      toast.error(apiError.detail);
    },
  });

  const closeSession = useMutation({
    mutationFn: () => cerrarSalon(sesionId),
    onSuccess: () => {
      clearActiveSession();
      setConfirmClose(false);
      toast.success('Sesión de Modo Salón cerrada.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  function handleStart() {
    if (!materiaId) {
      toast.error('Selecciona una materia.');
      return;
    }
    if (!evaluacionId) {
      toast.error('Selecciona una evaluación.');
      return;
    }
    if (startSession.isPending || sessionRecovering) return;
    startSession.mutate();
  }

  function handleFileChange(file: File | undefined) {
    if (!file) {
      setFoto(null);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFoto(null);
      toast.error('Selecciona una imagen JPG, PNG o WebP.');
      return;
    }
    setFoto(file);
  }

  function handleGrade() {
    if (!sessionActive) {
      toast.error('Inicia o reanuda una sesión de Modo Salón.');
      return;
    }
    if (!estudianteId) {
      toast.error('Selecciona un estudiante.');
      return;
    }
    if (processedIds.includes(estudianteId)) {
      toast.error('Este estudiante ya fue procesado para esta evaluación.');
      return;
    }
    if (!foto) {
      toast.error('Selecciona una foto.');
      return;
    }
    if (gradePhoto.isPending) return;
    gradePhoto.mutate();
  }

  function selectNextStudent() {
    const next = pendingStudents.find((student) => student.id !== estudianteId) ?? pendingStudents[0];
    if (next) setEstudianteId(next.id);
  }

  const noMaterias = !loadingMaterias && (!materias || materias.length === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modo Salón"
        eyebrow="Sesión de calificación"
        subtitle="Califica fotos estudiante por estudiante en una sesión guiada y recuperable."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setTourOpen(true)}>
              <HelpCircle className="h-4 w-4" />
              ¿Cómo se usa?
            </Button>
            <Button variant="outline" onClick={() => sessionActive ? setConfirmLeave(true) : navigate('/app/calificaciones')}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>
        }
      />

      <GuidedTour steps={salonTour} open={tourOpen} onClose={() => setTourOpen(false)} tourId="modo-salon" role={user?.rol ?? 'profesor'} version={1} />

      <Card className="flex items-start gap-3 border-l-4 border-l-emerald-500 p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
        <div>
          <p className="font-semibold">La IA sugiere. El docente decide.</p>
          <p className="text-sm text-muted">Revisa cada sugerencia y confirma o ajusta la nota desde Calificaciones.</p>
        </div>
      </Card>

      {sessionRecovering && (
        <Card className="flex items-center gap-3 p-4">
          <Skeleton className="h-5 w-5 rounded-full" />
          <p className="text-sm text-muted">Validando la sesión guardada contra el servidor…</p>
        </Card>
      )}
      {recoveryNotice && !sessionRecovering && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted">{recoveryNotice}</p>
          <Button size="sm" variant="ghost" onClick={() => setRecoveryNotice(null)}>Entendido</Button>
        </Card>
      )}

      {noMaterias ? (
        <EmptyState icon={Users} title="Primero crea una materia" description="Modo Salón necesita una materia con evaluaciones y estudiantes matriculados." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="space-y-5 p-5">
              <div className="flex items-center gap-2">
                <Badge tone={sessionActive ? 'success' : sessionRecovering ? 'warning' : 'neutral'}>
                  {sessionActive ? 'Sesión activa' : sessionRecovering ? 'Verificando sesión' : 'Sin sesión'}
                </Badge>
                {sesionId && <span className="text-xs text-muted">ID: {sesionId}</span>}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Materia" required>
                  {loadingMaterias ? <Skeleton className="h-11" /> : (
                    <Select
                      data-tour="salon-seleccion"
                      value={materiaId}
                      onChange={(event) => {
                        setMateriaId(event.target.value);
                        setResultado(null);
                        setProcessedIds([]);
                      }}
                      disabled={sessionActive || sessionRecovering}
                    >
                      <option value="">Selecciona una materia</option>
                      {materias?.map((materia) => <option key={materia.id} value={materia.id}>{materia.nombre}</option>)}
                    </Select>
                  )}
                </Field>

                <Field label="Evaluación" required>
                  {loadingEvaluaciones ? <Skeleton className="h-11" /> : (
                    <Select
                      value={evaluacionId}
                      onChange={(event) => {
                        setEvaluacionId(event.target.value);
                        setResultado(null);
                        setProcessedIds([]);
                      }}
                      disabled={sessionActive || sessionRecovering || !materiaId || !evaluaciones?.length}
                    >
                      {(!evaluaciones || evaluaciones.length === 0) && <option value="">Sin evaluaciones</option>}
                      {evaluaciones?.map((evaluacion) => <option key={evaluacion.id} value={evaluacion.id}>{evaluacion.nombre}</option>)}
                    </Select>
                  )}
                </Field>
              </div>

              {!sessionActive ? (
                <Button data-tour="salon-iniciar" onClick={handleStart} loading={startSession.isPending} disabled={startSession.isPending || sessionRecovering || !materiaId || !evaluacionId}>
                  <Play className="h-4 w-4" />
                  Iniciar Modo Salón
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button data-tour="salon-cerrar" onClick={() => setConfirmClose(true)} variant="outline" loading={closeSession.isPending} disabled={closeSession.isPending}>
                    <DoorClosed className="h-4 w-4" />
                    Cerrar sesión
                  </Button>
                  <Button type="button" variant="secondary" onClick={selectNextStudent} disabled={pendingStudents.length === 0}>
                    <SkipForward className="h-4 w-4" />
                    Siguiente estudiante
                  </Button>
                </div>
              )}
            </Card>

            {sessionActive && (
              <Card className="space-y-5 p-5">
                <div>
                  <h2 className="font-display text-lg font-bold">Calificar estudiante</h2>
                  <p className="text-sm text-muted">{selectedMateria?.nombre ?? 'Materia'} · {selectedEvaluacion?.nombre ?? 'Evaluación'}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Estudiante actual" required>
                    {loadingEstudiantes ? <Skeleton className="h-11" /> : (
                      <Select data-tour="salon-estudiante" value={estudianteId} onChange={(event) => setEstudianteId(event.target.value)} disabled={estudiantes.length === 0 || gradePhoto.isPending}>
                        {estudiantes.length === 0 && <option value="">Sin estudiantes</option>}
                        {estudiantes.map((student) => <option key={student.id} value={student.id}>{studentLabel(student)}</option>)}
                      </Select>
                    )}
                  </Field>

                  <Field label="Foto" required hint="Formatos permitidos: JPG, PNG o WebP.">
                    <Input
                      data-tour="salon-foto"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => handleFileChange(event.target.files?.[0])}
                      disabled={gradePhoto.isPending}
                    />
                  </Field>
                </div>

                {foto && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                    <ImageUp className="h-5 w-5 text-brand-500" />
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{foto.name}</p><p className="text-xs text-muted">{(foto.size / 1024 / 1024).toFixed(2)} MB</p></div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button data-tour="salon-calificar" onClick={handleGrade} loading={gradePhoto.isPending} disabled={gradePhoto.isPending || processedIds.includes(estudianteId)}>
                    <Camera className="h-4 w-4" />
                    Calificar foto
                  </Button>
                </div>
              </Card>
            )}

            {sessionActive && (
              <Card data-tour="salon-procesados" className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="font-display text-lg font-bold">Estudiantes</h2><p className="text-sm text-muted">Pendientes: {pendingStudents.length} · Calificados: {processedIds.length}</p></div>
                  <Badge tone="neutral">{estudiantes.length} matriculados</Badge>
                </div>
                {calificacionesSesionQuery.isLoading || loadingEstudiantes ? (
                  <div className="grid gap-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12" />)}</div>
                ) : estudiantes.length === 0 ? (
                  <p className="text-sm text-muted">No hay estudiantes matriculados.</p>
                ) : (
                  <div className="grid gap-2">
                    {estudiantes.map((student) => {
                      const processed = processedIds.includes(student.id);
                      const selected = student.id === estudianteId;
                      return (
                        <button key={student.id} type="button" onClick={() => setEstudianteId(student.id)} className={`focus-ring flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${selected ? 'border-brand-300 bg-brand-50 dark:bg-brand-500/10' : 'border-border bg-surface hover:bg-surface-2'}`}>
                          <span><span className="block text-sm font-medium">{studentLabel(student)}</span><span className="block text-xs text-muted">{student.email || student.id.slice(0, 8)}</span></span>
                          <Badge tone={processed ? 'success' : 'warning'}>{processed ? 'Procesado' : 'Pendiente'}</Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>

          <Card className="space-y-4 p-5">
            <div><h2 className="font-display text-lg font-bold">Última calificación</h2><p className="text-sm text-muted">Nota sugerida y comentarios, pendientes de confirmación docente.</p></div>
            {!resultado ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">Aún no hay resultado en esta sesión.</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10"><p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Nota sugerida por IA</p><p className="mt-1 font-display text-4xl font-extrabold text-fg">{Number(resultado.nota_sugerida ?? 0).toFixed(1)}</p><p className="mt-1 text-xs text-muted">Requiere confirmación docente.</p></div>
                <div className="flex flex-wrap gap-2"><Badge tone="neutral">Confianza {confidenceLabel(resultado.confianza)}</Badge><Badge tone={resultado.estado === 'sugerida' ? 'warning' : 'brand'}>{resultado.estado}</Badge><Badge tone="warning">Pendiente de confirmación docente</Badge></div>
                {resultado.feedback && <div className="rounded-xl bg-surface-2 p-4 text-sm text-muted"><RichContent content={resultado.feedback} variant="feedback" /></div>}
              </div>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog open={confirmClose} onClose={() => setConfirmClose(false)} onConfirm={() => closeSession.mutate()} title="Cerrar sesión de salón" confirmLabel="Cerrar sesión" tone="danger" loading={closeSession.isPending} description="Esta acción cerrará la sesión de calificación en curso. Asegúrate de haber procesado a los estudiantes necesarios." />
      <ConfirmDialog open={confirmLeave} onClose={() => setConfirmLeave(false)} onConfirm={() => navigate('/app/calificaciones')} title="Salir sin cerrar la sesión" confirmLabel="Salir y reanudar después" loading={false} description="La sesión seguirá activa en el servidor y se podrá reanudar desde este navegador. Cierra la sesión cuando finalices la jornada." />
    </div>
  );
}
