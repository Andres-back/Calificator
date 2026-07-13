import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Send, Sparkles, Trash2, ShieldCheck, BookOpen } from 'lucide-react';
import { Badge, Button, Card, RichContent, Select, QueryError, QueryLoading } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { getHistory, sendMessage, clearHistory, listEvaluacionesEntregadas, sendEvaluationMessage } from './api';
import { XaliAvatar } from './components/XaliAvatar';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import { toApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAuth } from '@/stores/auth';
import type { ChatMessage, XaliEvaluacionEntregada } from '@/types/api';

const TEACHER_SUGGESTIONS = [
  'Organiza una explicación sobre fracciones',
  'Crea una actividad sobre el ciclo del agua',
  'Propón preguntas para evaluar comprensión lectora',
  'Ayúdame a mejorar esta retroalimentación',
  'Propón una rúbrica sencilla',
  'Diseña una explicación paso a paso',
];

const STUDENT_SUGGESTIONS = [
  'Explícame con palabras sencillas',
  'Ayúdame a estudiar',
  '¿Qué debo repasar?',
  'Muéstrame un ejemplo parecido',
  'Explícame mi retroalimentación',
  'Ayúdame a practicar paso a paso',
];

const REVIEW_SUGGESTIONS = [
  '¿En qué me equivoqué?',
  '¿Cómo podía responder mejor?',
  '¿Qué debo repasar?',
  'Explícame mi retroalimentación.',
];

