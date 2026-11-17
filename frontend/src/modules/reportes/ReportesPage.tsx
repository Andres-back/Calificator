import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Card, EducationalIcon, EmptyState, getSubjectEducationalIcon, QueryState, Skeleton, StatCard } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { getResumenProfesor } from './api';

const BARS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];

export function ReportesPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['reporte-resumen'], queryFn: getResumenProfesor });

  const materias = data?.materias ?? [];
  const totalCals = materias.reduce((s, m) => s + (m.total_calificaciones || 0), 0);
  const conNotas = materias.filter((m) => m.promedio > 0);
  const promGeneral = conNotas.length ? conNotas.reduce((s, m) => s + m.promedio, 0) / conNotas.length : 0;
  // Spec 189: las notas van con su escala y un decimal, como en el resto de la app.
  const escala = materias.find((m) => m.escala)?.escala ?? 5;
  const nota = (value: number) => `${value.toFixed(1)} / ${escala.toFixed(1)}`;
  const chartData = materias.map((m) => ({ nombre: m.nombre, promedio: Number(m.promedio.toFixed(1)), total: m.total_calificaciones }));

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" eyebrow="Seguimiento docente" subtitle="Compara resultados confirmados e identifica dónde enfocar el acompañamiento." />

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={materias.length === 0}
        loading={<><div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24" />)}</div><Skeleton className="h-80" /></>}
        empty={<EmptyState icon={BarChart3} title="Sin datos todavía" description="Cuando califiques evaluaciones, aquí verás estadísticas y gráficas." />}
      >

        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard brandIcon="report-subjects" label="Materias" value={String(materias.length)} tone="brand" />
            <StatCard brandIcon="report-grades" label="Calificaciones" value={String(totalCals)} tone="success" />
            <StatCard brandIcon="report-average" label="Promedio general" value={conNotas.length ? nota(promGeneral) : '—'} tone="warning" />
          </div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5">
              <div className="mb-5"><p className="font-display font-bold">Promedio por materia</p><p className="mt-1 text-sm text-muted">Notas confirmadas, sobre {escala.toFixed(1)}.</p></div>
              {/* Barras horizontales: el nombre completo se lee en celular y en PC. */}
              <div style={{ height: Math.max(120, chartData.length * 56 + 48) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" horizontal={false} />
                    <XAxis type="number" domain={[0, escala]} ticks={Array.from({ length: Math.floor(escala) + 1 }, (_, i) => i)} tick={{ fontSize: 12, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 12, fill: 'rgb(var(--fg))' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgb(var(--surface-2))' }} formatter={(value) => [nota(Number(value)), 'Promedio']} contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="promedio" radius={[0, 8, 8, 0]} maxBarSize={32}>
                      {chartData.map((_, i) => <Cell key={i} fill={BARS[i % BARS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          <Card className="p-5">
            <p className="mb-3 font-display font-bold">Detalle por materia</p>
            <div className="overflow-x-auto" role="region" aria-label="Detalle del promedio por materia" tabIndex={0}>
              <table className="w-full text-sm">
                <caption className="sr-only">Cantidad de calificaciones y promedio confirmado por materia</caption>
                <thead className="bg-surface-2 text-left text-xs uppercase text-muted">
                  <tr><th className="px-3 py-2.5">Materia</th><th className="whitespace-nowrap px-3 py-2.5">Notas</th><th className="whitespace-nowrap px-3 py-2.5">Promedio</th></tr>
                </thead>
                <tbody>
                  {materias.map((m, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-3 font-semibold">
                        <span className="flex items-center gap-2.5">
                          <EducationalIcon name={getSubjectEducationalIcon(m.nombre)} className="h-9 w-9" />
                          {m.nombre}
                        </span>
                      </td>
                      <td className="px-3 py-3">{m.total_calificaciones}</td>
                      <td className="whitespace-nowrap px-3 py-3"><span className="font-bold text-brand-600">{m.total_calificaciones ? nota(m.promedio) : '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      </QueryState>
    </div>
  );
}
