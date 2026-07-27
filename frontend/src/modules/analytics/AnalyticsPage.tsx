import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertTriangle, BarChart3, BookOpen, CheckCircle2, Clock,
  GraduationCap, HelpCircle, Sparkles, TrendingDown, TrendingUp,
  Users, ShieldAlert, Search,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Select, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import { api, toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { XaliRefuerzoModal } from './XaliRefuerzoModal';

/* ─── Types ─── */
interface Overview {
  periodo: { desde: string; hasta: string };
  evaluaciones_activas: number;
  entregas: { total: number; pendientes_revision: number; confirmadas: number; publicadas: number };
  ia: { coincidencia_exacta: number; tasa_ajustes: number; confianza_promedio: number; incidencias_abiertas: number };
  productividad: { tiempo_revision_segundos: number; tiempo_promedio_por_entrega: number; tiempo_estimado_ahorrado_segundos: number; entregas_con_tiempo: number };
}
interface EvalRow { id: string; nombre: string; estado: string; total_entregas: number; pendientes: number; confirmadas: number; publicadas: number; promedio: number; tasa_aprobacion: number; }
interface CriterioRow { nombre: string; porcentaje_logro: number; estudiantes_evaluados: number; estudiantes_con_dificultad: number; nivel_atencion: string; }
interface EstudianteRow { estudiante_id: string; nombre: string; email: string; promedio_pct: number; total_evaluaciones: number; pendientes: number; bajo_rendimiento: number; senales: string[]; nivel_atencion: string; }
type Tab = 'resumen' | 'rendimiento' | 'estudiantes' | 'calidad_ia';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen', label: 'Resumen', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'rendimiento', label: 'Rendimiento', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'estudiantes', label: 'Estudiantes', icon: <Users className="h-4 w-4" /> },
  { id: 'calidad_ia', label: 'Calidad de IA', icon: <Sparkles className="h-4 w-4" /> },
];

