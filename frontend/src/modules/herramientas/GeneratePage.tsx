import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  BookOpenText,
  ClipboardCheck,
  FileText,
  Gamepad2,
  LayoutGrid,
  PencilRuler,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  Badge,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
} from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { TeachingCycle } from '@/components/business/TeachingCycle';
import { cn } from '@/lib/cn';
import { TOOL_BY_TIPO } from './meta';
import { FORMS } from './forms';
import { generateMaterial } from './api';
import { toApiError } from '@/lib/api';
import type { MaterialTipo } from '@/types/api';
import { routes } from '@/config/routes';
import {
  filterTools,
  MATERIAL_CREATION_TOOLS,
  TOOL_GOALS,
  type ToolGoal,
} from './toolPickerModel';

const GEN_MESSAGES = [
  'Leyendo el contexto pedagógico',
  'Alineando tema, grado y aprendizajes',
  'Armando la actividad imprimible',
  'Preparando la revisión docente',
  'Casi listo',
];

const GOAL_ICONS = {
  todos: LayoutGrid,
  evaluar: ClipboardCheck,
  practicar: PencilRuler,
  jugar: Gamepad2,
  explicar: BookOpenText,
} satisfies Record<ToolGoal, typeof LayoutGrid>;

function GeneratingOverlay() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () =>
        setMessageIndex(
          (current) => (current + 1) % GEN_MESSAGES.length,
        ),
      1400,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[70] grid place-items-center bg-bg/75 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
        <div className="relative grid place-items-center bg-brand-700 px-8 py-10 text-white">
          <div className="scan-line" />
          <div className="ai-core grid h-24 w-24 place-items-center rounded-full bg-white/15 backdrop-blur">
            <Wand2 className="relative h-10 w-10" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-5 p-6 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="font-display text-lg font-bold"
            >
              {GEN_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
          <div className="space-y-2 text-left">
            {GEN_MESSAGES.slice(0, 4).map((message, index) => (
              <div
                key={message}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 px-3 py-2"
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    index <= messageIndex
                      ? 'bg-emerald-500 shadow-[0_0_0_4px_rgb(16_185_129/0.12)]'
                      : 'bg-muted/30',
                  )}
                />
                <span className="text-sm text-muted">{message}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            Al terminar podrás revisar y ajustar el resultado antes de usarlo
            con tus estudiantes.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function GeneratePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const type = params.get('tipo') as MaterialTipo | null;
  const tool = type ? TOOL_BY_TIPO[type] : null;
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState<ToolGoal>('todos');
  const [search, setSearch] = useState('');
  const [pendingPayload, setPendingPayload] = useState<Record<
    string,
    unknown
  > | null>(null);
  const submittingRef = useRef(false);

  const visibleTools = useMemo(
    () => filterTools(MATERIAL_CREATION_TOOLS, { goal, search }),
    [goal, search],
  );

  if (!tool) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/app/herramientas')}
          className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-secondary hover:bg-surface-2 hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a mis materiales
        </button>

        <PageHeader
          title="Crear material"
          eyebrow="Asistente paso a paso"
          subtitle="Aquí creas recursos de práctica y apoyo. Los exámenes, quices y rúbricas calificables se crean dentro de cada materia."
        />

        <TeachingCycle compact />

        <Card className="p-5">
          <div>
            <h2 className="font-display text-xl font-extrabold">
              1. ¿Qué necesitas hacer en tu clase?
            </h2>
            <p className="mt-1 text-sm text-muted">
              Elige una intención. Puedes cambiarla o ver todos los formatos en
              cualquier momento.
            </p>
          </div>
          <div
            className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
            role="radiogroup"
            aria-label="Objetivo del material"
          >
            {TOOL_GOALS.map((option) => {
              const Icon = GOAL_ICONS[option.id];
              const selected = goal === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    if (option.id === 'evaluar') {
                      navigate(routes.materiasPara('evaluar'));
                      return;
                    }
                    setGoal(option.id);
                  }}
                  className={cn(
                    'focus-ring min-h-24 rounded-xl border-2 p-4 text-left transition-colors',
                    selected
                      ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-100'
                      : 'border-border bg-surface hover:border-brand-300 hover:bg-surface-2',
                  )}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                  <strong className="mt-2 block">{option.label}</strong>
                  <span className="mt-1 block text-xs leading-4 text-muted">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-extrabold">
              2. Elige el formato
            </h2>
            <p className="mt-1 text-sm text-muted">
              Encontramos {visibleTools.length}{' '}
              {visibleTools.length === 1 ? 'opción' : 'opciones'} para ti.
            </p>
          </div>
          <label className="block w-full sm:max-w-xs">
            <span className="text-sm font-bold">Buscar formato</span>
            <span className="relative mt-1.5 block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
                placeholder="Ejemplo: guía o crucigrama"
              />
            </span>
          </label>
        </div>

        {visibleTools.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No encontramos ese formato"
            description="Prueba otra palabra o selecciona “Ver todo”."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTools.map((item, index) => (
              <motion.button
                type="button"
                key={item.tipo}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setParams({ tipo: item.tipo })}
                className="focus-ring group rounded-xl text-left"
                aria-label={`Elegir ${item.label}. ${item.description}`}
              >
                <Card
                  interactive
                  className="flex h-full min-h-44 flex-col p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        'grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                        item.gradient,
                      )}
                    >
                      <item.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge tone="neutral">{item.category}</Badge>
                      {item.interactive ? (
                        <Badge tone="violet">Interactivo</Badge>
                      ) : null}
                    </div>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">
                    {item.label}
                  </h3>
                  <p className="mt-1 flex-1 text-sm leading-5 text-muted">
                    {item.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 dark:text-brand-200">
                    Elegir este formato
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Card>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const FormComponent = FORMS[tool.tipo];
  const busy = loading;

  const requestGeneration = (payload: Record<string, unknown>) => {
    if (submittingRef.current) return;
    setPendingPayload(payload);
  };

  const confirmGeneration = async () => {
    if (!pendingPayload || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const material = await generateMaterial(tool.endpoint, pendingPayload);
      toast.success('Material listo para tu revisión.');
      navigate(`/app/herramientas/${material.id}`);
    } catch (error) {
      toast.error(toApiError(error).detail);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const selectedLearningCount =
    (Array.isArray(pendingPayload?.dba_ids)
      ? pendingPayload.dba_ids.length
      : 0) +
    (Array.isArray(pendingPayload?.dba_personalizado_ids)
      ? pendingPayload.dba_personalizado_ids.length
      : 0);

  return (
    <div className="space-y-6">
      <AnimatePresence>{busy ? <GeneratingOverlay /> : null}</AnimatePresence>

      <button
        type="button"
        onClick={() => setParams({})}
        className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-secondary hover:bg-surface-2 hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Elegir otro formato
      </button>

      <div
        className="grid gap-2 sm:grid-cols-3"
        aria-label="Pasos para crear el material"
      >
        {[
          ['1', 'Contexto de la clase'],
          ['2', 'Aprendizajes esperados'],
          ['3', 'Revisar y generar'],
        ].map(([number, label]) => (
          <div
            key={number}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-surface p-3"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-extrabold text-white">
              {number}
            </span>
            <span className="text-sm font-bold">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-5 sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div
              className={cn(
                'grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                tool.gradient,
              )}
            >
              <tool.icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold">
                Crear {tool.label.toLocaleLowerCase('es')}
              </h1>
              <p className="mt-1 text-sm text-muted">{tool.description}</p>
            </div>
          </div>

          <motion.div
            key={tool.tipo}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <FormComponent
              loading={busy}
              onSubmit={requestGeneration}
            />
          </motion.div>
        </Card>

        <aside className="space-y-4">
          <Card className="border-l-4 border-l-brand-500 p-5">
            <h2 className="font-display text-lg font-bold">
              Qué recibirás
            </h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p className="flex items-start gap-2">
                <Sparkles
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                  aria-hidden="true"
                />
                Un primer borrador alineado con los aprendizajes que elegiste.
              </p>
              {tool.interactive ? (
                <p className="flex items-start gap-2">
                  <Gamepad2
                    className="mt-0.5 h-4 w-4 shrink-0 text-violet-600"
                    aria-hidden="true"
                  />
                  Una versión interactiva para usar en clase.
                </p>
              ) : null}
              <p className="flex items-start gap-2">
                <FileText
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                PDF para estudiantes y versión con respuestas cuando aplique.
              </p>
            </div>
          </Card>

          <Card className="border-amber-200 bg-amber-50/70 p-5 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
            <strong>Recuerda:</strong>
            <p className="mt-1 text-muted">
              La IA prepara un borrador. Tú revisas el contenido y decides si
              está listo para tu grupo.
            </p>
          </Card>

          <Card className="p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
              Cambiar rápidamente
            </p>
            <div className="grid grid-cols-5 gap-2">
              {MATERIAL_CREATION_TOOLS.filter((item) => item.tipo !== tool.tipo)
                .slice(0, 10)
                .map((item) => (
                  <button
                    type="button"
                    key={item.tipo}
                    onClick={() => setParams({ tipo: item.tipo })}
                    title={item.label}
                    aria-label={`Cambiar a ${item.label}`}
                    className={cn(
                      'focus-ring grid min-h-11 min-w-11 aspect-square place-items-center rounded-lg bg-gradient-to-br text-white transition hover:scale-105',
                      item.gradient,
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                ))}
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={pendingPayload != null}
        title={`¿Generar ${tool.label.toLocaleLowerCase('es')}?`}
        description="Revisa este resumen. La generación puede tomar unos segundos y después podrás editar el resultado."
        confirmLabel="Sí, generar material"
        cancelLabel="Volver al formulario"
        loading={loading}
        onClose={() => setPendingPayload(null)}
        onConfirm={() => void confirmGeneration()}
      >
        <dl className="divide-y divide-border rounded-xl border border-border bg-surface-2/50 text-sm">
          <div className="grid gap-1 p-3 sm:grid-cols-[110px_1fr]">
            <dt className="font-bold">Título</dt>
            <dd className="text-muted">
              {String(pendingPayload?.titulo ?? 'Sin título')}
            </dd>
          </div>
          <div className="grid gap-1 p-3 sm:grid-cols-[110px_1fr]">
            <dt className="font-bold">Tema</dt>
            <dd className="text-muted">
              {String(pendingPayload?.tema ?? 'Sin tema')}
            </dd>
          </div>
          <div className="grid gap-1 p-3 sm:grid-cols-[110px_1fr]">
            <dt className="font-bold">Grado</dt>
            <dd className="text-muted">
              {String(pendingPayload?.grado ?? 'No indicado')}
            </dd>
          </div>
          <div className="grid gap-1 p-3 sm:grid-cols-[110px_1fr]">
            <dt className="font-bold">Aprendizajes</dt>
            <dd className="text-muted">
              {selectedLearningCount} seleccionado
              {selectedLearningCount === 1 ? '' : 's'}
            </dd>
          </div>
        </dl>
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          La IA sugerirá el contenido. Antes de usarlo con estudiantes, revisa
          datos, respuestas y lenguaje.
        </div>
      </ConfirmDialog>
    </div>
  );
}
