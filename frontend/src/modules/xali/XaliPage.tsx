import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Send, Trash2, Bot, ArrowRight, GraduationCap } from 'lucide-react';
import { Button, Card, RichContent, Select, QueryError, QueryLoading } from '@/components/ui';
import { getHistory, sendMessage, clearHistory, listEvaluacionesEntregadas, sendEvaluationMessage } from './api';
import { XaliAvatar } from './components/XaliAvatar';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import { toApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAuth } from '@/stores/auth';
import type { ChatMessage, XaliEvaluacionEntregada } from '@/types/api';

const TEACHER_SUGGESTIONS = [
  { icon: '📋', text: 'Organiza una explicación sobre fracciones' },
  { icon: '💧', text: 'Crea una actividad sobre el ciclo del agua' },
  { icon: '📝', text: 'Propón preguntas para evaluar comprensión lectora' },
  { icon: '✍️', text: 'Ayúdame a mejorar esta retroalimentación' },
  { icon: '📊', text: 'Propón una rúbrica sencilla' },
  { icon: '🪜', text: 'Diseña una explicación paso a paso' },
];

const STUDENT_SUGGESTIONS = [
  { icon: '💡', text: 'Explícame con palabras sencillas' },
  { icon: '📚', text: 'Ayúdame a estudiar' },
  { icon: '🔍', text: '¿Qué debo repasar?' },
  { icon: '👁️', text: 'Muéstrame un ejemplo parecido' },
  { icon: '💬', text: 'Explícame mi retroalimentación' },
  { icon: '🪜', text: 'Ayúdame a practicar paso a paso' },
];

const REVIEW_SUGGESTIONS = [
  { icon: '❌', text: '¿En qué me equivoqué?' },
  { icon: '✅', text: '¿Cómo podía responder mejor?' },
  { icon: '📖', text: '¿Qué debo repasar?' },
  { icon: '💡', text: 'Explícame mi retroalimentación.' },
];

