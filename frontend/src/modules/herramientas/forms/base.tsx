import { useState, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Input, Field, Textarea, Button, Select } from '@/components/ui';
import { useMaterias } from '@/modules/materias/MateriaSelect';

export interface ToolFormProps {
  loading: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
}

export interface BaseState {
  titulo: string;
  tema: string;
  grado: string;
  area: string;
  materia_id: string;
  instrucciones_adicionales: string;
}

const EMPTY: BaseState = { titulo: '', tema: '', grado: '', area: '', materia_id: '', instrucciones_adicionales: '' };

export function useBaseForm(initial?: Partial<BaseState>) {
  const [base, setBase] = useState<BaseState>({ ...EMPTY, ...initial });
  const set = <K extends keyof BaseState>(k: K, v: BaseState[K]) => setBase((p) => ({ ...p, [k]: v }));
  const valid = base.titulo.trim().length > 0 && base.tema.trim().length > 0;
  const payload = () => ({
    titulo: base.titulo.trim(),
    tema: base.tema.trim(),
    materia_id: base.materia_id || undefined,
    grado: base.grado.trim() || undefined,
    area: base.area.trim() || undefined,
    instrucciones_adicionales: base.instrucciones_adicionales.trim() || undefined,
  });
  return { base, set, valid, payload };
}

export function BaseFields({ base, set, tituloPlaceholder }: { base: BaseState; set: ReturnType<typeof useBaseForm>['set']; tituloPlaceholder?: string }) {
  const { data: materias = [], isLoading } = useMaterias();
  return (
    <div className="space-y-4">
      <Field label="Título" required>
        <Input value={base.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder={tituloPlaceholder ?? 'Mi material'} required />
      </Field>
      <Field label="Tema" required>
        <Input value={base.tema} onChange={(e) => set('tema', e.target.value)} placeholder="El ciclo del agua" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Grado"><Input value={base.grado} onChange={(e) => set('grado', e.target.value)} placeholder="4°" /></Field>
        <Field label="Área"><Input value={base.area} onChange={(e) => set('area', e.target.value)} placeholder="Ciencias Naturales" /></Field>
      </div>
      <Field label="Materia" hint="Asigna el recurso a una materia para encontrarlo y filtrarlo luego.">
        <Select value={base.materia_id} onChange={(e) => set('materia_id', e.target.value)} disabled={isLoading}>
          <option value="">Sin asignar</option>
          {materias.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}{m.grado ? ` - ${m.grado}` : ''}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

export function ExtraInstructions({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Instrucciones adicionales (opcional)">
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Lenguaje sencillo, alinear con DBA…" />
    </Field>
  );
}

/** Sección visual dentro del formulario. */
export function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
      <p className="font-display font-bold text-sm">{title}</p>
      {hint && <p className="mb-3 mt-0.5 text-xs text-muted">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  );
}

export function GenerateButton({ loading, disabled, onClick }: { loading: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <Button type="button" size="lg" loading={loading} disabled={disabled} onClick={onClick} className="w-full">
      <Sparkles className="h-4 w-4" /> Generar con IA
    </Button>
  );
}
