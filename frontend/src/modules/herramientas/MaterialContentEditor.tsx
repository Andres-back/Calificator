import { Plus, Trash2 } from 'lucide-react';
import { Button, Field, Input, Textarea } from '@/components/ui';

const HIDDEN_FIELDS = new Set([
  'titulo', '_xcalificator', '_alineacion', 'grilla', 'grid', 'grid_mascara', 'crucigrama',
  'palabras', 'banco_palabras', 'palabras_sin_ubicar', 'sopa_letras', 'imagen',
  'posiciones', 'pistas_horizontales', 'pistas_verticales', 'columna_izquierda',
  'columna_derecha', 'soluciones',
]);

const LABELS: Record<string, string> = {
  titulo: 'Título', instrucciones: 'Instrucciones', descripcion: 'Descripción',
  introduccion: 'Introducción', objetivo: 'Objetivo', objetivos: 'Objetivos',
  objetivo_general: 'Objetivo general', texto: 'Texto', moraleja: 'Moraleja',
  personajes: 'Personajes', parrafos: 'Párrafos', preguntas: 'Preguntas',
  preguntas_comprension: 'Preguntas de comprensión', ejercicios: 'Ejercicios',
  puntos: 'Puntos del taller', criterios: 'Criterios', escala: 'Escala',
  secciones: 'Secciones', semanas: 'Semanas', tarjetas: 'Tarjetas',
  pares: 'Pares', columna_izquierda: 'Columna izquierda', columna_derecha: 'Columna derecha',
  soluciones: 'Soluciones', banco: 'Palabras del juego', banco_palabras: 'Palabras', enunciado: 'Enunciado',
  respuesta: 'Respuesta', respuesta_correcta: 'Respuesta correcta',
  respuesta_esperada: 'Respuesta esperada', opciones: 'Opciones', contenido: 'Contenido',
  actividades: 'Actividades', nombre: 'Nombre', tema: 'Tema', anverso: 'Frente',
  reverso: 'Reverso', pista: 'Pista', niveles: 'Niveles de desempeño',
  peso_porcentaje: 'Peso (%)', puntaje: 'Puntaje', tipo: 'Tipo', texto_item: 'Texto',
};

const labelFor = (key: string) => LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, (letter: string) => letter.toUpperCase());
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isPrimitive = (value: unknown) => ['string', 'number', 'boolean'].includes(typeof value) || value == null;

function primitiveDefault(value: unknown): unknown {
  if (typeof value === 'number') return 0;
  if (typeof value === 'boolean') return false;
  return '';
}

function objectTemplate(items: Record<string, unknown>[]): Record<string, unknown> {
  const sample = items[0] ?? { enunciado: '', respuesta_esperada: '' };
  return Object.fromEntries(Object.entries(sample).map(([key, value]) => {
    if (key === 'numero') return [key, items.length + 1];
    if (Array.isArray(value)) return [key, []];
    if (isRecord(value)) return [key, Object.fromEntries(Object.keys(value).map((child) => [child, '']))];
    return [key, primitiveDefault(value)];
  }));
}

function PrimitiveInput({ fieldKey, value, onChange }: { fieldKey: string; value: unknown; onChange: (value: unknown) => void }) {
  if (typeof value === 'boolean') {
    return (
      <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 text-sm font-medium">
        <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
        {labelFor(fieldKey)}
      </label>
    );
  }
  if (typeof value === 'number') {
    return <Field label={labelFor(fieldKey)}><Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /></Field>;
  }
  const text = String(value ?? '');
  const multiline = text.length > 90 || ['texto', 'contenido', 'descripcion', 'introduccion', 'instrucciones', 'enunciado'].includes(fieldKey);
  return (
    <Field label={labelFor(fieldKey)}>
      {multiline
        ? <Textarea value={text} onChange={(event) => onChange(event.target.value)} className="min-h-24" />
        : <Input value={text} onChange={(event) => onChange(event.target.value)} />}
    </Field>
  );
}

