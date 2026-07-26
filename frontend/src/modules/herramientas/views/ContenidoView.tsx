import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { MaterialTipo } from '@/types/api';

interface GeneratedImageContent {
  is_placeholder?: boolean;
  b64_data?: string;
  url?: string;
}

interface ExamQuestionContent {
  numero?: string | number;
  enunciado?: string;
  puntaje?: number;
  opciones: string[];
  respuesta_correcta?: string;
}

interface RubricCriterionContent {
  nombre?: string;
  descripcion?: string;
  peso_porcentaje?: number;
  niveles?: Record<string, string>;
}

interface GuideSectionContent {
  titulo?: string;
  contenido?: string;
  actividades: unknown[];
}

interface WorkshopPointContent {
  numero?: string | number;
  enunciado?: string;
}

interface ReinforcementWeekContent {
  semana?: string | number;
  tema?: string;
  meta_semana?: string;
  actividades: unknown[];
  recursos: unknown[];
}

export interface ToolContent {
  titulo?: string;
  instrucciones?: string;
  preguntas?: ExamQuestionContent[];
  total_puntaje?: number;
  escala?: string[];
  criterios?: RubricCriterionContent[];
  imagen?: GeneratedImageContent;
  personajes: string[];
  parrafos?: string[];
  moraleja?: string;
  preguntas_comprension: unknown[];
  uso_docente: unknown[];
  objetivos: unknown[];
  introduccion?: string;
  secciones?: GuideSectionContent[];
  evaluacion_formativa: unknown[];
  objetivo?: string;
  puntos?: WorkshopPointContent[];
  estudiante?: string;
  objetivo_general?: string;
  semanas?: ReinforcementWeekContent[];
  estrategias_apoyo: unknown[];
  indicadores_mejora: unknown[];
  // ficha
  ejercicios?: { numero: number; tipo: string; enunciado: string; opciones?: string[]; respuesta_esperada?: string; espacio_respuesta?: boolean }[];
  // lectura_comprensiva
  texto?: string;
  // mapa_conceptual
  concepto_principal?: string;
  descripcion?: string;
  nodos?: { id: string; concepto: string; descripcion_breve?: string; nivel: number }[];
  relaciones?: { origen: string; destino: string; etiqueta?: string }[];
  // flashcards
  tarjetas?: { numero: number; anverso: string; reverso: string }[];
}

const item = { hidden: { opacity: 0, y: 10 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05 } }) };

function Section({ title }: { title: string }) {
  return <h4 className="mt-6 mb-2 font-display text-base font-bold text-violet-600 dark:text-violet-300">{title}</h4>;
}
function Block({ i, children, className }: { i: number; children: React.ReactNode; className?: string }) {
  return (
    <motion.div custom={i} variants={item} initial="hidden" animate="show" className={cn('print-avoid-break rounded-lg border border-border bg-surface p-4', className)}>
      {children}
    </motion.div>
  );
}
const bullets = (arr: unknown[]) => <ul className="ml-5 list-disc space-y-1 text-sm">{(arr ?? []).map((x, i) => <li key={i}>{String(x)}</li>)}</ul>;
const stripPrefix = (value: unknown) => String(value ?? '').replace(/^\s*[A-Ha-h]\)\s*/, '');
const imageSrc = (image?: GeneratedImageContent) => {
  if (!image || image.is_placeholder) return null;
  if (image.b64_data) return `data:image/png;base64,${image.b64_data}`;
  return image.url || null;
};

function ImageFrame({ image, alt, className }: { image?: GeneratedImageContent; alt: string; className?: string }) {
  const src = imageSrc(image);
  if (src) {
    return (
      <div className={cn('overflow-hidden rounded-lg border border-border bg-white p-2 shadow-card dark:bg-surface-2', className)}>
        <img src={src} alt={alt} className="mx-auto max-h-[520px] w-full rounded-xl object-contain" />
      </div>
    );
  }
  return (
    <div className={cn('rounded-lg border border-dashed border-border bg-surface-2 p-5 text-sm text-muted', className)}>
      <p className="font-semibold text-fg">Imagen pendiente o de reserva</p>
      <p className="mt-2">La imagen no está disponible por ahora. Puedes revisar el resto del material y volver a intentarlo más tarde.</p>
    </div>
  );
}