function formatSegundos(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

/* ─── MetricCard ─── */
function MetricCard({ icon, label, value, sub, trend }: { icon: React.ReactNode; label: string; value: string; sub?: string; trend?: 'up' | 'down' }) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{icon}</span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-fg">{value}</p>
        <p className="text-xs text-muted">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
        {trend && <span className={`mt-1 inline-flex items-center gap-0.5 text-xs font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>{trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{trend === 'up' ? 'Mejorando' : 'Atención'}</span>}
      </div>
    </Card>
  );
}

/* ─── ProgressBar ─── */
function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs"><span className="text-muted">{label}</span><span className="font-semibold text-fg">{value}</span></div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={`h-full rounded-full ${color}`} transition={{ duration: 0.6 }} />
      </div>
    </div>
  );
}

/* ═══════════════════════ RESUMEN ═══════════════════════ */
function ResumenTab({ materiaId }: { materiaId: string }) {
  const ov = useQuery({ queryKey: ['analytics-overview', materiaId], queryFn: () => api.get('/analytics/overview', { params: materiaId ? { materia_id: materiaId } : {} }).then(r => r.data) });
  const evals = useQuery({ queryKey: ['analytics-evaluaciones', materiaId], queryFn: () => api.get('/analytics/evaluaciones', { params: materiaId ? { materia_id: materiaId } : {} }).then(r => r.data) });
  if (ov.isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  if (ov.error) return <EmptyState icon={BarChart3} title="Error" description={toApiError(ov.error).detail} />;
  const data = ov.data as Overview | undefined;
  const evs = evals.data as EvalRow[] | undefined;
  if (!data) return null;
  const totalPendientes = data.entregas.pendientes_revision;
  const sinPublicar = data.entregas.confirmadas - data.entregas.publicadas;
  const necesitaAtencion = data.ia.incidencias_abiertas + totalPendientes;
  return (<>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard icon={<GraduationCap className="h-5 w-5" />} label="Entregas procesadas" value={String(data.entregas.total)} sub={`${data.evaluaciones_activas} evaluaciones activas`} />
      <MetricCard icon={<Clock className="h-5 w-5" />} label="Pendientes de revisión" value={String(totalPendientes)} sub={totalPendientes > 0 ? `${sinPublicar} confirmadas sin publicar` : 'Todo al día'} trend={totalPendientes > 5 ? 'down' : 'up'} />
      <MetricCard icon={<Sparkles className="h-5 w-5" />} label="Tiempo estimado ahorrado" value={formatSegundos(data.productividad.tiempo_estimado_ahorrado_segundos)} sub={`${formatSegundos(data.productividad.tiempo_promedio_por_entrega)} promedio por entrega`} />
      <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Coincidencia docente–IA" value={`${(data.ia.coincidencia_exacta * 100).toFixed(0)}%`} sub={`${(data.ia.tasa_ajustes * 100).toFixed(0)}% ajustadas`} trend={data.ia.coincidencia_exacta >= 0.7 ? 'up' : 'down'} />
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4 p-5">
        <h3 className="font-display font-bold">Estado del proceso</h3>
        <ProgressBar label="Pendientes de revisión" value={totalPendientes} max={data.entregas.total || 1} color="bg-amber-500" />
        <ProgressBar label="Confirmadas (sin publicar)" value={sinPublicar} max={data.entregas.total || 1} color="bg-sky-500" />
        <ProgressBar label="Publicadas al estudiante" value={data.entregas.publicadas} max={data.entregas.total || 1} color="bg-emerald-500" />
        {data.ia.incidencias_abiertas > 0 && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{data.ia.incidencias_abiertas} incidencia(s) abierta(s).</div>}
      </Card>
      <Card className="space-y-4 p-5">
        <h3 className="font-display font-bold">Tiempo de revisión</h3>
        {data.productividad.entregas_con_tiempo > 0 ? (<div className="space-y-2"><p className="text-3xl font-extrabold text-fg">{formatSegundos(data.productividad.tiempo_revision_segundos)}</p><p className="text-xs text-muted">Total ({data.productividad.entregas_con_tiempo} entregas medidas)</p><p className="text-xs text-muted"><strong>{formatSegundos(data.productividad.tiempo_promedio_por_entrega)}</strong>/entrega · <strong>{formatSegundos(data.productividad.tiempo_estimado_ahorrado_segundos)}</strong> estimado ahorrados</p></div>) : <p className="text-sm text-muted">Sin datos de tiempo aún.</p>}
      </Card>
    </div>
    {evs && evs.length > 0 && <Card className="p-5"><h3 className="mb-4 font-display font-bold">Evaluaciones recientes</h3>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-xs font-semibold text-muted"><th className="pb-2 pr-4">Evaluación</th><th className="pb-2 pr-4">Estado</th><th className="pb-2 pr-4 text-right">Total</th><th className="pb-2 pr-4 text-right">Pend.</th><th className="pb-2 pr-4 text-right">Pub.</th><th className="pb-2 pr-4 text-right">Prom.</th><th className="pb-2 pr-4 text-right">Aprob.</th></tr></thead>
        <tbody>{evs.slice(0, 10).map((ev: EvalRow) => <tr key={ev.id} className="border-b border-border/50 last:border-0"><td className="py-2.5 pr-4 font-medium">{ev.nombre}</td><td className="py-2.5 pr-4"><Badge tone={ev.estado === 'publicada' ? 'success' : 'warning'}>{ev.estado}</Badge></td><td className="py-2.5 pr-4 text-right">{ev.total_entregas}</td><td className="py-2.5 pr-4 text-right text-amber-600">{ev.pendientes}</td><td className="py-2.5 pr-4 text-right text-emerald-600">{ev.publicadas}</td><td className="py-2.5 pr-4 text-right font-semibold">{ev.promedio.toFixed(1)}</td><td className="py-2.5 pr-4 text-right">{(ev.tasa_aprobacion * 100).toFixed(0)}%</td></tr>)}</tbody></table></div></Card>}
    {necesitaAtencion > 0 && <Card className="space-y-4 p-5"><h3 className="flex items-center gap-2 font-display font-bold"><AlertTriangle className="h-5 w-5 text-amber-500" />Casos que requieren atención</h3><div className="grid gap-3 sm:grid-cols-3">{[totalPendientes > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-2xl font-extrabold text-amber-700">{totalPendientes}</p><p className="text-xs text-amber-700">Pendientes de revisión</p></div>, sinPublicar > 0 && <div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><p className="text-2xl font-extrabold text-sky-700">{sinPublicar}</p><p className="text-xs text-sky-700">Confirmadas sin publicar</p></div>, data.ia.incidencias_abiertas > 0 && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-2xl font-extrabold text-rose-700">{data.ia.incidencias_abiertas}</p><p className="text-xs text-rose-700">Incidencias abiertas</p></div>].filter(Boolean)}</div></Card>}
  </>);
}

/* ═══════════════════════ RENDIMIENTO ═══════════════════════ */
function RendimientoTab({ materiaId }: { materiaId: string }) {
  const crit = useQuery({ queryKey: ['analytics-criterios', materiaId], queryFn: () => api.get('/analytics/criterios', { params: materiaId ? { materia_id: materiaId } : {} }).then(r => r.data) });
  const pregs = useQuery({ queryKey: ['analytics-preguntas', materiaId], queryFn: () => api.get('/analytics/preguntas', { params: materiaId ? { materia_id: materiaId } : {} }).then(r => r.data) });
  const sint = useQuery({ queryKey: ['analytics-sintesis', materiaId], queryFn: () => api.get('/analytics/sintesis', { params: materiaId ? { materia_id: materiaId } : {} }).then(r => r.data) });
  const [refuerzoCriterio, setRefuerzoCriterio] = useState<CriterioRow | null>(null);

  const cData = crit.data as CriterioRow[] | undefined;
  const pData = pregs.data as any[] | undefined;
  const sData = sint.data as any;

  if (crit.isLoading) return <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  // Summary cards
  const total = cData?.length ?? 0;
  const refuerzo = cData?.filter(c => c.nivel_atencion === 'requiere_refuerzo').length ?? 0;
  const dominados = cData?.filter(c => c.nivel_atencion === 'dominado').length ?? 0;
  const logroProm = cData && cData.length > 0 ? cData.reduce((s, c) => s + c.porcentaje_logro, 0) / cData.length : 0;

  return (<>
    <div className="grid gap-4 sm:grid-cols-4">
      <MetricCard icon={<BookOpen className="h-5 w-5" />} label="Logro promedio" value={`${logroProm.toFixed(0)}%`} sub={`${total} criterios evaluados`} />
      <MetricCard icon={<ShieldAlert className="h-5 w-5" />} label="Requieren refuerzo" value={String(refuerzo)} sub={refuerzo > 0 ? `de ${total} criterios` : 'Ninguno'} trend={refuerzo > 0 ? 'down' : 'up'} />
      <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Dominados" value={String(dominados)} sub={dominados > 0 ? `de ${total} criterios` : 'Sin datos'} />
      <MetricCard icon={<GraduationCap className="h-5 w-5" />} label="Estudiantes evaluados" value={cData && cData.length > 0 ? String(cData[0].estudiantes_evaluados) : '0'} />
    </div>

    {/* Barras de criterios */}
    {cData && cData.length > 0 ? (
      <Card className="space-y-4 p-5">
        <h3 className="font-display font-bold">Rendimiento por criterio</h3>
        <div className="space-y-3">
          {cData.map((c) => {
            const color = c.nivel_atencion === 'dominado' ? 'bg-emerald-500' : c.nivel_atencion === 'en_desarrollo' ? 'bg-amber-500' : 'bg-rose-500';
            return (
              <div key={c.nombre} className="group">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-fg">{c.nombre}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted">{c.porcentaje_logro.toFixed(0)}% · {c.estudiantes_con_dificultad}/{c.estudiantes_evaluados} con dificultad</span>
                    {c.nivel_atencion !== 'dominado' && (
                      <button type="button" onClick={() => { setRefuerzoCriterio(c); }}
                        className="focus-ring hidden text-xs font-semibold text-brand-600 hover:text-brand-700 group-hover:inline">
                        Refuerzo
                      </button>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-4 w-full overflow-hidden rounded-full bg-surface-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${c.porcentaje_logro}%` }} className={`h-full rounded-full ${color}`} transition={{ duration: 0.8 }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    ) : (
      <Card className="p-5 text-center text-sm text-muted">No hay datos de criterios. Las métricas aparecen cuando califiques evaluaciones con rúbrica.</Card>
    )}

    {/* Síntesis pedagógica */}
    {sData && !sint.isLoading && (
      <Card className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold">Resumen pedagógico</h3>
            <p className="text-xs text-muted">{sData.contexto.evaluaciones_analizadas} evaluación(es) · {sData.contexto.estudiantes_analizados} estudiantes · {sData.contexto.calificaciones_analizadas} calificaciones</p>
          </div>
          <div className="flex gap-2">
            <a href={`/api/analytics/export/criterios.csv${materiaId ? `?materia_id=${materiaId}` : ''}`}
              className="focus-ring inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold text-fg hover:bg-surface-2"
              target="_blank" rel="noopener noreferrer">CSV criterios</a>
            <a href={`/api/analytics/export/estudiantes.csv${materiaId ? `?materia_id=${materiaId}` : ''}`}
              className="focus-ring inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold text-fg hover:bg-surface-2"
              target="_blank" rel="noopener noreferrer">CSV estudiantes</a>
          </div>
        </div>

        {/* Alertas */}
        {sData.alertas?.length > 0 && (
          <div className="space-y-2">
            {sData.alertas.map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{a.mensaje}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Fortalezas */}
          {sData.fortalezas?.length > 0 && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Fortalezas del grupo</p>
              {sData.fortalezas.map((f: any, i: number) => (
                <div key={i} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{f.titulo}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-300">{f.porcentaje_logro.toFixed(0)}% logro · {f.evidencia.estudiantes_evaluados} estudiantes</p>
                </div>
              ))}
            </div>
          )}

          {/* Dificultades */}
          {sData.dificultades?.length > 0 && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-rose-600"><AlertTriangle className="h-4 w-4" /> Aspectos para reforzar</p>
              {sData.dificultades.map((d: any, i: number) => (
                <div key={i} className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/5">
                  <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">{d.titulo}</p>
                  <p className="text-xs text-rose-600 dark:text-rose-300">{d.porcentaje_logro.toFixed(0)}% logro · {d.evidencia.estudiantes_con_dificultad}/{d.evidencia.estudiantes_evaluados} con dificultad</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    )}

    {/* Preguntas */}
    {pData && pData.length > 0 && (
      <Card className="p-5">
        <h3 className="mb-4 font-display font-bold">Preguntas por evaluación</h3>
        <div className="space-y-3">
          {pData.slice(0, 15).map((p, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-fg">{p.texto}</p>
                <Badge tone="neutral">{p.tipo || '—'}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">{p.evaluacion_nombre} · {p.total_respuestas} respuestas · {p.puntaje_maximo} pts</p>
            </div>
          ))}
        </div>
      </Card>
    )}

    {/* Modal Xali refuerzo */}
    {refuerzoCriterio && (
      <XaliRefuerzoModal
        open={!!refuerzoCriterio}
        onClose={() => setRefuerzoCriterio(null)}
        materiaId={materiaId}
        criterioNombre={refuerzoCriterio.nombre}
        porcentajeLogro={refuerzoCriterio.porcentaje_logro}
        estudiantesConDificultad={refuerzoCriterio.estudiantes_con_dificultad}
        totalEstudiantes={refuerzoCriterio.estudiantes_evaluados}
      />
    )}
  </>);
}

/* ═══════════════════════ CALIDAD DE IA ═══════════════════════ */
type AiSubTab = 'concordancia' | 'rendimiento' | 'errores';
const AI_TABS: { id: AiSubTab; label: string }[] = [
  { id: 'concordancia', label: 'Concordancia' },
  { id: 'rendimiento', label: 'Rendimiento' },
  { id: 'errores', label: 'Errores' },
];

function CalidadIaTab({ materiaId }: { materiaId: string }) {
  const [sub, setSub] = useState<AiSubTab>('concordancia');
  return (<>
    <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
      {AI_TABS.map(t => (
        <button key={t.id} type="button" onClick={() => setSub(t.id)}
          className={`focus-ring flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${sub === t.id ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'}`}>
          {t.label}
        </button>
      ))}
    </div>
    {sub === 'concordancia' && <ConcordanciaTabBody materiaId={materiaId} />}
    {sub === 'rendimiento' && <RendimientoIaTab materiaId={materiaId} />}
    {sub === 'errores' && <ErroresIaTab materiaId={materiaId} />}
  </>);
}

function ConcordanciaTabBody({ materiaId }: { materiaId: string }) {
  const conc = useQuery({ queryKey: ['ai-concordancia', materiaId], queryFn: () => api.get('/analytics/ai-quality/concordancia', { params: materiaId ? { materia_id: materiaId } : {} }).then(r => r.data) });

  if (conc.isLoading) return <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  if (conc.error) return <EmptyState icon={Sparkles} title="Error" description={toApiError(conc.error).detail} />;
  const d = conc.data as any;
  if (!d || d.total_calificaciones === 0) return <EmptyState icon={Sparkles} title="Sin datos aún" description="Las métricas de concordancia aparecen cuando hay calificaciones confirmadas por el docente." />;

  const interpretKappa = (v: number) => v >= 0.81 ? 'Casi perfecta' : v >= 0.61 ? 'Sustancial' : v >= 0.41 ? 'Moderada' : v >= 0.21 ? 'Regular' : 'Baja';
  return (<>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Coincidencia exacta" value={`${(d.coincidencia_exacta * 100).toFixed(0)}%`} sub={`${d.total_calificaciones} calificaciones`} trend={d.coincidencia_exacta >= 0.7 ? 'up' : 'down'} />
      <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Coincidencia (tolerancia ±0.2)" value={`${(d.coincidencia_tolerancia * 100).toFixed(0)}%`} />
      <MetricCard icon={<BarChart3 className="h-5 w-5" />} label="MAE normalizado" value={d.mae_normalizado.toFixed(2)} sub={`escala 0-5`} />
      <MetricCard icon={<Sparkles className="h-5 w-5" />} label={`Kappa ponderado: ${interpretKappa(d.kappa.ponderado)}`} value={d.kappa.ponderado.toFixed(3)} sub={`n=${d.kappa.muestra}`} />
    </div>

    {/* Overrides */}
    <Card className="space-y-4 p-5">
      <h3 className="font-display font-bold">Ajustes del docente</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-2xl font-extrabold text-emerald-700">{d.overrides.sin_cambio}</p><p className="text-xs text-emerald-700">Sin cambios (coincidencia exacta)</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-2xl font-extrabold text-amber-700">{d.overrides.aumentadas}</p><p className="text-xs text-amber-700">Aumentadas por docente</p></div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-2xl font-extrabold text-rose-700">{d.overrides.disminuidas}</p><p className="text-xs text-rose-700">Disminuidas por docente</p></div>
      </div>
    </Card>

    {/* Kappa */}
    <Card className="p-5">
      <h3 className="mb-4 font-display font-bold">Concordancia Kappa</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="text-xs text-muted">Kappa simple</p><p className="text-2xl font-extrabold">{d.kappa.simple.toFixed(3)}</p><p className="text-xs text-muted">Categorías: {d.kappa.categorias.join(', ')}</p></div>
        <div><p className="text-xs text-muted">Kappa ponderado (cuadrático)</p><p className="text-2xl font-extrabold">{d.kappa.ponderado.toFixed(3)}</p><p className="text-xs text-muted">Muestra: {d.kappa.muestra} · {interpretKappa(d.kappa.ponderado)}</p></div>
      </div>
    </Card>

    {/* Por evaluación */}
    {d.por_evaluacion?.length > 0 && (
      <Card className="p-5">
        <h3 className="mb-4 font-display font-bold">Concordancia por evaluación</h3>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-xs font-semibold text-muted"><th className="pb-2 pr-4">Evaluación</th><th className="pb-2 pr-4 text-right">Total</th><th className="pb-2 pr-4 text-right">Coincidencia</th><th className="pb-2 pr-4 text-right">MAE</th></tr></thead>
          <tbody>{d.por_evaluacion.map((ev: any) => <tr key={ev.evaluacion_id} className="border-b border-border/50 last:border-0"><td className="py-2.5 pr-4 font-medium">{ev.nombre}</td><td className="py-2.5 pr-4 text-right">{ev.total}</td><td className="py-2.5 pr-4 text-right">{(ev.coincidencia_exacta * 100).toFixed(0)}%</td><td className="py-2.5 pr-4 text-right font-semibold">{ev.mae.toFixed(2)}</td></tr>)}</tbody></table></div>
      </Card>
    )}
  </>);
}

/* ═══════════════════════ ESTUDIANTES ═══════════════════════ */
function EstudiantesTab({ materiaId }: { materiaId: string }) {
  const est = useQuery({ queryKey: ['analytics-estudiantes', materiaId], queryFn: () => api.get('/analytics/estudiantes', { params: materiaId ? { materia_id: materiaId } : {} }).then(r => r.data) });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const eData = est.data as EstudianteRow[] | undefined;
  const filtered = eData?.filter(e => !search || e.nombre?.toLowerCase().includes(search.toLowerCase())) ?? [];

  const detalleQuery = useQuery({
    queryKey: ['analytics-estudiante', selected],
    queryFn: () => api.get(`/analytics/estudiantes/${selected}`).then(r => r.data),
    enabled: !!selected,
  });

  const atencion = eData?.filter(e => e.nivel_atencion === 'atencion').length ?? 0;
  const seguimiento = eData?.filter(e => e.nivel_atencion === 'seguimiento').length ?? 0;
  const estables = eData?.filter(e => e.nivel_atencion === 'estable').length ?? 0;

  if (est.isLoading) return <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (<>
    <div className="grid gap-4 sm:grid-cols-4">
      <MetricCard icon={<Users className="h-5 w-5" />} label="Total estudiantes" value={String(eData?.length ?? 0)} />
      <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label="Requieren atención" value={String(atencion)} trend={atencion > 0 ? 'down' : 'up'} />
      <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="En seguimiento" value={String(seguimiento)} />
      <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Estables" value={String(estables)} />
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      {/* Lista */}
      <Card className="p-4">
        <div className="mb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar estudiante..." className="focus-ring h-9 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm" />
          </div>
        </div>
        {eData && eData.length === 0
          ? <p className="py-8 text-center text-sm text-muted">Aún no hay datos de estudiantes.</p>
          : <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.map((e) => (
                <button key={e.estudiante_id} type="button" onClick={() => setSelected(e.estudiante_id)}
                  className={`focus-ring flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected === e.estudiante_id ? 'border-brand-300 bg-brand-50' : 'border-border bg-surface hover:bg-surface-2'}`}>
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600"><GraduationCap className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.nombre || 'Sin nombre'}</p>
                    <div className="flex flex-wrap gap-1">
                      {e.senales.includes('bajo_desempeno_recurrente') && <Badge tone="error">Bajo recurrente</Badge>}
                      {e.senales.includes('entregas_pendientes') && <Badge tone="warning">Pendientes</Badge>}
                      {e.senales.includes('dificultad_generalizada') && <Badge tone="error">Dificultad gral.</Badge>}
                    </div>
                  </div>
                  <span className={`shrink-0 font-display text-lg font-extrabold ${e.nivel_atencion === 'atencion' ? 'text-rose-600' : e.nivel_atencion === 'seguimiento' ? 'text-amber-600' : 'text-emerald-600'}`}>{e.promedio_pct.toFixed(0)}%</span>
                </button>
              ))}
            </div>}
      </Card>

      {/* Detalle */}
      <Card className="p-5">
        {!selected ? (
          <p className="py-12 text-center text-sm text-muted">Selecciona un estudiante para ver su detalle.</p>
        ) : detalleQuery.isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : detalleQuery.data ? (
          <DetalleEstudiante data={detalleQuery.data} />
        ) : (
          <p className="py-12 text-center text-sm text-muted">Error al cargar detalle.</p>
        )}
      </Card>
    </div>
  </>);
}

/* ── Sub-tab: Rendimiento (latencia + confianza) ── */
function RendimientoIaTab({ materiaId }: { materiaId: string }) {
  const lat = useQuery({ queryKey: ['ai-latency', materiaId], queryFn: () => api.get('/analytics/ai-quality/latency', { params: materiaId ? { materia_id: materiaId } : {} }).then(r => r.data) });
  const conf = useQuery({ queryKey: ['ai-confidence', materiaId], queryFn: () => api.get('/analytics/ai-quality/confidence', { params: materiaId ? { materia_id: materiaId } : {} }).then(r => r.data) });

  if (lat.isLoading || conf.isLoading) return <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  const ld = lat.data as any; const cd = conf.data as any;
  return (<>
    <div className="grid gap-4 sm:grid-cols-4">
      {ld?.total ? (<>
        <MetricCard icon={<Clock className="h-5 w-5" />} label="Latencia mediana" value={`${(ld.total.p50_ms / 1000).toFixed(1)}s`} sub={`n=${ld.total.sample_size}`} />
        <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="P95 latencia" value={`${(ld.total.p95_ms / 1000).toFixed(1)}s`} />
      </>) : (<MetricCard icon={<Clock className="h-5 w-5" />} label="Latencia" value="—" sub="Sin datos" />)}
      {cd ? (<>
        <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Confianza promedio" value={`${(cd.promedio * 100).toFixed(0)}%`} sub={`n=${cd.sample_size}`} />
        <MetricCard icon={<Sparkles className="h-5 w-5" />} label="Confianza alta" value={String(cd.alta)} sub={`media ${cd.media} · baja ${cd.baja}`} />
      </>) : null}
    </div>

    {/* Etapas */}
    {ld?.stages?.length > 0 && <Card className="p-5"><h3 className="mb-4 font-display font-bold">Latencia por etapa</h3>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-xs font-semibold text-muted"><th className="pb-2 pr-4">Etapa</th><th className="pb-2 pr-4 text-right">Promedio</th><th className="pb-2 pr-4 text-right">P50</th><th className="pb-2 pr-4 text-right">P90</th><th className="pb-2 pr-4 text-right">P95</th><th className="pb-2 pr-4 text-right">% del total</th></tr></thead>
        <tbody>{ld.stages.map((s: any) => <tr key={s.stage} className="border-b border-border/50 last:border-0"><td className="py-2.5 pr-4 font-medium capitalize">{s.stage.replace(/_/g, ' ')}</td><td className="py-2.5 pr-4 text-right">{(s.average_ms / 1000).toFixed(1)}s</td><td className="py-2.5 pr-4 text-right">{(s.p50_ms / 1000).toFixed(1)}s</td><td className="py-2.5 pr-4 text-right">{(s.p90_ms / 1000).toFixed(1)}s</td><td className="py-2.5 pr-4 text-right">{(s.p95_ms / 1000).toFixed(1)}s</td><td className="py-2.5 pr-4 text-right">{s.percentage_of_total.toFixed(0)}%</td></tr>)}</tbody></table></div>
    </Card>}

    {/* Confianza */}
    {cd && cd.sample_size > 0 && <Card className="space-y-4 p-5"><h3 className="font-display font-bold">Distribución de confianza</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-2xl font-extrabold text-emerald-700">{cd.alta}</p><p className="text-xs text-emerald-700">Alta (≥80%)</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-2xl font-extrabold text-amber-700">{cd.media}</p><p className="text-xs text-amber-700">Media (60-79%)</p></div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-2xl font-extrabold text-rose-700">{cd.baja}</p><p className="text-xs text-rose-700">Baja (&lt;60%)</p></div>
      </div>
    </Card>}
  </>);
}

/* ── Sub-tab: Errores ── */
function ErroresIaTab({ materiaId }: { materiaId: string }) {
  const err = useQuery({ queryKey: ['ai-errors', materiaId], queryFn: () => api.get('/analytics/ai-quality/errors', { params: materiaId ? { materia_id: materiaId } : {} }).then(r => r.data) });
  if (err.isLoading) return <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  const d = err.data as any;
  if (!d || d.total_runs === 0) return <EmptyState icon={AlertTriangle} title="Sin datos" description="No hay ejecuciones registradas." />;
  return (<>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard icon={<BarChart3 className="h-5 w-5" />} label="Ejecuciones totales" value={String(d.total_runs)} />
      <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label="Incidencias y alertas" value={`${(d.tasa_incidencias * 100).toFixed(1)}%`} sub={`${d.total_incidencias} registradas`} trend={d.tasa_incidencias > 0.05 ? 'down' : 'up'} />
    </div>
    {d.por_tipo && Object.keys(d.por_tipo).length > 0 && <Card className="p-5"><h3 className="mb-4 font-display font-bold">Errores por tipo</h3>
      <div className="space-y-2">{Object.entries(d.por_tipo).map(([tipo, count]) => (
        <div key={tipo} className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
          <span className="capitalize text-fg">{tipo.replace(/_/g, ' ')}</span>
          <span className="font-semibold">{String(count)}</span>
        </div>
      ))}</div>
    </Card>}
    {d.alertas_modelo && Object.keys(d.alertas_modelo).length > 0 && <Card className="p-5"><h3 className="mb-4 font-display font-bold">Alertas del modelo</h3>
      <div className="space-y-2">{Object.entries(d.alertas_modelo).slice(0, 10).map(([alerta, count]) => (
        <div key={alerta} className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
          <span className="text-fg">{alerta}</span>
          <span className="font-semibold">{String(count)}</span>
        </div>
      ))}</div>
    </Card>}
  </>);
}

function DetalleEstudiante({ data }: { data: any }) {
  const d = data as any;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-2xl font-extrabold text-fg">{d.promedio_general?.toFixed(1)}%</p>
        <p className="text-xs text-muted">Promedio general · {d.total_evaluaciones} evaluación(es)</p>
        {d.tendencia && <Badge tone={d.tendencia === 'mejora' ? 'success' : d.tendencia === 'descenso' ? 'error' : 'neutral'}>{d.tendencia === 'mejora' ? 'Mejorando' : d.tendencia === 'descenso' ? 'En descenso' : 'Estable'}</Badge>}
      </div>

      {d.criterios && d.criterios.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-muted">Rendimiento por criterio</p>
          <div className="space-y-2">
            {d.criterios.map((c: any, i: number) => {
              const color = c.promedio_pct >= 80 ? 'bg-emerald-500' : c.promedio_pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
              return (<div key={i}>
                <div className="flex items-center justify-between text-xs"><span>{c.nombre}</span><span>{c.promedio_pct.toFixed(0)}%</span></div>
                <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-surface-2"><motion.div initial={{ width: 0 }} animate={{ width: `${c.promedio_pct}%` }} className={`h-full rounded-full ${color}`} transition={{ duration: 0.6 }} /></div>
              </div>);
            })}
          </div>
        </div>
      )}

      {d.evaluaciones && d.evaluaciones.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-muted">Evaluaciones</p>
          <div className="space-y-1">
            {d.evaluaciones.map((ev: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">
                <span className="font-medium text-fg">{ev.nombre}</span>
                <span className="text-muted">{ev.nota.toFixed(1)}/{ev.nota_maxima.toFixed(1)} ({ev.porcentaje.toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ PAGE PRINCIPAL ═══════════════════════ */
export function AnalyticsPage() {
  const { data: materias } = useMaterias();
  const [materiaId, setMateriaId] = useState('');
  const [tab, setTab] = useState<Tab>('resumen');
  useEffect(() => { if (!materiaId && materias?.[0]) setMateriaId(materias[0].id); }, [materias, materiaId]);

  return (
    <div className="space-y-6">
      <PageHeader title="Analítica" eyebrow="Dashboard docente" subtitle="Métricas operativas, rendimiento académico y acompañamiento estudiantil." />

      {/* Filtros + Tabs */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Materia"><div className="min-w-[200px]"><Select value={materiaId} onChange={e => setMateriaId(e.target.value)}><option value="">Todas</option>{materias?.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</Select></div></Field>
          <p className="text-xs text-muted">Período: últimos 30 días</p>
        </div>
        <div className="mt-4 flex gap-1 rounded-lg bg-surface-2 p-1">
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`focus-ring flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${tab === t.id ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </Card>

      {tab === 'resumen' && <ResumenTab materiaId={materiaId} />}
      {tab === 'rendimiento' && <RendimientoTab materiaId={materiaId} />}
      {tab === 'estudiantes' && <EstudiantesTab materiaId={materiaId} />}
      {tab === 'calidad_ia' && <CalidadIaTab materiaId={materiaId} />}

      <p className="text-center text-[10px] text-muted"><HelpCircle className="mr-1 inline h-3 w-3" />Tiempo estimado ahorrado — calculado contra línea base de 3 min por corrección manual. Datos pueden tardar hasta 1 minuto.</p>
    </div>
  );
}