function PrimitiveList({ fieldKey, values, onChange }: { fieldKey: string; values: unknown[]; onChange: (value: unknown[]) => void }) {
  return (
    <section className="rounded-xl border border-border bg-surface-2/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="font-semibold">{labelFor(fieldKey)}</h4>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...values, ''])}><Plus className="h-4 w-4" /> Añadir</Button>
      </div>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={`${fieldKey}-${index}`} className="flex items-start gap-2">
            <Textarea
              aria-label={`${labelFor(fieldKey)} ${index + 1}`}
              value={String(value ?? '')}
              onChange={(event) => onChange(values.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
              className="min-h-11 flex-1"
            />
            <Button type="button" size="icon" variant="ghost" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Eliminar ${labelFor(fieldKey)} ${index + 1}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {values.length === 0 && <p className="text-sm text-muted">No hay elementos. Pulsa “Añadir”.</p>}
      </div>
    </section>
  );
}

function RecordFields({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Object.entries(value).filter(([key]) => !HIDDEN_FIELDS.has(key)).map(([key, child]) => {
        if (isPrimitive(child)) {
          return <PrimitiveInput key={key} fieldKey={key} value={child} onChange={(next) => onChange({ ...value, [key]: next })} />;
        }
        if (Array.isArray(child) && child.every(isPrimitive)) {
          return <div key={key} className="sm:col-span-2"><PrimitiveList fieldKey={key} values={child} onChange={(next) => onChange({ ...value, [key]: next })} /></div>;
        }
        if (isRecord(child) && Object.values(child).every(isPrimitive)) {
          return (
            <section key={key} className="space-y-3 rounded-lg border border-border p-3 sm:col-span-2">
              <h5 className="text-sm font-semibold">{labelFor(key)}</h5>
              <RecordFields value={child} onChange={(next) => onChange({ ...value, [key]: next })} />
            </section>
          );
        }
        return null;
      })}
    </div>
  );
}

function ObjectList({ fieldKey, values, onChange }: { fieldKey: string; values: Record<string, unknown>[]; onChange: (value: Record<string, unknown>[]) => void }) {
  const renumber = (items: Record<string, unknown>[]) => items.map((item, index) => 'numero' in item ? { ...item, numero: index + 1 } : item);
  return (
    <section className="rounded-xl border border-border bg-surface-2/50 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h4 className="font-semibold">{labelFor(fieldKey)}</h4><p className="text-xs text-muted">Edita, agrega o elimina elementos sin trabajar con código.</p></div>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange(renumber([...values, objectTemplate(values)]))}><Plus className="h-4 w-4" /> Añadir</Button>
      </div>
      <div className="space-y-4">
        {values.map((item, index) => (
          <article key={`${fieldKey}-${index}`} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold">{labelFor(fieldKey)} · {index + 1}</p>
              <Button type="button" size="icon" variant="ghost" onClick={() => onChange(renumber(values.filter((_, itemIndex) => itemIndex !== index)))} aria-label={`Eliminar elemento ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <RecordFields value={item} onChange={(next) => onChange(values.map((entry, itemIndex) => itemIndex === index ? next : entry))} />
          </article>
        ))}
        {values.length === 0 && <p className="text-sm text-muted">No hay elementos. Pulsa “Añadir”.</p>}
      </div>
    </section>
  );
}

export function MaterialContentEditor({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const fields = Object.entries(value).filter(([key]) => !HIDDEN_FIELDS.has(key));
  return (
    <div className="space-y-4">
      {fields.map(([key, fieldValue]) => {
        if (isPrimitive(fieldValue)) return <PrimitiveInput key={key} fieldKey={key} value={fieldValue} onChange={(next) => onChange({ ...value, [key]: next })} />;
        if (Array.isArray(fieldValue) && fieldValue.every(isPrimitive)) return <PrimitiveList key={key} fieldKey={key} values={fieldValue} onChange={(next) => onChange({ ...value, [key]: next })} />;
        if (Array.isArray(fieldValue) && fieldValue.every(isRecord)) return <ObjectList key={key} fieldKey={key} values={fieldValue as Record<string, unknown>[]} onChange={(next) => onChange({ ...value, [key]: next })} />;
        if (isRecord(fieldValue) && Object.values(fieldValue).every(isPrimitive)) return <section key={key} className="rounded-xl border border-border p-4"><h4 className="mb-3 font-semibold">{labelFor(key)}</h4><RecordFields value={fieldValue} onChange={(next) => onChange({ ...value, [key]: next })} /></section>;
        return null;
      })}
      {fields.length === 0 && <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">Este recurso no tiene campos editables simples.</p>}
    </div>
  );
}