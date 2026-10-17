/** Local teacher-only declarative graphics. Never evaluates model code or SVG. */
export type Point = { x: number; y: number; etiqueta?: string };
export type StraightLine = { pendiente: number; intercepto: number };
type Base = { id: string; titulo: string; descripcion: string };
export type TableVisual = Base & { tipo: 'tabla'; columnas: string[]; filas: Array<Array<string | number>> };
export type ChartVisual = Base & { tipo: 'grafico'; subtipo: 'barras' | 'linea'; etiquetas: string[]; series: Array<{ nombre: string; valores: number[] }>; unidad?: string };
export type Primitive =
  | { tipo: 'segmento'; x1: number; y1: number; x2: number; y2: number }
  | { tipo: 'circulo'; x: number; y: number; radio: number }
  | { tipo: 'rectangulo'; x: number; y: number; ancho: number; alto: number }
  | { tipo: 'poligono'; puntos: Point[] }
  | { tipo: 'etiqueta'; x: number; y: number; texto: string };
type Bounds = Base & { x: number[]; y: number[] };
export type PlaneVisual = Bounds & { tipo: 'plano'; puntos?: Point[]; lineas?: Point[][]; rectas?: StraightLine[] };
export type FigureVisual = Bounds & { tipo: 'figura'; primitivas: Primitive[] };
export type XaliVisual = TableVisual | ChartVisual | PlaneVisual | FigureVisual;

