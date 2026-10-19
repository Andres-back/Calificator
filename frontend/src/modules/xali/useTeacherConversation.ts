import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatMessage } from '@/types/api';
import { toApiError } from '@/lib/api';
import { clearHistory, getHistory, sendMessage } from './api';

type State = { scope: string; messages: ChatMessage[]; thinking: boolean; clearing: boolean; failedPrompt: string | null; detail: string; canRetry: boolean; checking: boolean };
const initial = (scope: string): State => ({ scope, messages: [], thinking: false, clearing: false, failedPrompt: null, detail: '', canRetry: false, checking: false });

/** A late success, rejection or finally must never mutate another conversation. */
export function useTeacherConversation(userId: string | undefined, materiaId: string, enabled: boolean) {
  const scope = `${enabled ? 'teacher' : 'inactive'}:${userId ?? ''}:${materiaId || 'general'}`;
  const activeScope = useRef(scope); activeScope.current = scope;
  const pending = useRef<{ scope: string; controller: AbortController } | null>(null);
  const failedBaseline = useRef(new Set<string>());
  const failedBaselineCount = useRef(0);
  const [state, setState] = useState(() => initial(scope));
  const latest = useRef(state); latest.current = state;
  const client = useQueryClient();
  const queryKey = ['xali-history', userId ?? 'anon', materiaId];
  const history = useQuery({
    queryKey,
    queryFn: async ({ signal }) => ({ scope, messages: await getHistory(materiaId || undefined, signal) }),
    enabled: Boolean(userId) && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
  useEffect(() => {
    setState(initial(scope));
    return () => { if (pending.current?.scope === scope) { pending.current.controller.abort(); pending.current = null; } };
  }, [scope]);
  useEffect(() => {
    const data = history.data;
    if (data?.scope === scope && !pending.current) {
      setState((old) => ({ ...(old.scope === scope ? old : initial(scope)), messages: data.messages }));
    }
  }, [history.data, scope]);

  function start() {
    if (!enabled || !userId || pending.current || activeScope.current !== scope) return null;
    const request = { scope, controller: new AbortController() };
    pending.current = request;
    return request;
  }
  function current(request: NonNullable<typeof pending.current>) {
    return activeScope.current === request.scope && pending.current === request && !request.controller.signal.aborted;
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || (latest.current.scope === scope && latest.current.failedPrompt && !latest.current.canRetry)) return;
    const request = start(); if (!request) return;
    failedBaseline.current = new Set(latest.current.scope === scope ? latest.current.messages.map((m) => m.id) : []);
    failedBaselineCount.current = latest.current.scope === scope ? latest.current.messages.length : 0;
    setState((old) => ({ ...(old.scope === scope ? old : initial(scope)), thinking: true, failedPrompt: null, detail: '', canRetry: false,
      messages: [...(old.scope === scope ? old.messages : []), { id: `pending-${crypto.randomUUID()}`, role: 'user', mensaje: message, created_at: new Date().toISOString() }],
    }));
    try {
      const result = await sendMessage(message, materiaId || undefined, request.controller.signal);
      if (!current(request)) return;
      const answer = result.respuesta?.trim();
      if (!answer) throw new Error('Xali no devolvió una respuesta. Consulta el historial antes de reenviar.');
      setState((old) => ({ ...old, messages: [...old.messages, { id: `answer-${crypto.randomUUID()}`, role: 'assistant', mensaje: answer, created_at: new Date().toISOString() }] }));
      // Do not refetch over the optimistic exchange; refresh when the teacher revisits it.
      void client.invalidateQueries({ queryKey, refetchType: 'none' });
    } catch (error) {
      if (!current(request)) return;
      setState((old) => ({ ...old, failedPrompt: message, canRetry: false,
        detail: `${toApiError(error).detail} Revisa el historial antes de enviar de nuevo.`,
      }));
    } finally {
      if (current(request)) { pending.current = null; setState((old) => ({ ...old, thinking: false })); }
    }
  }

  async function reviewHistory() {
    const request = start(); if (!request) return;
    setState((old) => ({ ...old, checking: true }));
    const prompt = latest.current.failedPrompt;
    try {
      const messages = await getHistory(materiaId || undefined, request.controller.signal);
      if (!current(request)) return;
      const recovered = messages.some((message, index) => index >= failedBaselineCount.current && message.role === 'user' && message.mensaje === prompt
        && !failedBaseline.current.has(message.id) && messages[index + 1]?.role === 'assistant' && !failedBaseline.current.has(messages[index + 1].id));
      client.setQueryData(queryKey, { scope, messages });
      setState((old) => ({ ...old, messages, canRetry: !recovered, failedPrompt: recovered ? null : prompt,
        detail: recovered ? '' : 'No encontramos una respuesta guardada para ese mensaje. Puedes enviarlo de nuevo.',
      }));
    } catch {
      if (current(request)) setState((old) => ({ ...old, detail: 'No pudimos consultar el historial. Inténtalo antes de enviar de nuevo.', canRetry: false }));
    } finally {
      if (current(request)) { pending.current = null; setState((old) => ({ ...old, checking: false })); }
    }
  }

  async function reset() {
    const request = start(); if (!request) return false;
    setState((old) => ({ ...old, clearing: true }));
    try {
      await clearHistory(materiaId || undefined, request.controller.signal);
      if (!current(request)) return false;
      client.setQueryData(queryKey, { scope, messages: [] }); setState(initial(scope));
      return true;
    } catch (error) {
      if (current(request)) setState((old) => ({ ...old, detail: toApiError(error).detail }));
      return false;
    } finally {
      if (current(request)) { pending.current = null; setState((old) => ({ ...old, clearing: false })); }
    }
  }

  return { ...(state.scope === scope ? state : initial(scope)), send, reset, reviewHistory, history,
    retry: async () => { if (latest.current.scope === scope && latest.current.canRetry && latest.current.failedPrompt) await send(latest.current.failedPrompt); },
  };
}
