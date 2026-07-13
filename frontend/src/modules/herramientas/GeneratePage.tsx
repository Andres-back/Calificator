import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Sparkles, Wand2, Gamepad2, FileText, BookOpenCheck, ClipboardCheck, FileDown, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { TeachingCycle } from '@/components/business/TeachingCycle';
import { cn } from '@/lib/cn';
import { TOOLS, TOOL_BY_TIPO } from './meta';
import { FORMS } from './forms';
import { generateMaterial } from './api';
import { toApiError } from '@/lib/api';
import type { MaterialTipo } from '@/types/api';

const GEN_MESSAGES = ['Leyendo contexto pedagógico', 'Alineando tema, grado y DBA', 'Armando actividad imprimible', 'Preparando revisión docente', 'Casi listo'];

const qualityChecks = [
  { icon: BookOpenCheck, label: 'DBA y grado', detail: 'Usa el contexto curricular disponible.' },
  { icon: ClipboardCheck, label: 'Revisión docente', detail: 'Nada se publica sin confirmación.' },
  { icon: FileDown, label: 'Salida flexible', detail: 'Diseñado para PDF, aula y seguimiento.' },
  { icon: ShieldCheck, label: 'IA responsable', detail: 'La respuesta se puede editar y corregir.' },
];

function GeneratingOverlay() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % GEN_MESSAGES.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-bg/75 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
        <div className="relative grid place-items-center bg-brand-700 px-8 py-10 text-white">
          <div className="scan-line" />
          <div className="ai-core grid h-24 w-24 place-items-center rounded-full bg-white/15 backdrop-blur">
            <Wand2 className="relative h-10 w-10" />
          </div>
        </div>
        <div className="space-y-5 p-6 text-center">
        <AnimatePresence mode="wait">
          <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="font-display text-lg font-bold">
            {GEN_MESSAGES[i]}
          </motion.p>
        </AnimatePresence>
          <div className="space-y-2 text-left">
            {GEN_MESSAGES.slice(0, 4).map((message, index) => (
              <div key={message} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 px-3 py-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', index <= i ? 'bg-emerald-500 shadow-[0_0_0_4px_rgb(16_185_129/0.12)]' : 'bg-muted/30')} />
                <span className="text-sm text-muted">{message}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">Puedes revisar y ajustar el resultado antes de asignarlo o descargarlo.</p>
        </div>
      </div>
    </motion.div>
  );
}

export function GeneratePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const tipo = params.get('tipo') as MaterialTipo | null;
  const tool = tipo ? TOOL_BY_TIPO[tipo] : null;
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  // Picker de herramienta
  if (!tool) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/app/herramientas')} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <PageHeader title="Crear material" eyebrow="Recursos didácticos" subtitle="Elige un formato y completa únicamente el contexto que necesita tu clase." />
        <TeachingCycle compact />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {TOOLS.map((t, idx) => (
            <motion.button key={t.tipo} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} onClick={() => setParams({ tipo: t.tipo })} className="group text-left">
              <Card interactive className="h-full p-5">
                <div className={cn('mb-3 grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm', t.gradient)}>
                  <t.icon className="h-6 w-6" />
                </div>
                <p className="font-semibold">{t.label}</p>
                <p className="mt-0.5 text-xs text-muted line-clamp-2">{t.description}</p>
              </Card>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  const FormComponent = FORMS[tool.tipo];
  const busy = loading || submittingRef.current;

  const onSubmit = async (payload: Record<string, unknown>) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const material = await generateMaterial(tool.endpoint, payload);
      toast.success('¡Material generado!');
      navigate(`/app/herramientas/${material.id}`);
    } catch (err) {
      toast.error(toApiError(err).detail);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>{busy && <GeneratingOverlay />}</AnimatePresence>

      <button onClick={() => setParams({})} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Cambiar herramienta
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className={cn('grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm', tool.gradient)}>
              <tool.icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold">{tool.label}</h1>
              <p className="text-sm text-muted">{tool.description}</p>
            </div>
          </div>

          <motion.div key={tool.tipo} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
            <FormComponent loading={busy} onSubmit={onSubmit} />
          </motion.div>
        </Card>

        <aside className="space-y-4">
          <Card className="border-l-4 border-l-brand-500 p-5">
            <div className="flex items-start gap-3">
              <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white', tool.gradient)}><tool.icon className="h-5 w-5" /></div>
              <div><p className="font-display text-lg font-bold">{tool.label}</p><p className="mt-1 text-sm text-muted">{tool.description}</p></div>
            </div>
            <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm text-muted">
              <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-500" /> Generado con IA</p>
              {tool.interactive && <p className="flex items-center gap-2"><Gamepad2 className="h-4 w-4 text-violet-500" /> Versión interactiva jugable</p>}
              <p className="flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-500" /> PDF estudiante + respuestas</p>
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-muted">Control pedagógico</p>
            <div className="space-y-3">
              {qualityChecks.map((item) => (
                <div key={item.label} className="flex gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-brand-600 dark:text-brand-300">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs leading-snug text-muted">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Cambiar a otra herramienta */}
          <Card className="p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-muted">Otras herramientas</p>
            <div className="grid grid-cols-5 gap-2">
              {TOOLS.filter((t) => t.tipo !== tool.tipo).slice(0, 10).map((t) => (
                <button key={t.tipo} onClick={() => setParams({ tipo: t.tipo })} title={t.label} className={cn('grid aspect-square place-items-center rounded-lg bg-gradient-to-br text-white transition hover:scale-110', t.gradient)}>
                  <t.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