export function XaliPage() {
  const { user } = useAuth();
  const isStudent = user?.rol === 'estudiante';
  const suggestions = isStudent ? STUDENT_SUGGESTIONS : TEACHER_SUGGESTIONS;

  const theme = isStudent
    ? {
        welcome: 'Pregúntame lo que necesites: dudas, repasos, ejemplos, retroalimentación.',
        placeholder: 'Escribe tu duda o pide una explicación…',
        security: 'Xali no resuelve evaluaciones por ti. Te ayuda a comprender.',
      }
    : {
        welcome: 'Puedo ayudarte a organizar explicaciones, crear actividades y preparar respuestas fáciles de leer.',
        placeholder: 'Escribe tu idea o pídele a Xali que la desarrolle…',
        security: 'Xali apoya la planeación y retroalimentación. La decisión pedagógica final es del docente.',
      };

  const { data: materias = [] } = useMaterias();
  const [materiaId, setMateriaId] = useState('');
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

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);
  useEffect(() => {
    if (evaluacionContextualId && !entregadasFiltradas.some((item) => item.evaluacion_id === evaluacionContextualId)) {
      setEvaluacionContextualId('');
    }
  }, [entregadasFiltradas, evaluacionContextualId]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

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

  const reset = async () => {
    await clearHistory(materiaId || undefined);
    setMessages([]);
    toast.success('Historial borrado');
  };
  const contextualBlocked = Boolean(evaluacionContextual && !evaluacionContextual.puede_chatear);
  const inputPlaceholder = contextualBlocked
    ? 'Disponible después de la confirmación docente'
    : evaluacionContextual?.puede_chatear
      ? 'Pregunta sobre tu entrega y retroalimentación…'
      : theme.placeholder;

  const initials = (user?.nombre ?? '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 lg:gap-4">
      {/* Simple header: solo título + filtros compactos */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <XaliAvatar size="sm" mood={isStudent ? 'student' : 'teacher'} />
          <div>
            <h1 className="font-display text-xl font-bold">Xali</h1>
            <p className="text-xs text-muted">{isStudent ? 'Tutor IA' : 'Copiloto IA'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isStudent && entregadasFiltradas.length > 0 && (
            <Select
              value={evaluacionContextualId}
              onChange={(e) => {
                setEvaluacionContextualId(e.target.value);
                setMessages([]);
              }}
              disabled={loadingEntregadas}
              className="w-56"
            >
              <option value="">Chat general</option>
              {entregadasFiltradas.map((item: XaliEvaluacionEntregada) => (
                <option key={item.entrega_id} value={item.evaluacion_id}>
                  {item.evaluacion_nombre}
                </option>
              ))}
            </Select>
          )}
          <Select value={materiaId} onChange={(e) => setMateriaId(e.target.value)} className="w-44">
            <option value="">Todas</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </Select>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Contexto de evaluación activa (compacto, solo cuando tiene sentido) */}
      {isStudent && evaluacionContextual && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm',
            evaluacionContextual.puede_chatear
              ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-500/8'
              : 'border-amber-200 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/8',
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <GraduationCap className="h-4 w-4 shrink-0 text-muted" />
            <span className="truncate font-medium">{evaluacionContextual.evaluacion_nombre}</span>
            {evaluacionContextual.nota_confirmada != null && (
              <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                {Number(evaluacionContextual.nota_confirmada).toFixed(1)}
              </span>
            )}
          </div>
          <span
            className={cn(
              'shrink-0 text-xs font-medium',
              evaluacionContextual.puede_chatear
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400',
            )}
          >
            {evaluacionContextual.puede_chatear ? 'Disponible para revisión' : 'Pendiente docente'}
          </span>
        </div>
      )}

      {historyError && (
        <QueryError
          error={historyQueryError}
          onRetry={() => void refetchHistory()}
          title="No fue posible cargar el historial"
          description="Puedes reintentar o iniciar una conversación nueva."
        />
      )}

      {/* ── Chat ── */}
      <Card className="flex min-h-[480px] flex-1 flex-col overflow-hidden sm:min-h-[540px]">
        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {loadingHistory && messages.length === 0 && !thinking && (
            <QueryLoading label="Cargando historial…" className="flex min-h-[220px] items-center justify-center" />
          )}

          {/* Empty state */}
          {messages.length === 0 && !thinking && !loadingHistory && (
            <div className="mx-auto flex min-h-[280px] max-w-2xl flex-col items-center justify-center py-8 text-center">
              <div className="relative">
                <img
                  src="/branding/xali-hello.png"
                  alt="Xali te saluda"
                  className="h-32 w-32 object-contain"
                />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                  <XaliAvatar size="md" mood={isStudent ? 'student' : 'teacher'} animated />
                </div>
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold">Hola, soy Xali 👋</h3>
              <p className="mt-2 max-w-md text-sm text-muted">{theme.welcome}</p>

              {/* Contextual: chips de sugerencias para revisión */}
              {isStudent && evaluacionContextual?.puede_chatear && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {REVIEW_SUGGESTIONS.map((s) => (
                    <button
                      key={s.text}
                      type="button"
                      onClick={() => send(s.text)}
                      disabled={thinking}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-muted transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                    >
                      <span>{s.icon}</span> {s.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Sugerencias generales */}
              {(!isStudent || !evaluacionContextual) && (
                <>
                  <p className="mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                    <Bot className="h-3.5 w-3.5" /> Sugerencias
                  </p>
                  <div className="mt-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {suggestions.map((s) => (
                      <button
                        key={s.text}
                        onClick={() => send(s.text)}
                        className="focus-ring group flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-muted transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                      >
                        <span className="text-base">{s.icon}</span>
                        <span className="flex-1">{s.text}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Messages */}
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const me = m.role === 'user';
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex items-end gap-2.5', me && 'flex-row-reverse')}
                >
                  {me ? (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-500 text-xs font-bold text-white shadow-sm">
                      {initials}
                    </span>
                  ) : (
                    <XaliAvatar size="xs" mood={isStudent ? 'student' : 'teacher'} />
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                      me
                        ? 'whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-600 text-white'
                        : 'rounded-2xl rounded-bl-md border border-border bg-surface text-fg',
                    )}
                  >
                    {me ? m.mensaje : <RichContent content={m.mensaje} variant="chat" />}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Thinking */}
          {thinking && (
            <div className="flex items-end gap-2.5">
              <XaliAvatar size="xs" mood="thinking" />
              <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3">
                <span className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-2 w-2 rounded-full bg-brand-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </span>
                <span className="text-xs text-muted">Pensando…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-center gap-3 border-t border-border bg-surface/80 p-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={inputPlaceholder}
            disabled={contextualBlocked}
            className="focus-ring min-h-12 flex-1 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none placeholder:text-muted/60 transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-brand-500/20"
          />
          <Button
            type="submit"
            size="icon"
            loading={thinking}
            disabled={!input.trim() || contextualBlocked}
            title="Enviar"
            className="!rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>

      {/* Footer sutil */}
      <p className="text-center text-[11px] text-muted/60">
        {isStudent
          ? 'Xali te orienta. Tu docente valida y decide.'
          : 'La IA sugiere. El docente decide.'}
      </p>
    </div>
  );
}
