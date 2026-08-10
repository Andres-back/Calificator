import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarRange, Download, FileBarChart2, Search } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  QueryError,
  Select,
  Skeleton,
} from '@/components/ui';
import { toApiError } from '@/lib/api';
import { parseLocalDate } from '@/lib/dates';
import { getAsistenciaReporte, type AsistenciaReporte } from './asistenciaApi';
import {
  buildAttendanceReportCsv,
  monthReportRange,
  quarterReportRange,
  validateReportRange,
  type AttendanceReportRange,
} from './attendanceReportModel';

type PeriodType = 'mes' | 'trimestre' | 'rango';

interface ReportProps {
  materiaId: string;
  materiaNombre: string;
  today: string;
}

function readableDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseLocalDate(value));
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className='rounded-lg border border-border bg-surface-2 px-4 py-4'>
      <p className='text-xs font-bold uppercase tracking-wide text-muted'>{label}</p>
      <p className='mt-1 text-2xl font-extrabold tabular-nums'>{value}</p>
      <p className='mt-1 text-xs text-muted'>{detail}</p>
    </div>
  );
}

function StudentReportTable({ report }: { report: AsistenciaReporte }) {
  return (
    <Card className='p-5 sm:p-6'>
      <h3 className='font-display text-lg font-bold'>Resumen por estudiante</h3>
      <p className='mt-1 text-sm text-muted'>
        El porcentaje considera presentes y llegadas tarde sobre el total de registros.
      </p>
      <div className='mt-4 overflow-x-auto' role='region' aria-label='Resumen de asistencia por estudiante' tabIndex={0}>
        <table className='min-w-[850px] w-full text-sm'>
          <caption className='sr-only'>Totales y porcentaje de asistencia de cada estudiante</caption>
          <thead className='bg-surface-2 text-left text-xs uppercase text-muted'>
            <tr>
              <th className='px-3 py-2.5'>Estudiante</th>
              <th className='px-3 py-2.5 text-center'>Registros</th>
              <th className='px-3 py-2.5 text-center'>Presentes</th>
              <th className='px-3 py-2.5 text-center'>Tarde</th>
              <th className='px-3 py-2.5 text-center'>Ausentes</th>
              <th className='px-3 py-2.5 text-center'>Excusas</th>
              <th className='px-3 py-2.5 text-right'>Asistencia</th>
            </tr>
          </thead>
          <tbody>
            {report.estudiantes.map((student) => (
              <tr key={student.estudiante_id} className='border-t border-border'>
                <td className='px-3 py-3'>
                  <p className='font-semibold'>{student.estudiante_nombre}</p>
                  <p className='text-xs text-muted'>{student.estudiante_email}</p>
                </td>
                <td className='px-3 py-3 text-center tabular-nums'>{student.total_registros}</td>
                <td className='px-3 py-3 text-center tabular-nums text-emerald-700 dark:text-emerald-300'>{student.presentes}</td>
                <td className='px-3 py-3 text-center tabular-nums text-amber-700 dark:text-amber-300'>{student.tarde}</td>
                <td className='px-3 py-3 text-center tabular-nums text-rose-700 dark:text-rose-300'>{student.ausentes}</td>
                <td className='px-3 py-3 text-center tabular-nums text-sky-700 dark:text-sky-300'>{student.excusas}</td>
                <td className='px-3 py-3 text-right font-extrabold tabular-nums'>
                  {student.total_registros > 0 ? `${student.porcentaje_asistencia}%` : 'Sin datos'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DayReportTable({ report }: { report: AsistenciaReporte }) {
  return (
    <Card className='p-5 sm:p-6'>
      <h3 className='font-display text-lg font-bold'>Detalle por jornada</h3>
      <p className='mt-1 text-sm text-muted'>Comprueba qué días componen el periodo consultado.</p>
      <div className='mt-4 overflow-x-auto' role='region' aria-label='Detalle de asistencia por jornada' tabIndex={0}>
        <table className='min-w-[700px] w-full text-sm'>
          <caption className='sr-only'>Totales de asistencia de cada jornada guardada</caption>
          <thead className='bg-surface-2 text-left text-xs uppercase text-muted'>
            <tr>
              <th className='px-3 py-2.5'>Fecha</th>
              <th className='px-3 py-2.5 text-center'>Registros</th>
              <th className='px-3 py-2.5 text-center'>Presentes</th>
              <th className='px-3 py-2.5 text-center'>Tarde</th>
              <th className='px-3 py-2.5 text-center'>Ausentes</th>
              <th className='px-3 py-2.5 text-center'>Excusas</th>
              <th className='px-3 py-2.5 text-right'>Asistencia</th>
            </tr>
          </thead>
          <tbody>
            {report.jornadas.map((day) => (
              <tr key={day.fecha} className='border-t border-border'>
                <td className='px-3 py-3 font-semibold capitalize'>{readableDate(day.fecha)}</td>
                <td className='px-3 py-3 text-center tabular-nums'>{day.total_registros}</td>
                <td className='px-3 py-3 text-center tabular-nums'>{day.presentes}</td>
                <td className='px-3 py-3 text-center tabular-nums'>{day.tarde}</td>
                <td className='px-3 py-3 text-center tabular-nums'>{day.ausentes}</td>
                <td className='px-3 py-3 text-center tabular-nums'>{day.excusas}</td>
                <td className='px-3 py-3 text-right font-extrabold tabular-nums'>{day.porcentaje_asistencia}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ReportResults({
  report,
  materiaNombre,
  onDownload,
}: {
  report: AsistenciaReporte;
  materiaNombre: string;
  onDownload: () => void;
}) {
  return (
    <div className='space-y-5' aria-live='polite'>
      <Card className='p-5 sm:p-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-200'>Reporte generado</p>
            <h3 className='mt-1 font-display text-xl font-extrabold'>{materiaNombre}</h3>
            <p className='mt-1 text-sm text-muted'>
              {readableDate(report.fecha_desde)} al {readableDate(report.fecha_hasta)}
            </p>
          </div>
          <Button type='button' variant='outline' onClick={onDownload}>
            <Download className='h-4 w-4' aria-hidden='true' />
            Descargar CSV
          </Button>
        </div>

        <div className='mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <Metric
            label='Jornadas'
            value={report.jornadas_registradas}
            detail='Días con asistencia guardada'
          />
          <Metric
            label='Asistencia'
            value={`${report.resumen.porcentaje_asistencia}%`}
            detail='Presentes y llegadas tarde'
          />
          <Metric
            label='Ausencias'
            value={report.resumen.ausentes}
            detail='Marcas como ausente'
          />
          <Metric
            label='Excusas'
            value={report.resumen.excusas}
            detail={`${report.resumen.total_registros} registros en total`}
          />
        </div>
      </Card>

      <StudentReportTable report={report} />
      <DayReportTable report={report} />
    </div>
  );
}

export function MateriaAsistenciaReporte({
  materiaId,
  materiaNombre,
  today,
}: ReportProps) {
  const currentMonth = today.slice(0, 7);
  const currentYear = Number(today.slice(0, 4));
  const currentQuarter = Math.floor((Number(today.slice(5, 7)) - 1) / 3) + 1;
  const initialRange = useMemo(
    () => monthReportRange(currentMonth, today),
    [currentMonth, today],
  );
  const [periodType, setPeriodType] = useState<PeriodType>('mes');
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState(currentQuarter);
  const [customFrom, setCustomFrom] = useState(initialRange.desde);
  const [customTo, setCustomTo] = useState(initialRange.hasta);
  const [appliedRange, setAppliedRange] = useState<AttendanceReportRange>(initialRange);

  const rangeResolution = useMemo(() => {
    try {
      if (periodType === 'mes') {
        return { range: monthReportRange(month, today), error: null };
      }
      if (periodType === 'trimestre') {
        return { range: quarterReportRange(year, quarter, today), error: null };
      }
      const error = validateReportRange(customFrom, customTo, today);
      return error
        ? { range: null, error }
        : { range: { desde: customFrom, hasta: customTo }, error: null };
    } catch (error) {
      return {
        range: null,
        error: error instanceof Error ? error.message : 'El periodo seleccionado no es válido.',
      };
    }
  }, [customFrom, customTo, month, periodType, quarter, today, year]);

  const reportQuery = useQuery({
    queryKey: ['asistencia-reporte', materiaId, appliedRange.desde, appliedRange.hasta],
    queryFn: () =>
      getAsistenciaReporte(materiaId, appliedRange.desde, appliedRange.hasta),
    enabled: Boolean(materiaId),
  });

  const generateReport = () => {
    if (!rangeResolution.range) return;
    const isSameRange =
      rangeResolution.range.desde === appliedRange.desde &&
      rangeResolution.range.hasta === appliedRange.hasta;
    if (isSameRange) {
      void reportQuery.refetch();
      return;
    }
    setAppliedRange(rangeResolution.range);
  };

  const downloadReport = () => {
    if (!reportQuery.data) return;
    const csv = buildAttendanceReportCsv(reportQuery.data, materiaNombre);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeSubject = materiaNombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'materia';
    anchor.href = url;
    anchor.download =
      `asistencia-${safeSubject}-${reportQuery.data.fecha_desde}-a-${reportQuery.data.fecha_hasta}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte descargado.');
  };

  return (
    <section id='reporte-asistencia' className='scroll-mt-24 space-y-5' aria-labelledby='attendance-report-title'>
      <Card className='p-5 sm:p-6'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div>
            <div className='flex items-center gap-3'>
              <span className='grid h-11 w-11 place-items-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200'>
                <FileBarChart2 className='h-5 w-5' aria-hidden='true' />
              </span>
              <div>
                <p className='text-xs font-bold uppercase tracking-[0.12em] text-muted'>Seguimiento histórico</p>
                <h2 id='attendance-report-title' className='font-display text-2xl font-extrabold'>
                  Reporte de asistencia
                </h2>
              </div>
            </div>
            <p className='mt-3 max-w-2xl text-sm leading-6 text-muted'>
              Consulta esta materia por mes, trimestre o fechas específicas. El reporte
              muestra totales por estudiante y por jornada.
            </p>
          </div>
          <CalendarRange className='hidden h-8 w-8 text-muted lg:block' aria-hidden='true' />
        </div>

        <div className='mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-2 xl:grid-cols-4'>
          <Field label='Tipo de periodo'>
            <Select value={periodType} onChange={(event) => setPeriodType(event.target.value as PeriodType)}>
              <option value='mes'>Mes</option>
              <option value='trimestre'>Trimestre</option>
              <option value='rango'>Rango personalizado</option>
            </Select>
          </Field>

          {periodType === 'mes' && (
            <Field label='Mes del reporte'>
              <Input type='month' value={month} max={currentMonth} onChange={(event) => setMonth(event.target.value)} />
            </Field>
          )}

          {periodType === 'trimestre' && (
            <>
              <Field label='Año'>
                <Input type='number' min={2000} max={currentYear} value={year} onChange={(event) => setYear(Number(event.target.value))} />
              </Field>
              <Field label='Trimestre'>
                <Select value={quarter} onChange={(event) => setQuarter(Number(event.target.value))}>
                  {[1, 2, 3, 4].map((item) => (
                    <option key={item} value={item} disabled={year === currentYear && item > currentQuarter}>
                      Trimestre {item}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}

          {periodType === 'rango' && (
            <>
              <Field label='Desde'>
                <Input type='date' value={customFrom} max={today} onChange={(event) => setCustomFrom(event.target.value)} />
              </Field>
              <Field label='Hasta'>
                <Input type='date' value={customTo} max={today} onChange={(event) => setCustomTo(event.target.value)} />
              </Field>
            </>
          )}

          <div className='flex items-end'>
            <Button type='button' className='w-full' disabled={!rangeResolution.range} loading={reportQuery.isFetching} loadingLabel='Generando…' onClick={generateReport}>
              <Search className='h-4 w-4' aria-hidden='true' />
              Generar reporte
            </Button>
          </div>
        </div>
        {rangeResolution.error && <p className='mt-3 text-sm font-medium text-error' role='alert'>{rangeResolution.error}</p>}
      </Card>

      {reportQuery.isLoading ? (
        <div className='space-y-3' role='status' aria-label='Generando reporte de asistencia'>
          <Skeleton className='h-28' />
          <Skeleton className='h-72' />
        </div>
      ) : reportQuery.isError ? (
        <QueryError
          error={reportQuery.error}
          title='No fue posible generar el reporte'
          description={toApiError(reportQuery.error).detail}
          onRetry={() => void reportQuery.refetch()}
        />
      ) : reportQuery.data && reportQuery.data.jornadas_registradas === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title='No hay asistencias guardadas en este periodo'
          description='Prueba otro periodo o toma asistencia en una fecha para que aparezca en el reporte.'
        />
      ) : reportQuery.data ? (
        <ReportResults report={reportQuery.data} materiaNombre={materiaNombre} onDownload={downloadReport} />
      ) : null}
    </section>
  );
}
