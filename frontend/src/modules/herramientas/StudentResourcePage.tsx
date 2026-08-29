import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpenCheck, Download, Gamepad2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Card, EducationalIcon, LoadingScreen, QueryError } from '@/components/ui';
import { getMaterial, pdfUrl } from './api';
import { TOOL_BY_TIPO, TOOL_EDUCATIONAL_ICON } from './meta';
import { ContenidoView, CrucigramaView, MatchingView, SopaLetrasView } from './views';
import type { ToolContent } from './views/ContenidoView';
import type { CrucigramaContenido, MatchingContenido, SopaContenido } from '@/types/api';
import { cn } from '@/lib/cn';

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
  const renderBody = () => {
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
      <Link to={material.materia_id ? `/app/materias/${material.materia_id}/recursos` : '/app/materias'} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Volver a recursos
      </Link>
      <section className="relative overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-5 shadow-card dark:border-sky-500/30 dark:from-sky-500/10 dark:via-surface dark:to-violet-500/10 sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={cn('grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md', meta?.gradient ?? 'from-sky-500 to-indigo-600')}><EducationalIcon name={TOOL_EDUCATIONAL_ICON[material.tipo]} className="h-9 w-9" /></div>
            <div>
              <div className="flex flex-wrap gap-2"><Badge tone={material.asignacion_tipo === 'actividad' ? 'violet' : 'sky'}>{material.asignacion_tipo === 'actividad' ? 'Actividad asignada' : 'Material de apoyo'}</Badge>{meta?.interactive && <Badge tone="violet"><Gamepad2 className="h-3 w-3" /> Interactivo</Badge>}</div>
              <h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-muted">{material.materia_nombre}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">{material.asignacion_tipo === 'actividad' && material.evaluacion_id && <Link to={'/app/evaluaciones/' + material.evaluacion_id + '/resolver'}><Button className="w-full"><BookOpenCheck className="h-4 w-4" /> Ir a entregar</Button></Link>}<a href={pdfUrl(material.id, false, true)}><Button variant="outline" className="w-full"><Download className="h-4 w-4" /> Descargar PDF</Button></a></div>
        </div>
      </section>
      <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
        <BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{material.asignacion_tipo === 'actividad' ? <><strong>Este es el material que debes resolver.</strong> Puedes trabajarlo aquí o descargarlo. Cuando termines, usa “Ir a entregar” para enviar tus respuestas o la foto/PDF solicitado.</> : <><strong>Recurso para aprender y practicar.</strong> No requiere entrega y no afecta tu nota. Las actividades que sí se califican aparecen en Evaluaciones.</>}</p>
      </div>
      <Card className="p-5 sm:p-7">{renderBody()}</Card>
    </div>
  );
}