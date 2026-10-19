import type { FigureVisual, PlaneVisual, Point, StraightLine } from './visualContent';

export function projection(v: PlaneVisual | FigureVisual) {
  const scale = Math.min(504 / (v.x[1] - v.x[0]), 324 / (v.y[1] - v.y[0]));
  const left = (600 - (v.x[1] - v.x[0]) * scale) / 2;
  const bottom = (420 - (v.y[1] - v.y[0]) * scale) / 2;
  return { scale, X: (x: number) => left + (x - v.x[0]) * scale, Y: (y: number) => 420 - bottom - (y - v.y[0]) * scale };
}

export function clipLine(v: PlaneVisual, line: StraightLine): Point[] {
  const candidates: Point[] = [
    { x: v.x[0], y: line.pendiente * v.x[0] + line.intercepto },
    { x: v.x[1], y: line.pendiente * v.x[1] + line.intercepto },
  ];
  if (line.pendiente !== 0) for (const y of v.y) candidates.push({ x: (y - line.intercepto) / line.pendiente, y });
  const inside = candidates.filter((p) => p.x >= v.x[0] && p.x <= v.x[1] && p.y >= v.y[0] && p.y <= v.y[1]);
  return inside.filter((p, index) => inside.findIndex((other) => other.x === p.x && other.y === p.y) === index).slice(0, 2);
}

export const formatNumber = (value: number) => Number(value.toPrecision(6)).toLocaleString('es-CO');
