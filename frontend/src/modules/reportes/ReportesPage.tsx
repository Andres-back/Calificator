import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart3, BookOpen, ClipboardCheck, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Card, Skeleton, EmptyState, QueryState, StatCard } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { getResumenProfesor } from './api';

const BARS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];

export function ReportesPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['reporte-resumen'], queryFn: getResumenProfesor });

  const materias = data?.materias ?? [];
  const totalCals = materias.reduce((s, m) => s + (m.total_calificaciones || 0), 0);
  const conNotas = materias.filter((m) => m.promedio > 0);
  const promGeneral = conNotas.length ? conNotas.reduce((s, m) => s + m.promedio, 0) / conNotas.length : 0;
  const chartData = materias.map((m) => ({ nombre: m.nombre.length > 14 ? m.nombre.slice(0, 13) + '…' : m.nombre, promedio: Number(m.promedio.toFixed(2)), total: m.total_calificaciones }));

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" eyebrow="Seguimiento docente" subtitle="Compara resultados confirmados e identifica dónde enfocar el acompañamiento." />
      
      {/* Feature Image Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-4 p-4">
          <img 
            src="/branding/feature-report.png" 
            alt="" 
            className="h-16 w-16 rounded-lg object-contain opacity-80"
          />
          <div>
            <p className="font-display font-bold">Reportes y estadísticas</p>
            <p className="mt-1 text-sm text-muted">Visualiza el rendimiento de tus materias y estudiantes con gráficas detalladas.</p>
          </div>
        </div>
      </div>

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
            <StatCard icon={BookOpen} label="Materias" value={String(materias.length)} tone="brand" />
            <StatCard icon={ClipboardCheck} label="Calificaciones" value={String(totalCals)} tone="success" />
            <StatCard icon={TrendingUp} label="Promedio general" value={promGeneral.toFixed(2)} tone="warning" />
          </div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5">
              <div className="mb-5"><p className="font-display font-bold">Promedio por materia</p><p className="mt-1 text-sm text-muted">Solo se consideran calificaciones disponibles en el resumen.</p></div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                    <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgb(var(--surface-2))' }} contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="promedio" radius={[8, 8, 0, 0]} maxBarSize={56}>
                      {chartData.map((_, i) => <Cell key={i} fill={BARS[i % BARS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          <Card className="p-5">
            <p className="mb-3 font-display font-bold">Detalle por materia</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left text-xs uppercase text-muted">
                  <tr><th className="px-3 py-2.5">Materia</th><th className="px-3 py-2.5">Calificaciones</th><th className="px-3 py-2.5">Promedio</th></tr>
                </thead>
                <tbody>
                  {materias.map((m, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-3 font-semibold">{m.nombre}</td>
                      <td className="px-3 py-3">{m.total_calificaciones}</td>
                      <td className="px-3 py-3"><span className="font-bold text-brand-600">{m.promedio.toFixed(2)}</span></td>
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
