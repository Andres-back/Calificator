import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertTriangle, BarChart3, CheckCircle2, Clock, Eye, GraduationCap,
  HelpCircle, Sparkles, TrendingDown, TrendingUp,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Select, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { routes } from '@/config/routes';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import { api, toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Overview {
  periodo: { desde: string; hasta: string };
  evaluaciones_activas: number;
  entregas: { total: number; pendientes_revision: number; confirmadas: number; publicadas: number };
  ia: { coincidencia_exacta: number; tasa_ajustes: number; confianza_promedio: number; incidencias_abiertas: number };
  productividad: { tiempo_revision_segundos: number; tiempo_promedio_por_entrega: number; tiempo_estimado_ahorrado_segundos: number; entregas_con_tiempo: number };
}

interface EvalRow {
  id: string; nombre: string; estado: string; total_entregas: number;
  pendientes: number; confirmadas: number; publicadas: number;
  promedio: number; tasa_aprobacion: number;
}

function fetchOverview(materiaId?: string): Promise<Overview> {
  const params: Record<string, string> = {};
  if (materiaId) params.materia_id = materiaId;
  return api.get('/analytics/overview', { params }).then((r) => r.data);
}

function fetchEvaluaciones(materiaId?: string): Promise<EvalRow[]> {
  const params: Record<string, string> = {};
  if (materiaId) params.materia_id = materiaId;
  return api.get('/analytics/evaluaciones', { params }).then((r) => r.data);
}

function formatSegundos(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

/* ─── MetricCard ─── */
function MetricCard({ icon, label, value, sub, trend }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-fg">{value}</p>
        <p className="text-xs text-muted">{label}</p>
        {sub && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">{sub}</p>}
        {trend && (
          <span className={`mt-1 inline-flex items-center gap-0.5 text-xs font-semibold ${
            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-muted'
          }`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
            {trend === 'up' ? 'Mejorando' : trend === 'down' ? 'Atención' : ''}
          </span>
        )}
      </div>
    </Card>
  );
}

/* ─── Barra de progreso ─── */
function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-fg">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          className={`h-full rounded-full ${color}`}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}

/* ─── Componente principal ─── */
export function AnalyticsPage() {
  const role = useAuth((state) => state.user?.rol);
  const { data: materias } = useMaterias();
  const [materiaId, setMateriaId] = useState('');

  useEffect(() => { if (!materiaId && materias?.[0]) setMateriaId(materias[0].id); }, [materias, materiaId]);

  const overviewQuery = useQuery({
    queryKey: ['analytics-overview', materiaId],
    queryFn: () => fetchOverview(materiaId || undefined),
  });
  const evalsQuery = useQuery({
    queryKey: ['analytics-evaluaciones', materiaId],
    queryFn: () => fetchEvaluaciones(materiaId || undefined),
  });

  const ov = overviewQuery.data;
  const evals = evalsQuery.data;

  const totalPendientes = ov?.entregas.pendientes_revision ?? 0;
  const sinPublicar = (ov?.entregas.confirmadas ?? 0) - (ov?.entregas.publicadas ?? 0);
  const necesitaAtencion = (ov?.ia.incidencias_abiertas ?? 0) + totalPendientes;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analítica"
        eyebrow="Dashboard docente"
        subtitle="Métricas operativas de tus evaluaciones y calidad de la IA."
      />

      {/* Filtros */}
      <Card className="flex flex-wrap items-end gap-4 p-4">
        <Field label="Materia">
          <div className="min-w-[200px]">
            <Select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
            <option value="">Todas las materias</option>
            {materias?.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </Select>
          </div>
        </Field>
        <p className="text-xs text-muted">Período: últimos 30 días</p>
      </Card>

      {overviewQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : overviewQuery.error ? (
        <EmptyState icon={BarChart3} title="Error al cargar analítica" description={toApiError(overviewQuery.error).detail} />
      ) : ov ? (
        <>
          {/* Fila 1 — tarjetas principales */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<GraduationCap className="h-5 w-5" />}
              label="Entregas procesadas"
              value={String(ov.entregas.total)}
              sub={`${ov.evaluaciones_activas} evaluaciones activas`}
            />
            <MetricCard
              icon={<Clock className="h-5 w-5" />}
              label="Pendientes de revisión"
              value={String(totalPendientes)}
              sub={totalPendientes > 0 ? `${sinPublicar} confirmadas sin publicar` : 'Todo al día'}
              trend={totalPendientes > 5 ? 'down' : 'up'}
            />
            <MetricCard
              icon={<Sparkles className="h-5 w-5" />}
              label="Tiempo estimado ahorrado"
              value={formatSegundos(ov.productividad.tiempo_estimado_ahorrado_segundos)}
              sub={`${formatSegundos(ov.productividad.tiempo_promedio_por_entrega)} promedio por entrega`}
            />
            <MetricCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Coincidencia docente–IA"
              value={`${(ov.ia.coincidencia_exacta * 100).toFixed(0)}%`}
              sub={`${(ov.ia.tasa_ajustes * 100).toFixed(0)}% ajustadas`}
              trend={ov.ia.coincidencia_exacta >= 0.7 ? 'up' : 'down'}
            />
          </div>

          {/* Fila 2 — Estado del proceso + tiempos */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-4 p-5">
              <h3 className="font-display font-bold">Estado del proceso de calificación</h3>
              <div className="space-y-3">
                <ProgressBar label="Pendientes de revisión" value={totalPendientes} max={ov.entregas.total || 1} color="bg-amber-500" />
                <ProgressBar label="Confirmadas (sin publicar)" value={sinPublicar} max={ov.entregas.total || 1} color="bg-sky-500" />
                <ProgressBar label="Publicadas al estudiante" value={ov.entregas.publicadas} max={ov.entregas.total || 1} color="bg-emerald-500" />
              </div>
              {ov.ia.incidencias_abiertas > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{ov.ia.incidencias_abiertas} incidencia(s) abierta(s) requieren atención.</span>
                </div>
              )}
            </Card>

            <Card className="space-y-4 p-5">
              <h3 className="font-display font-bold">Tiempo de revisión</h3>
              {ov.productividad.entregas_con_tiempo > 0 ? (
                <div className="space-y-2">
                  <p className="text-3xl font-extrabold text-fg">{formatSegundos(ov.productividad.tiempo_revision_segundos)}</p>
                  <p className="text-xs text-muted">Tiempo total en revisión ({ov.productividad.entregas_con_tiempo} entregas medidas)</p>
                  <p className="text-xs text-muted">
                    <strong>{formatSegundos(ov.productividad.tiempo_promedio_por_entrega)}</strong> por entrega
                    {' · '}
                    <strong>{formatSegundos(ov.productividad.tiempo_estimado_ahorrado_segundos)}</strong> estimado ahorrados
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted">Aún no hay suficientes datos de tiempo de revisión. Sigue usando el workspace para generar métricas.</p>
              )}
            </Card>
          </div>

          {/* Fila 3 — Evaluaciones recientes */}
          {evals && evals.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-4 font-display font-bold">Evaluaciones recientes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-semibold text-muted">
                      <th className="pb-2 pr-4">Evaluación</th>
                      <th className="pb-2 pr-4">Estado</th>
                      <th className="pb-2 pr-4 text-right">Total</th>
                      <th className="pb-2 pr-4 text-right">Pend.</th>
                      <th className="pb-2 pr-4 text-right">Pub.</th>
                      <th className="pb-2 pr-4 text-right">Prom.</th>
                      <th className="pb-2 pr-4 text-right">Aprob.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evals.slice(0, 10).map((ev) => (
                      <tr key={ev.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-4 font-medium">{ev.nombre}</td>
                        <td className="py-2.5 pr-4"><Badge tone={ev.estado === 'publicada' ? 'success' : 'warning'}>{ev.estado}</Badge></td>
                        <td className="py-2.5 pr-4 text-right">{ev.total_entregas}</td>
                        <td className="py-2.5 pr-4 text-right text-amber-600">{ev.pendientes}</td>
                        <td className="py-2.5 pr-4 text-right text-emerald-600">{ev.publicadas}</td>
                        <td className="py-2.5 pr-4 text-right font-semibold">{ev.promedio.toFixed(1)}</td>
                        <td className="py-2.5 pr-4 text-right">{(ev.tasa_aprobacion * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Fila 4 — Atención requerida */}
          {necesitaAtencion > 0 && (
            <Card className="space-y-4 p-5">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Casos que requieren atención
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {totalPendientes > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">{totalPendientes}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">Entregas pendientes de revisión</p>
                  </div>
                )}
                {sinPublicar > 0 && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/30 dark:bg-sky-500/10">
                    <p className="text-2xl font-extrabold text-sky-700 dark:text-sky-300">{sinPublicar}</p>
                    <p className="text-xs text-sky-700 dark:text-sky-300">Confirmadas sin publicar</p>
                  </div>
                )}
                {ov.ia.incidencias_abiertas > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
                    <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-300">{ov.ia.incidencias_abiertas}</p>
                    <p className="text-xs text-rose-700 dark:text-rose-300">Incidencias abiertas</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      ) : null}

      {evals && evals.length === 0 && !overviewQuery.isLoading && (
        <EmptyState icon={BarChart3} title="Sin datos aún" description="Las métricas aparecerán cuando tengas evaluaciones con entregas procesadas." />
      )}

      <p className="text-center text-[10px] text-muted">
        <HelpCircle className="mr-1 inline h-3 w-3" />
        Tiempo estimado ahorrado — calculado contra línea base de 3 min por corrección manual.
        Los datos pueden tardar hasta 1 minuto en reflejarse.
      </p>
    </div>
  );
}
