import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import type { ExistingStudent, RosterRow } from './rosterImportApi';

export function RosterReview({ rows, existing, onChange }: { rows: RosterRow[]; existing: ExistingStudent[]; onChange: (rows: RosterRow[]) => void }) {
  const patch = (index: number, value: Partial<RosterRow>) => onChange(rows.map((row, current) => current === index ? { ...row, ...value } : row));
  const normalizeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim().replace(/\s+/g, ' ');
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted">Corrige los nombres. Las cuentas se crearán únicamente al confirmar.</p>
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...rows, { id: crypto.randomUUID(), orden: rows.length + 1, nombre_detectado: '', nombre_revisado: '', confianza: 1, requiere_revision: false, duplicado_confirmado: false, decision: 'crear', estudiante_existente_id: null, advertencias: [] }])}><Plus className="h-4 w-4" /> Añadir</Button>
    </div>
    {rows.map((row, index) => <div key={row.id} className={`rounded-xl border p-3 ${row.requiere_revision ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10' : 'border-border'}`}>
      <div className="flex items-start gap-2">
        <span className="mt-2 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800 dark:bg-brand-500/20 dark:text-brand-100">{index + 1}</span>
        <div className="min-w-0 flex-1 space-y-2">
          <Input aria-label={`Nombre del estudiante ${index + 1}`} value={row.nombre_revisado} onChange={(event) => patch(index, { nombre_revisado: event.target.value, requiere_revision: false, duplicado_confirmado: false, advertencias: [] })} />
          <Select aria-label={`Acción para ${row.nombre_revisado || index + 1}`} value={row.decision} onChange={(event) => patch(index, { decision: event.target.value as RosterRow['decision'], estudiante_existente_id: null, requiere_revision: false })}>
            <option value="crear">Crear cuenta nueva</option><option value="asociar">Usar cuenta existente</option><option value="omitir">No importar</option>
          </Select>
          {row.decision === 'asociar' && <Select aria-label="Cuenta existente" value={row.estudiante_existente_id ?? ''} onChange={(event) => patch(index, { estudiante_existente_id: event.target.value || null, requiere_revision: !event.target.value })}>
            <option value="">Selecciona una cuenta verificada</option>{existing.map((student) => <option key={student.id} value={student.id}>{student.nombre} · {student.materias.join(', ')}</option>)}
          </Select>}
          {row.advertencias.map((warning) => <p key={warning} className="flex gap-1 text-xs font-medium text-amber-800 dark:text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />{warning}</p>)}
          {(row.advertencias.some((warning) => /repetid|existe/i.test(warning)) || row.duplicado_confirmado || (row.decision === 'crear' && rows.filter((candidate) => candidate.decision === 'crear' && normalizeName(candidate.nombre_revisado) === normalizeName(row.nombre_revisado)).length > 1)) && row.decision === 'crear' && <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={row.duplicado_confirmado} onChange={(event) => patch(index, { duplicado_confirmado: event.target.checked, requiere_revision: !event.target.checked })} /><span>Confirmo que es una persona distinta y necesita una cuenta nueva.</span></label>}
        </div>
        <button type="button" aria-label={`Eliminar ${row.nombre_revisado}`} className="focus-ring grid h-10 w-10 place-items-center rounded-lg text-rose-600 hover:bg-rose-50" onClick={() => onChange(rows.filter((_, current) => current !== index))}><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>)}
  </div>;
}
