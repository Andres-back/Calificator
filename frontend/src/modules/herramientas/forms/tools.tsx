import { useState } from 'react';
import { Feather, BookText, ScrollText, Palette } from 'lucide-react';
import { Field, Input } from '@/components/ui';
import { TagInput, Stepper, Segmented, OptionChips } from './widgets';
import { BaseFields, DBAAlignmentSelector, ExtraInstructions, FormSection, GenerateButton, useBaseForm, type ToolFormProps } from './base';

/* Cada herramienta tiene su propio "menú" de creación especializado. */

export function CrucigramaForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [n, setN] = useState(8);
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Crucigrama del ciclo del agua" />
      <FormSection title="Palabras del crucigrama" hint="La IA elige conceptos clave del tema y la grilla se arma sola.">
        <Stepper value={n} onChange={setN} min={5} max={20} label="palabras" />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid} onClick={() => onSubmit({ ...b.payload(), cantidad_preguntas: n })} />
    </div>
  );
}

export function SopaLetrasForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [words, setWords] = useState<string[]>([]);
  const [size, setSize] = useState(12);
  const enough = words.length >= 5;
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Sopa de letras del agua" />
      <FormSection title="Palabras a buscar" hint="Escribe cada palabra y pulsa Enter. Mínimo 5.">
        <TagInput value={words} onChange={setWords} uppercase placeholder="LUZ, SOMBRA, ESPEJO…" />
        <p className={`mt-2 text-xs ${enough ? 'text-emerald-600' : 'text-muted'}`}>{words.length}/5 palabras mínimas</p>
      </FormSection>
      <FormSection title="Tamaño de la grilla">
        <Stepper value={size} onChange={setSize} min={10} max={20} label="× " />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid || !enough} onClick={() => onSubmit({ ...b.payload(), palabras_clave: words, tamanio_grilla: size })} />
    </div>
  );
}

function PairsForm({ loading, onSubmit, placeholder }: ToolFormProps & { placeholder: string }) {
  const b = useBaseForm();
  const [n, setN] = useState(6);
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder={placeholder} />
      <FormSection title="Cantidad de parejas" hint="La IA genera los pares y baraja la columna derecha.">
        <Stepper value={n} onChange={setN} min={3} max={12} label="pares" />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid} onClick={() => onSubmit({ ...b.payload(), cantidad_pares: n })} />
    </div>
  );
}
export const UnirColumnasForm = (p: ToolFormProps) => <PairsForm {...p} placeholder="Unir columnas: fases del ciclo" />;
export const EmparejarForm = (p: ToolFormProps) => <PairsForm {...p} placeholder="Emparejar estados del agua" />;

const TIPOS_PREGUNTA = [
  { value: 'opcion_multiple', label: 'Opción múltiple' },
  { value: 'abierta', label: 'Abierta' },
  { value: 'verdadero_falso', label: 'Verdadero / Falso' },
  { value: 'completar', label: 'Completar' },
];
export function ExamenForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [n, setN] = useState(10);
  const [tipos, setTipos] = useState<string[]>(['opcion_multiple', 'abierta']);
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Examen corto del ciclo del agua" />
      <DBAAlignmentSelector base={b.base} set={b.set} />
      <FormSection title="Número de preguntas">
        <Stepper value={n} onChange={setN} min={3} max={30} label="preguntas" />
      </FormSection>
      <FormSection title="Tipos de pregunta" hint="Selecciona uno o varios.">
        <OptionChips value={tipos} onChange={setTipos} options={TIPOS_PREGUNTA} />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid || tipos.length === 0 || b.base.dba_ids.length + b.base.dba_personalizado_ids.length === 0} onClick={() => onSubmit({ ...b.payload(), cantidad_preguntas: n, tipos_pregunta: tipos })} />
    </div>
  );
}

export function GuiaForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [n, setN] = useState(5);
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Guía sobre la propagación de la luz" />
      <DBAAlignmentSelector base={b.base} set={b.set} />
      <FormSection title="Objetivos de aprendizaje" hint="Opcional. Escribe cada objetivo y pulsa Enter.">
        <TagInput value={objetivos} onChange={setObjetivos} placeholder="Reconocer materiales opacos…" />
      </FormSection>
      <FormSection title="Cantidad de actividades">
        <Stepper value={n} onChange={setN} min={2} max={15} label="actividades" />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid || b.base.dba_ids.length + b.base.dba_personalizado_ids.length === 0} onClick={() => onSubmit({ ...b.payload(), objetivos, cantidad_actividades: n })} />
    </div>
  );
}

export function TallerForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [n, setN] = useState(5);
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Taller de sombras" />
      <DBAAlignmentSelector base={b.base} set={b.set} />
      <FormSection title="Cantidad de puntos" hint="Cada punto incluye espacio para responder.">
        <Stepper value={n} onChange={setN} min={2} max={15} label="puntos" />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid || b.base.dba_ids.length + b.base.dba_personalizado_ids.length === 0} onClick={() => onSubmit({ ...b.payload(), cantidad_puntos: n })} />
    </div>
  );
}

