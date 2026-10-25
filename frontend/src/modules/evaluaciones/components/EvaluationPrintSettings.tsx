import { Button, Field, Input, Select } from '@/components/ui';
import type { EvaluationPrintSettings as Settings } from '@/types/api';
import { defaultPrintSettings } from '../printSettings';

export function EvaluationPrintSettings({ value, onChange, disabled = false }: {
  value: Settings | null | undefined; onChange: (settings: Settings) => void; disabled?: boolean;
}) {
  if (!value) return <div className="space-y-2 text-sm"><p>Se conserva el formato anterior.</p>
    <Button type="button" variant="outline" disabled={disabled} onClick={() => onChange(defaultPrintSettings())}>Personalizar impresión</Button></div>;
  return <fieldset disabled={disabled} className="min-w-0 space-y-3" aria-label="Formato de impresión">
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Distribución"><Select className="min-h-11 text-base" value={value.distribucion}
        onChange={event => onChange({ ...value, distribucion: event.target.value as Settings['distribucion'] })}>
        <option value="compacta">Compacta</option><option value="media">Media</option><option value="amplia">Amplia</option>
      </Select></Field>
      <Field label="Color de impresión"><Select className="min-h-11 text-base" value={value.blanco_negro ? 'bn' : 'color'}
        onChange={event => onChange({ ...value, blanco_negro: event.target.value === 'bn' })}>
        <option value="bn">Blanco y negro</option><option value="color">A color</option>
      </Select></Field>
    </div>
    <details className="rounded-lg border border-border p-2"><summary className="focus-ring min-h-11 cursor-pointer py-2 text-sm font-semibold">Letra y cantidad de hojas</summary>
      <div className="grid gap-3 py-2 sm:grid-cols-2"><Field label="Tamaño de letra"><Select className="min-h-11 text-base" value={value.fuente_pt ?? 'auto'}
        onChange={event => onChange({ ...value, fuente_pt: event.target.value === 'auto' ? null : Number(event.target.value) })}>
        <option value="auto">Según la distribución</option>{[10, 10.5, 11, 12, 14, 16, 18].map(font => <option value={font} key={font}>{font} puntos</option>)}
      </Select></Field><Field label="Meta de hojas (opcional)"><Input className="min-h-11 text-base" type="number" min={1} max={20} step={1} value={value.meta_paginas ?? ''}
        onChange={event => onChange({ ...value, meta_paginas: event.target.value ? Number(event.target.value) : null })} /></Field></div>
      <p className="text-xs leading-5 text-muted">Meta orientativa. El PDF muestra las páginas reales; Word puede variar.</p>
    </details>
  </fieldset>;
}

export function QuestionPrintSettings({ value, questionId, blocks, onChange }: {
  value?: Settings | null; questionId?: string; blocks: { id: string; tipo: string }[];
  onChange: (settings: Settings) => void;
}) {
  if (!value || !questionId) return null;
  return <details className="rounded-lg border border-border p-3"><summary className="focus-ring min-h-11 cursor-pointer py-2 text-sm font-semibold">Espacio y figuras al imprimir</summary>
    <div className="space-y-3 pt-2"><Field label="Renglones para responder"><Select className="min-h-11 text-base" value={value.respuestas[questionId]?.lineas ?? 'auto'}
      onChange={event => { const respuestas = { ...value.respuestas }; const previous = { ...respuestas[questionId] }; if (event.target.value === 'auto') delete previous.lineas;
        else previous.lineas = Number(event.target.value); respuestas[questionId] = previous; onChange({ ...value, respuestas }); }}>
      <option value="auto">Automático</option>{[1, 2, 3, 4, 6, 8, 12].map(lines => <option key={lines} value={lines}>{lines} renglones</option>)}
    </Select></Field>
    <Field label="Espacio para dibujar (opcional)"><Select className="min-h-11 text-base" value={value.respuestas[questionId]?.dibujo_mm ?? 'auto'}
      onChange={event => { const respuestas = { ...value.respuestas }; const previous = { ...respuestas[questionId] };
        if (event.target.value === 'auto') delete previous.dibujo_mm; else previous.dibujo_mm = Number(event.target.value);
        respuestas[questionId] = previous; onChange({ ...value, respuestas }); }}>
      <option value="auto">Sin recuadro adicional</option>{[30, 50, 70, 100].map(mm => <option key={mm} value={mm}>{mm / 10} cm de alto</option>)}
    </Select></Field>
    {blocks.map((block, index) => {
      const layout = value.materiales[block.id] ?? { ancho_porcentaje: 100, disposicion: 'apilada' as const, alineacion: 'centro' as const, convertir_color_confirmado: false };
      const update = (patch: Partial<typeof layout>) => onChange({ ...value, materiales: { ...value.materiales, [block.id]: { ...layout, ...patch } } });
      return <fieldset className="space-y-2 rounded-lg border border-border p-3" key={block.id}><legend className="text-sm font-semibold">Figura {index + 1}</legend>
        <Field label="Posición de la figura"><Select className="min-h-11 text-base" value={layout.disposicion} onChange={event => update({ disposicion: event.target.value as typeof layout.disposicion,
          ...(event.target.value === 'lateral' && layout.ancho_porcentaje > 50 ? { ancho_porcentaje: 25 } : {}) })}>
          <option value="apilada">Debajo de la pregunta</option>{['imagen', 'dibujo'].includes(block.tipo) && <option value="lateral">Al lado de la pregunta</option>}
        </Select></Field>
        <Field label="Tamaño de la figura"><Select className="min-h-11 text-base" value={layout.ancho_porcentaje} onChange={event => update({ ancho_porcentaje: Number(event.target.value) })}>
          {[25, 35, 50, 75, 100].filter(size => layout.disposicion !== 'lateral' || size <= 50).map(size => <option key={size} value={size}>{size}% del ancho</option>)}
        </Select></Field>
        {value.blanco_negro && <label className="flex min-h-11 items-start gap-2 py-2 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={layout.convertir_color_confirmado}
          onChange={event => update({ convertir_color_confirmado: event.target.checked })} />Confirmo que esta figura se entiende igual sin color.</label>}
        <p className="text-xs text-muted">Comprueba que las letras y detalles sigan legibles. El original no cambia.</p>
      </fieldset>;
    })}</div>
  </details>;
}
