import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, HelpCircle, Plus, Search, X } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { TOOLS, TOOL_EDUCATIONAL_ICON } from '@/modules/herramientas/meta';
import { MATERIAL_CREATION_TOOLS } from '@/modules/herramientas/toolPickerModel';
import { listMaterials } from '@/modules/herramientas/api';
import { listMaterias } from '@/modules/materias/api';
import { Card, EducationalIcon, getSubjectEducationalIcon, GuidedTour, Input, Skeleton, useFirstVisitTour, type TourStep } from '@/components/ui';
import { DashboardEstudiante } from './DashboardEstudiante';
import { DashboardAdmin } from './DashboardAdmin';
import { TeacherInbox } from './TeacherInbox';
import { routes } from '@/config/routes';
import { getEvaluacion } from '@/modules/evaluaciones/api';
import { getEvaluationReview } from '@/modules/calificaciones/api';
import { clearTeacherReviewResume, readTeacherReviewResume, saveTeacherReviewResume, teacherReviewResumeHref } from '@/modules/calificaciones/teacherReviewResume';
import { toApiError } from '@/lib/api';
import type { Materia } from '@/types/api';

const tourSteps: TourStep[] = [
  { target: '#teacher-subjects-title', title: 'Empieza por tu materia', description: 'Busca tu grupo. Evaluaciones abre sus actividades y notas; Pasar lista abre la lista del día.' },
  { target: '#teacher-attention', title: 'Revisa cuando lo necesites', description: 'Abre los pendientes para consultar cada caso. La IA propone y tú decides la nota.' },
  { target: '#teacher-tools', title: 'Prepara tu próxima clase', description: 'Las herramientas y los recursos siguen disponibles aquí y en el menú.' },
];
const actionClass = 'focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition hover:bg-surface-2';
function searchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

function TeacherReviewResumeCard({ userId, materias }: { userId: string; materias: Materia[] }) {
  const [resume, setResume] = useState(() => readTeacherReviewResume(userId));
  const [notice, setNotice] = useState('');
  const subject = materias.find(item => item.id === resume?.materiaId);
  const evaluation = useQuery({ queryKey: ['teacher-review-resume', userId, resume?.evaluacionId],
    queryFn: () => getEvaluacion(resume!.evaluacionId), enabled: Boolean(resume && subject), retry: false, staleTime: 30_000 });
  const validEvaluation = Boolean(resume && subject && evaluation.data?.id === resume.evaluacionId && evaluation.data?.materia_id === resume.materiaId);
  const student = useQuery({ queryKey: ['teacher-review-resume-student', userId, resume?.evaluacionId, resume?.estudianteId],
    queryFn: ({ signal }) => getEvaluationReview(resume!.evaluacionId, { estudiante_id: resume!.estudianteId, limit: 1 }, signal),
    enabled: Boolean(validEvaluation && resume?.estudianteId), retry: false, staleTime: 30_000 });
  const failure = evaluation.error ?? student.error;
  const permanentFailure = failure && [403, 404].includes(toApiError(failure).status);
  const selectedStudent = student.data?.alumnos.find(item => item.estudiante_id === resume?.estudianteId
    && (!resume?.calificacionId || item.calificacion_id === resume.calificacionId));
  useEffect(() => {
    if (!resume) return;
    if (!subject || permanentFailure || (evaluation.isSuccess && !validEvaluation)) {
      clearTeacherReviewResume(userId); setResume(null);
      setNotice('La revisión anterior ya no está disponible. Elige una materia.');
    } else if (resume.estudianteId && student.isSuccess && !selectedStudent) {
      const group = { version: 1 as const, userId, materiaId: resume.materiaId, evaluacionId: resume.evaluacionId, updatedAt: Date.now() };
      saveTeacherReviewResume(userId, group); setResume(group);
      setNotice('El estudiante anterior ya no está disponible en esta revisión. Volverás al grupo.');
    }
  }, [resume, subject, permanentFailure, evaluation.isSuccess, validEvaluation, student.isSuccess, selectedStudent, userId]);
  if (!resume) return notice ? <p role="status" className="text-sm text-muted">{notice}</p> : null;
  if (failure && !permanentFailure) return <Card role="alert" className="space-y-2 p-3"><p>No pudimos abrir la revisión anterior. Puedes reintentar.</p>
    <button type="button" className={actionClass} onClick={() => { if (evaluation.isError) void evaluation.refetch(); if (student.isError) void student.refetch(); }}>Reintentar revisión</button></Card>;
  if (!validEvaluation || permanentFailure || (resume.estudianteId && (!student.isSuccess || !selectedStudent))) return null;
  return <Card className="flex flex-wrap items-center justify-between gap-2 p-3">
    <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{subject!.nombre} · {evaluation.data!.nombre}</p>
      {notice && <p role="status" className="mt-1 text-xs text-muted">{notice}</p>}</div>
    <Link to={teacherReviewResumeHref(resume)} className={actionClass}>Continuar revisión <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
  </Card>;
}