export function XaliPage() {
  const { user } = useAuth();
  const isStudent = user?.rol === 'estudiante';
  const suggestions = isStudent ? STUDENT_SUGGESTIONS : TEACHER_SUGGESTIONS;

  // Tema visual diferenciado por rol (solo estética; la lógica y seguridad no cambian).
  const theme = isStudent
    ? {
        subtitle: 'Tu tutor de aprendizaje con IA.',
        heroTitle: 'Aprende paso a paso',
        heroText: 'Xali te ayuda a estudiar, entender tus errores y ver ejemplos fáciles de seguir.',
        heroBadge: 'Seguro para estudiantes',
        phrase: 'La IA te orienta, pero tu docente valida tu proceso.',
        welcome: 'Puedo ayudarte a estudiar, entender tus errores, ver fórmulas claras y mejorar paso a paso.',
        placeholder: 'Escribe tu duda o pide una explicación…',
        security: 'Xali no resuelve evaluaciones por ti. Te ayuda a comprender y mejorar.',
      }
    : {
        subtitle: 'Tu copiloto pedagógico con IA.',
        heroTitle: 'Diseña mejores experiencias de aprendizaje',
        heroText:
          'Xali te ayuda a planear clases, crear actividades, redactar objetivos y ordenar retroalimentaciones.',
        heroBadge: 'Apoyo docente',
        phrase: 'La IA sugiere. El docente decide.',
        welcome: 'Puedo ayudarte a organizar explicaciones, crear actividades y preparar respuestas fáciles de leer.',
        placeholder: 'Escribe tu idea o pídele a Xali que la desarrolle…',
        security: 'Xali apoya la planeación y retroalimentación. La decisión pedagógica final es del docente.',
      };

  const { data: materias = [] } = useMaterias();
  const [materiaId, setMateriaId] = useState('');
  // Las keys incluyen el usuario: la caché de un rol/cuenta nunca se sirve a otro
  // (el backend ya separa el historial por usuario; esto evita fugas de caché SPA).
  const { data: history, isLoading: loadingHistory, isError: historyError, error: historyQueryError, refetch: refetchHistory } = useQuery({
    queryKey: ['xali-history', user?.id ?? 'anon', materiaId],
    queryFn: () => getHistory(materiaId || undefined),
    enabled: !!user?.id,
  });
  const { data: entregadas = [], isLoading: loadingEntregadas } = useQuery({
    queryKey: ['xali-evaluaciones-entregadas', user?.id ?? 'anon'],
    queryFn: listEvaluacionesEntregadas,
    enabled: isStudent && !!user?.id,
  });
  const [evaluacionContextualId, setEvaluacionContextualId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const entregadasFiltradas = useMemo(
    () => entregadas.filter((item) => !materiaId || item.materia_id === materiaId),
    [entregadas, materiaId],
  );
  const evaluacionContextual = entregadas.find((item) => item.evaluacion_id === evaluacionContextualId);

  useEffect(() => { if (history) setMessages(history); }, [history]);
  useEffect(() => {
    if (evaluacionContextualId && !entregadasFiltradas.some((item) => item.evaluacion_id === evaluacionContextualId)) {
      setEvaluacionContextualId('');
    }
  }, [entregadasFiltradas, evaluacionContextualId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, thinking]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || thinking) return;
    if (evaluacionContextual && !evaluacionContextual.puede_chatear) {
      toast.error('Primero debes esperar la confirmacion del docente.');
      return;
    }
    setInput('');
    const userMsg: ChatMessage = { id: 'u' + Date.now(), role: 'user', mensaje: msg, created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setThinking(true);
    try {
      const { respuesta } = evaluacionContextual?.puede_chatear
        ? await sendEvaluationMessage(evaluacionContextual.evaluacion_id, msg)
        : await sendMessage(msg, materiaId || undefined);
      setMessages((m) => [...m, { id: 'a' + Date.now(), role: 'assistant', mensaje: respuesta, created_at: new Date().toISOString() }]);
    } catch (e) {
      toast.error(toApiError(e).detail);
      setMessages((m) => [...m, { id: 'e' + Date.now(), role: 'assistant', mensaje: 'No pude responder en este momento. Intenta de nuevo.', created_at: new Date().toISOString() }]);
    } finally {
      setThinking(false);
    }
  };

  const reset = async () => { await clearHistory(materiaId || undefined); setMessages([]); toast.success('Historial borrado'); };
  const contextualBlocked = Boolean(evaluacionContextual && !evaluacionContextual.puede_chatear);
  const inputPlaceholder = contextualBlocked
    ? 'Disponible después de la confirmación docente'
    : evaluacionContextual?.puede_chatear
      ? 'Pregunta sobre tu entrega y retroalimentación…'
      : theme.placeholder;

  const initials = (user?.nombre ?? '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 lg:gap-4">
      <PageHeader
        title="Asistente Xali"
        eyebrow={isStudent ? 'Tutor de aprendizaje' : 'Copiloto docente'}
        subtitle={theme.subtitle}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={materiaId} onChange={(e) => setMateriaId(e.target.value)} className="w-56">
              <option value="">Todas las materias</option>
              {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </Select>
            {messages.length > 0 && <Button variant="outline" size="sm" onClick={reset}><Trash2 className="h-4 w-4" /> Limpiar</Button>}
          </div>
        }
      />

      {historyError && (
        <QueryError
          error={historyQueryError}
          onRetry={() => void refetchHistory()}
          title="No fue posible cargar el historial de Xali"
          description="Puedes reintentar o iniciar una conversación nueva mientras se restablece la conexión."
        />
      )}
      {/* Contexto de ayuda compacto, con tono por rol */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('rounded-lg border border-l-4 bg-surface p-4 shadow-card', isStudent ? 'border-l-sky-500' : 'border-l-brand-500')}
      >
        <div className="flex items-center gap-3">
          <XaliAvatar
            size={isStudent ? 'md' : 'lg'}
            className="rounded-lg bg-surface-2"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-extrabold sm:text-lg">{theme.heroTitle}</h2>
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                <ShieldCheck className="h-3 w-3" /> {theme.heroBadge}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted">{theme.heroText}</p>
            <p className="mt-1 text-[11px] font-medium text-brand-600 dark:text-brand-300">{theme.phrase}</p>
          </div>
        </div>
      </motion.div>

      {isStudent && (
        <Card className="p-3.5 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="brand"><ShieldCheck className="h-3 w-3" /> Revisión segura</Badge>
                <Badge tone="neutral">Post-entrega</Badge>
              </div>
              <h2 className="font-display text-lg font-bold">Revisar una evaluación entregada</h2>
              <p className="mt-1 text-sm text-muted">
                Disponible solo cuando tu docente ya revisó o ajustó la nota. Xali te ayuda a entender tus errores y mejorar.
              </p>
            </div>
            <div className="w-full space-y-2 lg:w-80">
              <Select
                value={evaluacionContextualId}
                onChange={(e) => {
                  setEvaluacionContextualId(e.target.value);
                  setMessages([]);
                }}
                disabled={loadingEntregadas || entregadasFiltradas.length === 0}
              >
                <option value="">{loadingEntregadas ? 'Cargando entregas…' : 'Chat general de Xali'}</option>
                {entregadasFiltradas.map((item: XaliEvaluacionEntregada) => (
                  <option key={item.entrega_id} value={item.evaluacion_id}>
                    {item.evaluacion_nombre} — {item.materia_nombre}
                  </option>
                ))}
              </Select>
              {evaluacionContextual && (
                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex items-start gap-3">
                    <XaliAvatar mood={evaluacionContextual.puede_chatear ? 'success' : 'student'} size="md" className="rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{evaluacionContextual.evaluacion_nombre}</p>
                      <p className="truncate text-xs text-muted">{evaluacionContextual.materia_nombre}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone={evaluacionContextual.puede_chatear ? 'success' : 'warning'}>
                      {evaluacionContextual.puede_chatear ? 'Revisión disponible' : 'Pendiente docente'}
                    </Badge>
                    {evaluacionContextual.nota_confirmada != null && (
                      <Badge tone="brand">Nota {Number(evaluacionContextual.nota_confirmada).toFixed(1)}</Badge>
                    )}
                  </div>
                  {evaluacionContextual.puede_chatear && (
                    <p className="mt-2 text-xs text-muted">Puedes preguntarle a Xali qué mejorar y qué repasar.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          {!loadingEntregadas && entregadasFiltradas.length === 0 && (
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-sky-100 bg-sky-50/70 p-3 text-sky-950 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100">
              <XaliAvatar mood="student" size="md" className="rounded-xl bg-white dark:bg-sky-500/15" />
              <div className="min-w-0">
                <p className="text-sm font-bold">Aún no tienes evaluaciones listas para revisar</p>
                <p className="mt-0.5 text-sm text-sky-800/80 dark:text-sky-100/75">
                  Cuando tu docente confirme una nota, podrás revisar tus errores con Xali.
                </p>
              </div>
            </div>
          )}
          {evaluacionContextual && !evaluacionContextual.puede_chatear && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Primero debes esperar la confirmación del docente. Después podré ayudarte a revisar tus errores y explicarte cómo mejorar.</span>
            </div>
          )}
          {evaluacionContextual?.puede_chatear && (
            <div className="mt-4 flex flex-wrap gap-2">
              {REVIEW_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={thinking}
                  className="focus-ring rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-muted transition-colors hover:border-brand-300 hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="flex min-h-[430px] flex-1 flex-col overflow-hidden sm:min-h-[460px]">
        {/* Cabecera del asistente + línea de seguridad */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <XaliAvatar size="sm" mood={isStudent ? 'student' : 'teacher'} className="rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight">Xali</p>
            <p className="truncate text-xs text-muted">{theme.security}</p>
          </div>
          <span className="hidden items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted sm:inline-flex">
            <Sparkles className="h-3 w-3 text-brand-500" /> {isStudent ? 'Tutor' : 'Copiloto'}
          </span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {loadingHistory && messages.length === 0 && !thinking && <QueryLoading label="Cargando historial de Xali…" className="flex min-h-[220px] items-center justify-center" />}
          {messages.length === 0 && !thinking && !loadingHistory && (
            <div className="mx-auto flex min-h-[220px] max-w-3xl flex-col items-center justify-center py-4 text-center sm:min-h-[250px]">
              <XaliAvatar size="lg" mood={isStudent ? 'student' : 'teacher'} animated />
              <h3 className="mt-4 font-display text-xl font-bold">Hola, soy Xali 👋</h3>
              <p className="mt-1 max-w-xl text-sm text-muted">{theme.welcome}</p>
              {isStudent && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> {theme.phrase}
                </p>
              )}
              <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                <BookOpen className="h-3.5 w-3.5" /> {isStudent ? 'Para empezar' : 'Ideas rápidas'}
              </p>
              <div className="mt-2 grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="focus-ring min-h-10 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:border-brand-300 hover:text-fg"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const me = m.role === 'user';
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex items-end gap-2.5', me && 'flex-row-reverse')}>
                  {me ? (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-500 text-xs font-bold text-white shadow-sm">
                      {initials}
                    </span>
                  ) : (
                    <XaliAvatar size="xs" className="rounded-full bg-white ring-border" />
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] px-4 py-2.5 text-sm shadow-sm',
                      me
                        ? 'whitespace-pre-wrap rounded-lg rounded-br-sm bg-brand-600 text-white'
                        : 'rounded-lg rounded-bl-sm border border-border bg-surface text-fg',
                    )}
                  >
                    {me ? m.mensaje : <RichContent content={m.mensaje} variant="chat" />}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {thinking && (
            <div className="flex items-end gap-2.5">
              <XaliAvatar size="xs" mood="thinking" className="rounded-full bg-white ring-border" />
              <div className="flex items-center gap-2 rounded-lg rounded-bl-sm border border-border bg-surface px-4 py-3">
                <span className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-brand-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />)}
                </span>
                <span className="text-xs text-muted">Xali está pensando…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t border-border bg-surface/80 p-3.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={inputPlaceholder}
            disabled={contextualBlocked}
            className="focus-ring min-h-12 flex-1 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none placeholder:text-muted/70 transition focus:border-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <Button type="submit" size="icon" loading={thinking} disabled={!input.trim() || contextualBlocked} title="Enviar" aria-label="Enviar mensaje"><Send className="h-4 w-4" /></Button>
        </form>
      </Card>
    </div>
  );
}
