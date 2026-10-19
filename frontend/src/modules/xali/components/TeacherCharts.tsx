import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { ChartVisual } from '../visualContent';

const colors = ['#6366f1', '#0891b2', '#d97706', '#db2777'];
export default function TeacherCharts({ visual }: { visual: ChartVisual }) {
  const data = visual.etiquetas.map((label, index) => Object.fromEntries([
    ['label', label], ...visual.series.map((series, i) => [`serie${i}`, series.valores[index]]),
  ]));
  const axes = <><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="label" tickFormatter={(label: string) => label.length > 12 ? `${label.slice(0, 12)}…` : label} /><YAxis width={60} /><Legend /></>;
  return <div className="h-80 w-full min-w-0 text-fg" role="img" aria-label={`${visual.titulo}: ${visual.descripcion}. Consulta también la tabla de datos.`}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      {visual.subtipo === 'barras'
        ? <BarChart data={data} accessibilityLayer>{axes}{visual.series.map((series, index) => <Bar key={index} dataKey={`serie${index}`} name={series.nombre} fill={colors[index]} isAnimationActive={false} />)}</BarChart>
        : <LineChart data={data} accessibilityLayer>{axes}{visual.series.map((series, index) => <Line key={index} dataKey={`serie${index}`} name={series.nombre} stroke={colors[index]} strokeDasharray={index % 2 ? '6 3' : undefined} strokeWidth={3} isAnimationActive={false} />)}</LineChart>}
    </ResponsiveContainer>
    {visual.unidad && <p className="text-sm text-muted">Unidad: {visual.unidad}</p>}
  </div>;
}