export function DashboardPage() {
  const user = useAuth((state) => state.user);
  if (user?.rol === 'admin') return <DashboardAdmin />;
  if (user?.rol === 'estudiante') return <DashboardEstudiante />;
  return <DashboardDocente />;
}

function DashboardDocente() {
  const user = useAuth((state) => state.user);
  const allowed = new Set(user?.permissions ?? []);
  const canReadSubjects = allowed.has('subjects.read');
  const canReadResources = allowed.has('resources.read');
  const canCreateResources = allowed.has('resources.create');
  const canReview = allowed.has('submissions.review') && (allowed.has('grading.read') || allowed.has('grading.grade'));
  const canResume = user?.rol === 'profesor' && canReadSubjects && allowed.has('evaluations.read') && allowed.has('grading.read');
  useEffect(() => { if (user?.id && !canResume) clearTeacherReviewResume(user.id); }, [user?.id, canResume]);
  const [search, setSearch] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const materiasQuery = useQuery({ queryKey: ['materias'], queryFn: listMaterias, enabled: canReadSubjects });
  const materialsQuery = useQuery({ queryKey: ['materials', 'recent'], queryFn: () => listMaterials(), enabled: canReadResources && toolsOpen });
  const guide = useFirstVisitTour({ tourId: 'teacher-home', role: 'profesor', version: 1, enabled: canReadSubjects && materiasQuery.isSuccess });
  const firstName = user?.nombre?.trim().split(/\s+/)[0] || 'docente';
  const materias = (materiasQuery.data ?? []).filter((materia) => materia.estado !== 'archivada');
  const query = searchText(search.trim());
  const visible = materias.filter((materia) => searchText([materia.nombre, materia.grado, materia.area].filter(Boolean).join(' ')).includes(query));
  const recentMaterials = (materialsQuery.data ?? []).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-20 sm:space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="break-words font-display text-2xl font-extrabold">Hola, {firstName}</h1>
          <p className="mt-1 text-sm text-muted">¿Con qué grupo trabajamos hoy?</p>
        </div>
        <button type="button" onClick={guide.openTour} className={actionClass} aria-label="Cómo empezar">
          <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="text-xs sm:text-sm">Cómo empezar</span>
        </button>
      </header>

      {canReview && <div id="teacher-attention"><TeacherInbox compact /></div>}
      {canResume && user && materiasQuery.isSuccess && <TeacherReviewResumeCard key={user.id} userId={user.id} materias={materias} />}

      <section id="teacher-subjects" aria-labelledby="teacher-subjects-title" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="teacher-subjects-title" className="font-display text-xl font-bold">Tus materias</h2>
          {canReadSubjects && <Link to={routes.materias} className={actionClass}>Ver todas <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
        </div>
        {!canReadSubjects ? <Card className="p-4"><p>No tienes acceso a materias con tus permisos actuales.</p></Card> : <>
          <div className="relative">
            <label htmlFor="teacher-subject-search" className="sr-only">Buscar materia</label>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" aria-hidden="true" />
            <Input id="teacher-subject-search" type="search" value={search} onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Buscar materia o grado" className="pl-9 pr-12 text-base" />
            {search && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch('')} className="focus-ring absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-lg"><X className="h-4 w-4" aria-hidden="true" /></button>}
          </div>
          {materiasQuery.isLoading ? <div aria-label="Cargando materias" className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
            : materiasQuery.isError ? <Card className="space-y-2 p-4" role="alert"><p className="font-semibold">No pudimos cargar tus materias</p><button type="button" className={actionClass} onClick={() => void materiasQuery.refetch()}>Reintentar materias</button></Card>
            : materias.length === 0 ? <Card className="space-y-3 p-4"><p className="font-semibold">Crea tu primera materia</p><p className="text-sm text-muted">Organiza aquí tus grupos y evaluaciones.</p>{allowed.has('subjects.create') && <Link to={routes.materias} className={actionClass}><Plus className="h-4 w-4" aria-hidden="true" />Nueva materia</Link>}</Card>
            : visible.length === 0 ? <Card className="p-4"><p>No encontramos esa materia</p><button type="button" className={actionClass + ' mt-3'} onClick={() => setSearch('')}>Mostrar todas</button></Card>
            : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((materia) => <Card key={materia.id} className="min-w-0 p-3 sm:p-4" data-testid="teacher-subject-card">
                <div className="flex items-center gap-3">
                  <EducationalIcon name={getSubjectEducationalIcon(materia.area)} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0"><Link to={routes.materia(materia.id)} className="focus-ring block min-h-11 content-center break-words rounded-lg font-bold leading-snug">{materia.nombre}</Link>
                    {materia.grado && <p className="text-xs text-muted">Grado {materia.grado}</p>}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {allowed.has('evaluations.read') && <Link to={routes.materiaEvaluaciones(materia.id)} className={actionClass + ' border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200'} aria-label={'Evaluaciones de ' + materia.nombre}>Evaluaciones</Link>}
                  {(allowed.has('attendance.read') || allowed.has('attendance.manage')) && <Link to={routes.materiaAsistencia(materia.id)} className={actionClass} aria-label={'Pasar lista de ' + materia.nombre}>Pasar lista</Link>}
                </div>
              </Card>)}
            </div>}
        </>}
      </section>

      {(canReadResources || canCreateResources) && <section id="teacher-tools" className="rounded-2xl border border-border bg-surface">
        <button type="button" aria-expanded={toolsOpen} aria-controls="teacher-tools-content" onClick={() => setToolsOpen(!toolsOpen)} className="focus-ring flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left font-bold">
          Herramientas y recursos <ChevronDown className={'h-5 w-5 shrink-0 transition-transform ' + (toolsOpen ? 'rotate-180' : '')} aria-hidden="true" />
        </button>
        {toolsOpen && <div id="teacher-tools-content" className="space-y-4 border-t border-border p-4">
          {canCreateResources && <div><h2 className="font-bold">Crear un recurso</h2><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MATERIAL_CREATION_TOOLS.slice(0, 4).map((tool) => <Link key={tool.tipo} to={routes.herramientaNueva(tool.tipo)} className={actionClass + ' flex-col py-3 text-center'}><EducationalIcon name={TOOL_EDUCATIONAL_ICON[tool.tipo]} className="h-10 w-10" />{tool.label}</Link>)}
          </div></div>}
          {canReadResources && <div className="space-y-3">
            <Link to={routes.herramientas} className={actionClass}>Ver todos los recursos <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            {materialsQuery.isLoading ? <p role="status">Cargando materiales…</p>
              : materialsQuery.isError ? <div role="alert"><p>No pudimos cargar los materiales</p><button type="button" className={actionClass + ' mt-2'} onClick={() => void materialsQuery.refetch()}>Reintentar materiales</button></div>
              : recentMaterials.length === 0 ? <p className="text-sm text-muted">Aún no tienes materiales</p>
              : recentMaterials.map((item) => <Link key={item.id} to={routes.herramienta(item.id)} className="focus-ring flex min-h-14 items-center gap-3 rounded-xl border border-border p-3"><EducationalIcon name={TOOL_EDUCATIONAL_ICON[item.tipo]} className="h-10 w-10 shrink-0" /><span className="min-w-0 break-words"><span className="block font-semibold">{item.titulo ?? item.tipo}</span><span className="text-xs text-muted">{TOOLS.find((tool) => tool.tipo === item.tipo)?.label ?? item.tipo}</span></span></Link>)}
          </div>}
        </div>}
      </section>}
      <GuidedTour steps={tourSteps} open={guide.open} onClose={guide.closeTour} tourId="teacher-home" role="profesor" version={1} />
    </div>
  );
}
