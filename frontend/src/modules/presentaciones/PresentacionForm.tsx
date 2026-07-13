import { useState } from 'react';
import { Baby, BookOpen, GraduationCap, School, Sparkles, FlaskConical, Smile, Leaf, Wallet, Scale, Gem } from 'lucide-react';
import { Field, Input, Select, Textarea } from '@/components/ui';
import { Stepper, Segmented } from '@/modules/herramientas/forms/widgets';
import { FormSection, GenerateButton } from '@/modules/herramientas/forms/base';
import type { Materia } from '@/types/api';
import type { PresentacionCreate } from './api';

type Nivel = 'preescolar' | 'primaria' | 'secundaria' | 'media';
type Tono = 'divulgativo' | 'academico' | 'ludico';
type Densidad = 'baja' | 'media' | 'alta';
type Proveedor = 'economico' | 'mixto' | 'premium';

export function PresentacionForm({
  loading,
  materias,
  onSubmit,
}: {
  loading: boolean;
  materias: Materia[];
  onSubmit: (payload: PresentacionCreate) => void;
}) {
  const [f, setF] = useState({
    titulo: '', materia_id: '', tema: '', grado: '', area: '', instrucciones: '',
    cantidad_slides: 8,
    nivel: 'primaria' as Nivel,
    tono: 'divulgativo' as Tono,
    incluir_imagenes: true,
    densidad_imagenes: 'alta' as Densidad,
    proveedor_imagenes: 'premium' as Proveedor,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.titulo.trim().length > 0 && f.tema.trim().length > 0;

  const submit = () =>
    onSubmit({
      titulo: f.titulo.trim(),
      materia_id: f.materia_id || undefined,
      tema: f.tema.trim(),
      grado: f.grado.trim() || undefined,
      area: f.area.trim() || undefined,
      instrucciones: f.instrucciones.trim() || undefined,
      cantidad_slides: f.cantidad_slides,
      nivel: f.nivel,
      tono: f.tono,
      incluir_imagenes: f.incluir_imagenes,
      densidad_imagenes: f.densidad_imagenes,
      proveedor_imagenes: 'premium',
    });

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <Field label="Título" required>
          <Input value={f.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="El ciclo del agua" required />
        </Field>
        <Field label="Materia">
          <Select value={f.materia_id} onChange={(e) => set('materia_id', e.target.value)}>
            <option value="">Sin materia</option>
            {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Tema" required>
          <Input value={f.tema} onChange={(e) => set('tema', e.target.value)} placeholder="Las fases del ciclo del agua" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Grado"><Input value={f.grado} onChange={(e) => set('grado', e.target.value)} placeholder="4°" /></Field>
          <Field label="Área"><Input value={f.area} onChange={(e) => set('area', e.target.value)} placeholder="Ciencias" /></Field>
        </div>
      </div>

      <FormSection title="Estructura" hint="La IA arma portada, objetivo, conceptos, actividad y cierre.">
        <Stepper value={f.cantidad_slides} onChange={(v) => set('cantidad_slides', v)} min={3} max={20} label="diapositivas" />
      </FormSection>

      <FormSection title="Nivel educativo">
        <Segmented
          value={f.nivel}
          onChange={(v) => set('nivel', v as Nivel)}
          options={[
            { value: 'preescolar', label: 'Preescolar', icon: <Baby className="h-4 w-4" /> },
            { value: 'primaria', label: 'Primaria', icon: <BookOpen className="h-4 w-4" /> },
            { value: 'secundaria', label: 'Secundaria', icon: <School className="h-4 w-4" /> },
            { value: 'media', label: 'Media', icon: <GraduationCap className="h-4 w-4" /> },
          ]}
        />
      </FormSection>

      <FormSection title="Tono">
        <Segmented
          value={f.tono}
          onChange={(v) => set('tono', v as Tono)}
          options={[
            { value: 'divulgativo', label: 'Divulgativo', icon: <Smile className="h-4 w-4" /> },
            { value: 'academico', label: 'Académico', icon: <FlaskConical className="h-4 w-4" /> },
            { value: 'ludico', label: 'Lúdico', icon: <Sparkles className="h-4 w-4" /> },
          ]}
        />
      </FormSection>

      <FormSection title="Imágenes" hint="OpenAI gpt-image low para todas las imagenes de presentaciones.">
        <Segmented
          value={f.incluir_imagenes ? 'si' : 'no'}
          onChange={(v) => set('incluir_imagenes', v === 'si')}
          options={[{ value: 'si', label: 'Con imágenes' }, { value: 'no', label: 'Solo texto' }]}
        />
        {f.incluir_imagenes && (
          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">Densidad</p>
              <Segmented
                value={f.densidad_imagenes}
                onChange={(v) => set('densidad_imagenes', v as Densidad)}
                options={[
                  { value: 'baja', label: 'Baja', icon: <Leaf className="h-4 w-4" /> },
                  { value: 'media', label: 'Media' },
                  { value: 'alta', label: 'Alta' },
                ]}
              />
            </div>
            <div className="hidden">
              <p className="mb-1.5 text-xs font-medium text-muted">Proveedor (costo / calidad)</p>
              <Segmented
                value={f.proveedor_imagenes}
                onChange={(v) => set('proveedor_imagenes', v as Proveedor)}
                options={[
                  { value: 'economico', label: 'Económico', icon: <Wallet className="h-4 w-4" /> },
                  { value: 'mixto', label: 'Mixto', icon: <Scale className="h-4 w-4" /> },
                  { value: 'premium', label: 'Premium', icon: <Gem className="h-4 w-4" /> },
                ]}
              />
            </div>
          </div>
        )}
      </FormSection>

      <Field label="Instrucciones adicionales (opcional)">
        <Textarea value={f.instrucciones} onChange={(e) => set('instrucciones', e.target.value)} placeholder="Incluye una actividad de cierre y ejemplos cotidianos." />
      </Field>

      <GenerateButton loading={loading} disabled={!valid} onClick={submit} />
    </div>
  );
}