export function CuentoForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [personajes, setPersonajes] = useState<string[]>([]);
  const [longitud, setLongitud] = useState('corto');
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="El viaje de una gota de agua" />
      <FormSection title="Personajes" hint="Opcional. Si lo dejas vacío, la IA elige.">
        <TagInput value={personajes} onChange={setPersonajes} placeholder="Lina, Tomás, Profe Ana…" />
      </FormSection>
      <FormSection title="Longitud del cuento">
        <Segmented
          value={longitud}
          onChange={setLongitud}
          options={[
            { value: 'corto', label: 'Corto', icon: <Feather className="h-4 w-4" /> },
            { value: 'medio', label: 'Medio', icon: <BookText className="h-4 w-4" /> },
            { value: 'largo', label: 'Largo', icon: <ScrollText className="h-4 w-4" /> },
          ]}
        />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid} onClick={() => onSubmit({ ...b.payload(), personajes, longitud })} />
    </div>
  );
}

export function ParaColorearForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [estilo, setEstilo] = useState('simple');
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Colorea los animales de la granja" />
      <FormSection title="Estilo del dibujo" hint="Simple sirve para preescolar y primeros grados; detallado agrega mas elementos sin perder lineas claras.">
        <Segmented
          value={estilo}
          onChange={setEstilo}
          options={[
            { value: 'simple', label: 'Simple', icon: <Palette className="h-4 w-4" /> },
            { value: 'detallado', label: 'Detallado', icon: <Palette className="h-4 w-4" /> },
          ]}
        />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid} onClick={() => onSubmit({ ...b.payload(), estilo })} />
    </div>
  );
}

export function RubricaForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [criterios, setCriterios] = useState<string[]>([]);
  const [escala, setEscala] = useState<string[]>(['Excelente', 'Bueno', 'Regular', 'Insuficiente']);
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Rúbrica del experimento de luz" />
      <FormSection title="Criterios a evaluar" hint="Opcional. La IA los completa si lo dejas vacío.">
        <TagInput value={criterios} onChange={setCriterios} placeholder="Observación, Explicación…" />
      </FormSection>
      <FormSection title="Escala de valoración">
        <TagInput value={escala} onChange={setEscala} placeholder="Excelente, Bueno…" />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid} onClick={() => onSubmit({ ...b.payload(), criterios, escala })} />
    </div>
  );
}

export function FichaForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [n, setN] = useState(6);
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Ficha: suma y resta de fracciones" />
      <FormSection title="Cantidad de ejercicios" hint="La IA elige tipos variados (completar, opción múltiple, desarrollo).">
        <Stepper value={n} onChange={setN} min={2} max={15} label="ejercicios" />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid} onClick={() => onSubmit({ ...b.payload(), cantidad_ejercicios: n })} />
    </div>
  );
}


export function QuizRapidoForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [n, setN] = useState(8);
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Quiz rápido: el ciclo del agua" />
      <FormSection title="Cantidad de preguntas">
        <Stepper value={n} onChange={setN} min={3} max={20} label="preguntas" />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid} onClick={() => onSubmit({ ...b.payload(), cantidad_preguntas: n })} />
    </div>
  );
}


export function LecturaComprensivaForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [n, setN] = useState(5);
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Lectura: los primeros habitantes" />
      <FormSection title="Cantidad de preguntas" hint="Se incluyen preguntas literales, inferenciales y de vocabulario.">
        <Stepper value={n} onChange={setN} min={2} max={15} label="preguntas" />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid} onClick={() => onSubmit({ ...b.payload(), cantidad_preguntas: n })} />
    </div>
  );
}


export function MapaConceptualForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Mapa conceptual: el sistema solar" />
      <FormSection title="Generación automática" hint="La IA construye la estructura jerárquica de conceptos y relaciones.">
        <p className="text-sm text-muted">Solo necesitas definir el tema arriba. La IA se encarga del resto.</p>
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid} onClick={() => onSubmit({ ...b.payload() })} />
    </div>
  );
}


export function FlashcardsForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [n, setN] = useState(10);
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Flashcards: verbos en inglés" />
      <FormSection title="Cantidad de tarjetas" hint="Cada tarjeta tiene un concepto y su definición.">
        <Stepper value={n} onChange={setN} min={3} max={30} label="tarjetas" />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid} onClick={() => onSubmit({ ...b.payload(), cantidad_tarjetas: n })} />
    </div>
  );
}


export function PlanRefuerzoForm({ loading, onSubmit }: ToolFormProps) {
  const b = useBaseForm();
  const [estudiante, setEstudiante] = useState('');
  const [dificultades, setDificultades] = useState<string[]>([]);
  return (
    <div className="space-y-5">
      <BaseFields base={b.base} set={b.set} tituloPlaceholder="Plan de refuerzo: luz y sombra" />
      <FormSection title="Estudiante">
        <Field label="Nombre del estudiante" required>
          <Input value={estudiante} onChange={(e) => setEstudiante(e.target.value)} placeholder="Juan Gómez" />
        </Field>
      </FormSection>
      <FormSection title="Dificultades detectadas" hint="Opcional. Ayuda a personalizar el plan.">
        <TagInput value={dificultades} onChange={setDificultades} placeholder="Diferencia opaco/translúcido…" />
      </FormSection>
      <ExtraInstructions value={b.base.instrucciones_adicionales} onChange={(v) => b.set('instrucciones_adicionales', v)} />
      <GenerateButton loading={loading} disabled={!b.valid || !estudiante.trim()} onClick={() => onSubmit({ ...b.payload(), nombre_estudiante: estudiante.trim(), dificultades })} />
    </div>
  );
}