const MAX_BYTES = 48 * 1024;
const baseKeys = ['id', 'tipo', 'titulo', 'descripcion'];
function assert(condition: unknown): asserts condition { if (!condition) throw new Error('Invalid visual data'); }
function object(value: unknown): Record<string, unknown> {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  assert(Object.keys(value).every((key) => allowed.includes(key)));
}
function text(value: unknown, max = 80, min = 0): asserts value is string {
  assert(typeof value === 'string' && Array.from(value).length >= min && Array.from(value).length <= max);
  assert(!/```|https?:\/\/|<\s*[/!a-zA-Z]/i.test(value));
  assert(!Array.from(value).some((char) => char.codePointAt(0)! < 32 || char.codePointAt(0) === 127));
}
function number(value: unknown): asserts value is number { assert(typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1_000_000); }
function array(value: unknown, max: number, min = 0): unknown[] { assert(Array.isArray(value) && value.length >= min && value.length <= max); return value; }
function point(value: unknown): Point {
  const p = object(value); keys(p, ['x', 'y', 'etiqueta']); number(p.x); number(p.y);
  if (p.etiqueta !== undefined) text(p.etiqueta);
  return p as Point;
}
function bound(value: unknown): number[] {
  const b = array(value, 2, 2); b.forEach(number); assert((b[1] as number) - (b[0] as number) >= 1e-6); return b as number[];
}
function primitive(value: unknown): Primitive {
  const p = object(value);
  switch (p.tipo) {
    case 'segmento': keys(p, ['tipo', 'x1', 'y1', 'x2', 'y2']); [p.x1, p.y1, p.x2, p.y2].forEach(number); break;
    case 'circulo': keys(p, ['tipo', 'x', 'y', 'radio']); [p.x, p.y, p.radio].forEach(number); assert((p.radio as number) > 0); break;
    case 'rectangulo': keys(p, ['tipo', 'x', 'y', 'ancho', 'alto']); [p.x, p.y, p.ancho, p.alto].forEach(number); assert((p.ancho as number) > 0 && (p.alto as number) > 0); break;
    case 'poligono': keys(p, ['tipo', 'puntos']); array(p.puntos, 60, 3).forEach(point); break;
    case 'etiqueta': keys(p, ['tipo', 'x', 'y', 'texto']); [p.x, p.y].forEach(number); text(p.texto); break;
    default: throw new Error('Unsupported primitive');
  }
  return p as Primitive;
}

function visual(value: unknown): XaliVisual {
  const v = object(value);
  text(v.id, 40, 1); assert(/^[a-zA-Z0-9_-]+$/.test(v.id)); text(v.titulo, 100, 1); text(v.descripcion, 500, 1);
  if (v.tipo === 'tabla') {
    keys(v, [...baseKeys, 'columnas', 'filas']);
    const columns = array(v.columnas, 8, 1); columns.forEach((c) => text(c));
    for (const row of array(v.filas, 30)) {
      const cells = array(row, 8); assert(cells.length === columns.length);
      cells.forEach((cell) => typeof cell === 'string' ? text(cell, 200) : number(cell));
    }
  } else if (v.tipo === 'grafico') {
    keys(v, [...baseKeys, 'subtipo', 'etiquetas', 'series', 'unidad']); assert(v.subtipo === 'barras' || v.subtipo === 'linea');
    const labels = array(v.etiquetas, 60, 1); labels.forEach((label) => text(label));
    if (v.unidad !== undefined) text(v.unidad);
    for (const item of array(v.series, 4, 1)) {
      const s = object(item); keys(s, ['nombre', 'valores']); text(s.nombre);
      const values = array(s.valores, 60, 1); values.forEach(number); assert(values.length === labels.length);
    }
  } else if (v.tipo === 'plano' || v.tipo === 'figura') {
    const x = bound(v.x); const y = bound(v.y);
    const inside = (p: Point) => assert(p.x >= x[0] && p.x <= x[1] && p.y >= y[0] && p.y <= y[1]);
    if (v.tipo === 'plano') {
      keys(v, [...baseKeys, 'x', 'y', 'puntos', 'lineas', 'rectas']);
      const points = array(v.puntos ?? [], 60); points.forEach((p) => inside(point(p)));
      const lines = array(v.lineas ?? [], 4); lines.forEach((line) => array(line, 60, 2).forEach((p) => inside(point(p))));
      const straights = array(v.rectas ?? [], 4); straights.forEach((item) => {
        const line = object(item); keys(line, ['pendiente', 'intercepto']); number(line.pendiente); number(line.intercepto);
        const ends = x.map((value) => line.pendiente as number * value + (line.intercepto as number));
        assert(Math.min(...ends) <= y[1] && Math.max(...ends) >= y[0]);
      });
      assert(points.length || lines.length || straights.length);
    } else {
      keys(v, [...baseKeys, 'x', 'y', 'primitivas']);
      for (const item of array(v.primitivas, 40, 1)) {
        const p = primitive(item);
        if (p.tipo === 'segmento') { inside({ x: p.x1, y: p.y1 }); inside({ x: p.x2, y: p.y2 }); }
        else if (p.tipo === 'circulo') { inside({ x: p.x - p.radio, y: p.y - p.radio }); inside({ x: p.x + p.radio, y: p.y + p.radio }); }
        else if (p.tipo === 'rectangulo') { inside({ x: p.x, y: p.y }); inside({ x: p.x + p.ancho, y: p.y + p.alto }); }
        else if (p.tipo === 'poligono') p.puntos.forEach(inside);
        else inside(p);
      }
    }
  } else throw new Error('Unsupported visual');
  return v as XaliVisual;
}

export function parseEnvelope(value: unknown): { visuales: XaliVisual[]; warning: boolean } {
  const result: { visuales: XaliVisual[]; warning: boolean } = { visuales: [], warning: false };
  try {
    assert(new TextEncoder().encode(JSON.stringify(value)).length <= MAX_BYTES);
    const e = object(value); keys(e, ['version', 'visuales']); assert(e.version === 1);
    const ids = new Set<string>();
    for (const item of array(e.visuales, 4)) {
      try { const v = visual(item); assert(!ids.has(v.id)); ids.add(v.id); result.visuales.push(v); }
      catch { result.warning = true; }
    }
  } catch { result.warning = true; }
  return result;
}

export function splitTeacherResponse(content: string) {
  const pattern = /```xcalificator-visual[^\n]*\n[\s\S]*?(?:```|$)/g;
  const blocks = [...content.matchAll(pattern)];
  const text = content.replace(pattern, '').trim();
  const empty = { text, visuales: [] as XaliVisual[], warning: false };
  if (!blocks.length) return empty;
  const block = blocks[0][0];
  if (blocks.length !== 1 || !block.startsWith('```xcalificator-visual-v1\n') || !block.endsWith('```')) return { ...empty, warning: true };
  const body = block.slice(block.indexOf('\n') + 1, -3);
  if (new TextEncoder().encode(body).length > MAX_BYTES) return { ...empty, warning: true };
  try { return { text, ...parseEnvelope(JSON.parse(body)) }; }
  catch { return { ...empty, warning: true }; }
}
