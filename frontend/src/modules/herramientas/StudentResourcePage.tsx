import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpenCheck, Download, Gamepad2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Card, EducationalIcon, LoadingScreen, QueryError } from '@/components/ui';
import { getMaterial, pdfUrl } from './api';
import { TOOL_BY_TIPO, TOOL_EDUCATIONAL_ICON } from './meta';
import { ContenidoView, CrucigramaView, MatchingView, SopaLetrasView } from './views';
import type { ToolContent } from './views/ContenidoView';
import type { CrucigramaContenido, MatchingContenido, SopaContenido } from '@/types/api';

export function StudentResourcePage() {
  const { id = '' } = useParams();
  const materialQuery = useQuery({ queryKey: ['material', id], queryFn: () => getMaterial(id), enabled: Boolean(id) });
  const material = materialQuery.data;
  const content = useMemo(() => material?.contenido_json ?? {}, [material?.contenido_json]);

  if (materialQuery.isLoading) return <LoadingScreen />;
  if (materialQuery.isError) return <QueryError error={materialQuery.error} title="No fue posible abrir este recurso" description="Verifica que siga publicado y que pertenezca a una de tus materias." onRetry={() => void materialQuery.refetch()} />;
  if (!material) return null;

  const meta = TOOL_BY_TIPO[material.tipo];
  const title = typeof content.titulo === 'string' ? content.titulo : material.titulo;
  const isActivity = material.asignacion_tipo === 'actividad';
  const activityLink = isActivity && material.evaluacion_id ? `/app/evaluaciones/${material.evaluacion_id}/resolver` : null;
  const interactiveActivity = isActivity && meta?.interactive;
  const renderBody = () => {
    if (interactiveActivity) return null;
    switch (material.tipo) {
      case 'crucigrama': return <CrucigramaView data={content as unknown as CrucigramaContenido} />;
      case 'sopa_letras': return <SopaLetrasView data={content as unknown as SopaContenido} />;
      case 'unir_columnas':
      case 'emparejar': return <MatchingView data={content as unknown as MatchingContenido} />;
      default: return <ContenidoView tipo={material.tipo} data={content as unknown as ToolContent} />;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link to={material.materia_id ? `/app/materias/${material.materia_id}/recursos` : '/app/materias'} className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Volver a recursos
      </Link>
      <section className="relative overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-5 shadow-card dark:border-sky-500/30 dark:from-sky-500/10 dark:via-surface dark:to-violet-500/10 sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/90 ring-1 ring-border dark:bg-white/10"><EducationalIcon name={TOOL_EDUCATIONAL_ICON[material.tipo]} className="h-12 w-12" /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2"><Badge tone={material.asignacion_tipo === 'actividad' ? 'violet' : 'sky'}>{material.asignacion_tipo === 'actividad' ? 'Actividad asignada' : 'Material de apoyo'}</Badge>{meta?.interactive && <Badge tone="violet"><Gamepad2 className="h-3 w-3" /> Interactivo</Badge>}</div>
              <h1 className="mt-2 break-words font-display text-xl font-extrabold sm:text-2xl">{title}</h1>
              <p className="mt-1 text-sm text-muted">{material.materia_nombre}</p>
            </div>
          </div>
          <a href={pdfUrl(material.id, false, true)} className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-surface-2"><Download className="h-4 w-4" aria-hidden="true" /> Descargar PDF</a>
        </div>
      </section>
      <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
        <BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          {isActivity ? <><p className="font-bold">{activityLink ? 'Actividad con entrega' : 'Actividad no disponible para entregar'}</p><p className="mt-1">{activityLink ? 'Responde y envía tu trabajo desde la pantalla de la actividad. Allí quedará guardada tu entrega.' : 'Tu docente debe habilitar la evaluación asociada a este recurso.'}</p></> : <p><strong>Recurso para aprender y practicar.</strong> No requiere entrega y no afecta tu nota.</p>}
          {activityLink && <Link to={activityLink} className="focus-ring mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2 font-semibold text-white transition hover:bg-brand-800 sm:w-auto"><BookOpenCheck className="h-4 w-4" aria-hidden="true" />{interactiveActivity ? 'Resolver actividad' : 'Ir a entregar'}</Link>}
        </div>
      </div>
      {!interactiveActivity && <Card className="min-w-0 p-4 sm:p-6">{renderBody()}</Card>}
    </div>
  );
}
