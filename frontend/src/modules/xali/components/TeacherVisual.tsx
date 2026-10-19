import { lazy, Suspense } from 'react';
import type { FigureVisual, PlaneVisual, Primitive, XaliVisual } from '../visualContent';
import { clipLine, formatNumber, projection } from '../visualGeometry';

const TeacherCharts = lazy(() => import('./TeacherCharts'));

function DataTable({ columns, rows }: { columns: string[]; rows: Array<Array<string | number>> }) {
  return <div className="max-w-full overflow-x-auto rounded-lg border border-border" tabIndex={0} role="region" aria-label="Tabla de datos">
    <table className="w-full border-collapse text-left text-sm"><thead><tr>{columns.map((column, i) => <th key={i} scope="col" className="border-b border-border bg-surface-2 px-3 py-2">{column}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="border-b border-border px-3 py-2">{String(cell)}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
function primitiveDescription(p: Primitive) {
  switch (p.tipo) {
    case 'circulo': return `Círculo: centro (${p.x}, ${p.y}), radio ${p.radio}.`;
    case 'rectangulo': return `Rectángulo desde (${p.x}, ${p.y}): ancho ${p.ancho}, alto ${p.alto}.`;
    case 'segmento': return `Segmento de (${p.x1}, ${p.y1}) a (${p.x2}, ${p.y2}).`;
    case 'poligono': return `Polígono: ${p.puntos.map((q) => `(${q.x}, ${q.y})`).join(', ')}.`;
    case 'etiqueta': return `${p.texto}, en (${p.x}, ${p.y}).`;
  }
}

function Geometry({ visual: v }: { visual: PlaneVisual | FigureVisual }) {
  const { X, Y, scale } = projection(v);
  const pointString = (points: Array<{ x: number; y: number }>) => points.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ');
  return <svg viewBox="0 0 600 420" className="h-auto max-h-[65dvh] w-full rounded-xl border border-border bg-surface" role="img" aria-label={`${v.titulo}: ${v.descripcion}`}>
    <desc>{v.descripcion}</desc>
    {v.tipo === 'plano' && <g fontSize={18} fill="currentColor">
      {Array.from({ length: 5 }, (_, i) => {
        const x = v.x[0] + (v.x[1] - v.x[0]) * i / 4; const y = v.y[0] + (v.y[1] - v.y[0]) * i / 4;
        return <g key={i}>
          <path d={`M${X(x)} ${Y(v.y[0])}V${Y(v.y[1])} M${X(v.x[0])} ${Y(y)}H${X(v.x[1])}`} stroke="currentColor" opacity={0.15} />
          <text x={X(x)} y={Y(v.y[0]) + 27} textAnchor="middle">{formatNumber(x)}</text>
          <text x={X(v.x[0]) - 10} y={Y(y) + 5} textAnchor="end">{formatNumber(y)}</text>
        </g>;
      })}
      {v.y[0] <= 0 && v.y[1] >= 0 && <path d={`M${X(v.x[0])} ${Y(0)}H${X(v.x[1])}`} stroke="currentColor" strokeWidth={2} />}
      {v.x[0] <= 0 && v.x[1] >= 0 && <path d={`M${X(0)} ${Y(v.y[0])}V${Y(v.y[1])}`} stroke="currentColor" strokeWidth={2} />}
      <text x={X(v.x[1])} y={Y(v.y[0]) + 47}>x</text><text x={X(v.x[0]) - 28} y={Y(v.y[1]) - 15}>y</text>
      {(v.rectas ?? []).map((line, i) => <polyline key={`r${i}`} points={pointString(clipLine(v, line))} fill="none" stroke="#0891b2" strokeWidth={3} />)}
      {(v.lineas ?? []).map((line, i) => <polyline key={`l${i}`} points={pointString(line)} fill="none" stroke="#6366f1" strokeWidth={3} />)}
      {(v.puntos ?? []).map((p, i) => <g key={i} data-x={p.x} data-y={p.y}>
        <circle cx={X(p.x)} cy={Y(p.y)} r={6} fill="#6366f1" /><title>{`${p.etiqueta || `P${i + 1}`} (${p.x}, ${p.y})`}</title>
        <text x={X(p.x) + (p.x > (v.x[0] + v.x[1]) / 2 ? -10 : 10)} y={Y(p.y) - 12} textAnchor={p.x > (v.x[0] + v.x[1]) / 2 ? 'end' : 'start'}>{(p.etiqueta || `P${i + 1}`).slice(0, 12)}</text>
      </g>)}
    </g>}
    {v.tipo === 'figura' && v.primitivas.map((p, i) => {
      const common = { stroke: '#6366f1', strokeWidth: 3, fill: 'none' };
      if (p.tipo === 'segmento') return <line key={i} {...common} x1={X(p.x1)} y1={Y(p.y1)} x2={X(p.x2)} y2={Y(p.y2)} />;
      if (p.tipo === 'circulo') return <circle key={i} {...common} cx={X(p.x)} cy={Y(p.y)} r={p.radio * scale} />;
      if (p.tipo === 'rectangulo') return <rect key={i} {...common} x={X(p.x)} y={Y(p.y + p.alto)} width={p.ancho * scale} height={p.alto * scale} />;
      if (p.tipo === 'poligono') return <polygon key={i} {...common} points={pointString(p.puntos)} />;
      return <text key={i} x={X(p.x)} y={Y(p.y)} fontSize={18} fill="currentColor" textAnchor="middle">{p.texto}</text>;
    })}
  </svg>;
}

export default function TeacherVisual({ visual, expanded = false }: { visual: XaliVisual; expanded?: boolean }) {
  if (visual.tipo === 'tabla') return <DataTable columns={visual.columnas} rows={visual.filas} />;
  if (visual.tipo === 'grafico') return <div className="min-w-0 space-y-8">
    <Suspense fallback={<p role="status">Preparando gráfico…</p>}><TeacherCharts visual={visual} /></Suspense>
    <details><summary className="focus-ring min-h-11 cursor-pointer py-3 font-semibold">Ver tabla de datos</summary>
      <DataTable columns={['Dato', ...visual.series.map((s) => s.nombre)]} rows={visual.etiquetas.map((label, i) => [label, ...visual.series.map((s) => s.valores[i])])} />
    </details>
  </div>;
  return <div className="space-y-3">
    {expanded && <p className="text-sm text-muted sm:hidden">Desliza el dibujo de lado a lado para verlo completo. Los valores también están en «Ver datos y medidas».</p>}
    {expanded ? <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Apoyo ampliado, desplaza para ver completo">
      <div className="min-w-[36rem]"><Geometry visual={visual} /></div>
    </div> : <Geometry visual={visual} />}
    <details><summary className="focus-ring min-h-11 cursor-pointer py-3 font-semibold">Ver datos y medidas</summary>
      {visual.tipo === 'plano' ? <>
        <DataTable columns={['Punto', 'x', 'y']} rows={(visual.puntos ?? []).map((p, i) => [p.etiqueta || `P${i + 1}`, p.x, p.y])} />
        <ul>{(visual.lineas ?? []).map((line, i) => <li key={i}>Segmentos: {line.map((p) => `(${p.x}, ${p.y})`).join(' → ')}</li>)}</ul>
        <ul>{(visual.rectas ?? []).map((line, i) => <li key={i}>Recta: y = {line.pendiente}x + ({line.intercepto})</li>)}</ul>
      </> : <ul className="space-y-2 text-sm">{visual.primitivas.map((p, i) => <li key={i}>{primitiveDescription(p)}</li>)}</ul>}
    </details>
  </div>;
}