/* ───────────────── Examen (con revelar respuestas) ───────────────── */
function ExamenContent({ data }: { data: ToolContent }) {
  const [reveal, setReveal] = useState(false);
  const matchLetter = (q: ExamQuestionContent, j: number) => {
    const rc = String(q.respuesta_correcta ?? '').trim().toUpperCase();
    return rc === String.fromCharCode(65 + j) || stripPrefix(q.opciones?.[j]).toUpperCase() === stripPrefix(rc).toUpperCase();
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        {data.instrucciones && <p className="flex-1 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">{data.instrucciones}</p>}
        <Button size="sm" variant={reveal ? 'secondary' : 'primary'} onClick={() => setReveal((v) => !v)}>
          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {reveal ? 'Ocultar' : 'Ver respuestas'}
        </Button>
      </div>
      {(data.preguntas ?? []).map((q, i) => (
        <Block key={i} i={i}>
          <p className="font-semibold">
            <span className="text-brand-600">{q.numero}.</span> {q.enunciado}
            {q.puntaje != null && <span className="ml-2 text-xs font-bold text-violet-500">[{q.puntaje} pts]</span>}
          </p>
          {(q.opciones ?? []).length > 0 ? (
            <div className="mt-2 space-y-1">
              {q.opciones.map((op: string, j: number) => {
                const ok = reveal && matchLetter(q, j);
                return (
                  <p key={j} className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm', ok && 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300')}>
                    <span className="font-bold text-brand-500">{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : '○'} {String.fromCharCode(65 + j)})</span>
                    {stripPrefix(op)}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 space-y-2">{!reveal ? [0, 1].map((k) => <div key={k} className="h-px bg-border" />) : null}</div>
          )}
          {reveal && (q.opciones ?? []).length === 0 && q.respuesta_correcta && (
            <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><b>Respuesta:</b> {q.respuesta_correcta}</p>
          )}
        </Block>
      ))}
      {data.total_puntaje != null && <p className="text-right font-bold">Total: {data.total_puntaje} puntos</p>}
    </div>
  );
}

/* ───────────────── Rúbrica (con niveles) ───────────────── */
function RubricaContent({ data }: { data: ToolContent }) {
  const escala: string[] = data.escala ?? [];
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
          <tr>
            <th className="p-3 text-left">Criterio</th>
            <th className="p-3 text-left">Peso</th>
            {escala.map((e) => <th key={e} className="p-3 text-left">{e}</th>)}
          </tr>
        </thead>
        <tbody>
          {(data.criterios ?? []).map((c, i) => (
            <tr key={i} className="border-t border-border align-top">
              <td className="p-3"><p className="font-semibold">{c.nombre}</p><p className="mt-0.5 text-xs text-muted">{c.descripcion}</p></td>
              <td className="p-3 font-semibold text-brand-600">{c.peso_porcentaje != null ? `${c.peso_porcentaje}%` : ''}</td>
              {escala.map((e) => <td key={e} className="p-3 text-xs text-muted">{c.niveles?.[e] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CuentoContent({ data }: { data: ToolContent }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
        <ImageFrame image={data.imagen} alt={data.titulo ?? 'Ilustracion del cuento'} />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
          {data.personajes?.length > 0 && <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Personajes: {data.personajes.join(', ')}</p>}
          <div className="mt-3 space-y-4">
            {(data.parrafos ?? []).map((p: string, i: number) => (
              <p key={i} className="text-[15px] leading-7 text-fg">{p}</p>
            ))}
          </div>
        </div>
      </div>
      {data.moraleja && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:bg-amber-500/10"><b>Moraleja:</b> {data.moraleja}</div>}
      {data.preguntas_comprension?.length > 0 && <><Section title="Preguntas de comprension" />{bullets(data.preguntas_comprension)}</>}
    </div>
  );
}

function ParaColorearContent({ data }: { data: ToolContent }) {
  return (
    <div className="space-y-5">
      <ImageFrame image={data.imagen} alt={data.titulo ?? 'Dibujo para colorear'} className="bg-white" />
      {data.instrucciones && <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">{data.instrucciones}</div>}
      {data.uso_docente?.length > 0 && <><Section title="Uso docente" />{bullets(data.uso_docente)}</>}
    </div>
  );
}

function FlashcardsContent({ data }: { data: ToolContent }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [known, setKnown] = useState<Record<number, 'red' | 'yellow' | 'green' | null>>({});
  const tarjetas = data.tarjetas ?? [];
  const mastered = Object.values(known).filter((v) => v === 'green').length;

  const toggle = (i: number) => setFlipped((prev) => ({ ...prev, [i]: !prev[i] }));
  const mark = (i: number, status: 'red' | 'yellow' | 'green') => {
    setKnown((prev) => ({ ...prev, [i]: prev[i] === status ? null : status }));
  };
  const reset = () => {
    setFlipped({});
    setKnown({});
  };

  return (
    <div className="space-y-5">
      {data.instrucciones && <p className="text-sm text-muted">{data.instrucciones}</p>}

      {/* Progress bar */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-4 py-2.5">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted">Progreso de estudio</span>
            <span className="font-bold text-brand-700 dark:text-brand-300">{mastered}/{tarjetas.length} dominadas</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${tarjetas.length > 0 ? (mastered / tarjetas.length) * 100 : 0}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
        {mastered > 0 && (
          <Button size="sm" variant="ghost" onClick={reset}>
            Reiniciar
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tarjetas.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="perspective-1000"
          >
            <div
              className={cn(
                'relative h-44 w-full cursor-pointer transition-transform duration-500',
                '[transform-style:preserve-3d]',
                flipped[i] && '[transform:rotateY(180deg)]',
              )}
              onClick={() => toggle(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(i);
                }
              }}
              aria-label={`Tarjeta ${i + 1}: ${flipped[i] ? 'reverso' : 'anverso'}`}
            >
              {/* Anverso */}
              <div
                className={cn(
                  'absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 p-4 text-center [backface-visibility:hidden]',
                  known[i] === 'green' && 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
                  known[i] === 'yellow' && 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
                  known[i] === 'red' && 'border-rose-300 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10',
                  !known[i] && 'border-border bg-surface',
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Concepto</p>
                <p className="mt-2 font-display text-base font-bold">{card.anverso}</p>
              </div>
              {/* Reverso */}
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 border-brand-300 bg-brand-50 p-4 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-brand-500/30 dark:bg-brand-500/10">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">Definición</p>
                <p className="mt-2 text-sm leading-5 text-fg">{card.reverso}</p>
              </div>
            </div>

            {/* Mark as known buttons */}
            <div className="mt-2 flex items-center justify-center gap-1">
              {(['red', 'yellow', 'green'] as const).map((status) => {
                const colors = {
                  red: { active: 'bg-rose-500 text-white', label: 'No la sé', icon: '😕' },
                  yellow: { active: 'bg-amber-500 text-white', label: 'Dudé', icon: '🤔' },
                  green: { active: 'bg-emerald-500 text-white', label: 'La sé', icon: '😊' },
                }[status];
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); mark(i, status); }}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-all',
                      known[i] === status
                        ? colors.active + ' border-transparent'
                        : 'border-border bg-surface text-muted hover:scale-110',
                    )}
                    title={colors.label}
                    aria-label={colors.label}
                  >
                    {colors.icon}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function ContenidoView({ tipo, data }: { tipo: MaterialTipo; data: ToolContent }) {
  if (tipo === 'examen') return <ExamenContent data={data} />;
  if (tipo === 'rubrica') return <RubricaContent data={data} />;
  if (tipo === 'cuento') return <CuentoContent data={data} />;
  if (tipo === 'para_colorear') return <ParaColorearContent data={data} />;

  if (tipo === 'guia') {
    return (
      <div className="space-y-3">
        {data.objetivos?.length > 0 && <Block i={0}><b className="text-sm">Objetivos</b>{bullets(data.objetivos)}</Block>}
        {data.introduccion && <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">{data.introduccion}</div>}
        {(data.secciones ?? []).map((s, i) => (
          <Block key={i} i={i + 1}>
            <p className="font-display font-bold">{s.titulo}</p>
            <p className="mt-1 text-sm">{s.contenido}</p>
            {s.actividades?.length > 0 && bullets(s.actividades)}
          </Block>
        ))}
        {data.evaluacion_formativa?.length > 0 && <><Section title="Evaluación formativa" />{bullets(data.evaluacion_formativa)}</>}
      </div>
    );
  }

  if (tipo === 'taller') {
    return (
      <div className="space-y-3">
        {data.objetivo && <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">{data.objetivo}</div>}
        {(data.puntos ?? []).map((p, i) => (
          <Block key={i} i={i}>
            <p className="font-semibold"><span className="text-brand-600">{p.numero}.</span> {p.enunciado}</p>
            <div className="mt-3 space-y-3">{[0, 1, 2].map((k) => <div key={k} className="border-b border-dashed border-border" style={{ height: 1 }} />)}</div>
          </Block>
        ))}
      </div>
    );
  }

  if (tipo === 'plan_refuerzo') {
    return (
      <div className="space-y-3">
        {data.estudiante && <p className="text-sm text-muted">Estudiante: <b className="text-fg">{data.estudiante}</b></p>}
        {data.objetivo_general && <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">{data.objetivo_general}</div>}
        {(data.semanas ?? []).map((w, i) => (
          <Block key={i} i={i}>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-gradient text-xs font-bold text-white">{w.semana}</span>
              <p className="font-display font-bold">{w.tema}</p>
            </div>
            {w.meta_semana && <p className="mt-2 text-sm"><b>Meta:</b> {w.meta_semana}</p>}
            {w.actividades?.length > 0 && <><p className="mt-2 text-sm font-semibold">Actividades</p>{bullets(w.actividades)}</>}
            {w.recursos?.length > 0 && <><p className="mt-2 text-sm font-semibold">Recursos</p>{bullets(w.recursos)}</>}
          </Block>
        ))}
        {data.estrategias_apoyo?.length > 0 && <><Section title="Estrategias de apoyo" />{bullets(data.estrategias_apoyo)}</>}
        {data.indicadores_mejora?.length > 0 && <><Section title="Indicadores de mejora" />{bullets(data.indicadores_mejora)}</>}
      </div>
    );
  }

  if (tipo === 'quiz_rapido') return <ExamenContent data={data} />;

  if (tipo === 'ficha') {
    return (
      <div className="space-y-5">
        {data.objetivo && <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">{data.objetivo}</div>}
        {data.instrucciones && <p className="text-sm text-muted">{data.instrucciones}</p>}
        {(data.ejercicios ?? []).map((ex: any, i: number) => (
          <Block key={i} i={i}>
            <div className="flex items-start gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{ex.numero}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{ex.enunciado}</p>
                  <Badge tone="neutral">{ex.tipo}</Badge>
                </div>
                {ex.opciones?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {ex.opciones.map((op: string, j: number) => (
                      <p key={j} className="flex items-center gap-1.5 text-sm text-muted">
                        <span className="font-bold text-brand-500">{String.fromCharCode(65 + j)})</span> {op}
                      </p>
                    ))}
                  </div>
                )}
                {ex.espacio_respuesta && <div className="mt-3 border-b border-dashed border-border" style={{ height: 1 }} />}
              </div>
            </div>
          </Block>
        ))}
      </div>
    );
  }

  if (tipo === 'lectura_comprensiva') {
    return (
      <div className="space-y-5">
        {data.texto && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-500/30 dark:bg-blue-500/10">
            <p className="text-[15px] leading-7 text-fg">{data.texto}</p>
          </div>
        )}
        <Section title="Preguntas de comprensión" />
        {(data.preguntas ?? []).map((q: any, i: number) => (
          <Block key={i} i={i}>
            <div className="flex flex-wrap items-start gap-2">
              <p className="font-semibold">
                <span className="text-brand-600">{q.numero}.</span> {q.enunciado}
              </p>
              {q.tipo && <Badge tone="violet">{q.tipo}</Badge>}
            </div>
            {q.respuesta_esperada && (
              <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <b>Respuesta:</b> {q.respuesta_esperada}
              </p>
            )}
          </Block>
        ))}
      </div>
    );
  }

  if (tipo === 'mapa_conceptual') {
    return (
      <div className="space-y-5">
        {data.concepto_principal && (
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 text-center dark:border-brand-500/30 dark:bg-brand-500/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Concepto principal</p>
            <p className="mt-1 font-display text-lg font-extrabold text-brand-800 dark:text-brand-200">{data.concepto_principal}</p>
            {data.descripcion && <p className="mt-2 text-sm text-muted">{data.descripcion}</p>}
          </div>
        )}
        <Section title="Nodos" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(data.nodos ?? []).map((n: any, i: number) => (
            <div key={n.id ?? i} className="rounded-lg border border-border bg-surface p-3">
              <Badge tone="brand">Nivel {n.nivel}</Badge>
              <p className="mt-2 font-semibold">{n.concepto}</p>
              {n.descripcion_breve && <p className="mt-1 text-xs text-muted">{n.descripcion_breve}</p>}
            </div>
          ))}
        </div>
        {data.relaciones && data.relaciones.length > 0 && (
          <>
            <Section title="Relaciones" />
            <div className="space-y-1">
              {data.relaciones.map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="rounded bg-surface-2 px-2 py-0.5 font-semibold">{r.origen}</span>
                  <span className="text-muted">—{r.etiqueta ? ` [${r.etiqueta}] ` : ' '}&rarr;</span>
                  <span className="rounded bg-surface-2 px-2 py-0.5 font-semibold">{r.destino}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (tipo === 'flashcards') {
    return (
      <FlashcardsContent data={data} />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted">
      Este material se creó correctamente, pero no tiene una vista preparada todavía.
    </div>
  );
}
