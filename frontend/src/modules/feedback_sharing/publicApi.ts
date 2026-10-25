/** Cliente deliberadamente separado de Axios/JWT: credencial solo en memoria. */
import { openConversation, type ConversationIdentity } from './conversation';
export interface FeedbackQuota { restantes: number; retry_after_seconds: number }
export interface FeedbackAnswer {
  numero: number; titulo: string; respuesta_estudiante: string | null;
  puntos_obtenidos: string | null; puntos_maximos: string | null;
  explicacion: string | null; orientacion_mejora: string | null;
  respuesta_referencia?: string | null;
}
export interface FeedbackResult {
  estudiante: string; evaluacion: string; materia: string; nota: string; nota_maxima: string;
  explicacion: string; retroalimentacion: string; respuestas: FeedbackAnswer[]; claves_liberadas: boolean;
  alcance?: 'summary' | 'detail';
}
export interface PublicFeedback {
  resultado: FeedbackResult; expires_at: string; server_now: string;
  cupo: FeedbackQuota; evidencia_disponible: boolean;
  conversation_scope?: string;
}
export interface FeedbackReply {
  request_id: string; status: 'queued' | 'running' | 'succeeded' | 'failed' | 'closed';
  respuesta: string | null; mensaje: string | null; cupo: FeedbackQuota;
}
export interface FeedbackExchange extends Omit<FeedbackReply, 'cupo'> { pregunta: string; accepted_at: string }
export interface FeedbackHistory { items: FeedbackExchange[]; next_cursor: string | null; cupo: FeedbackQuota }
const unavailable = 'Este enlace no está disponible. Pide a tu profesor que lo revise.';
export class FeedbackAccessError extends Error {
  constructor(public readonly status: number, public readonly retryAfter = 0) {
    super(status === 404 ? unavailable : status === 429
      ? 'Ya usaste tus 5 preguntas. Puedes seguir leyendo tu devolución.'
      : 'No pudimos conectar. Comprueba tu conexión e inténtalo de nuevo.');
    this.name = 'FeedbackAccessError';
  }
}

export function createPublicFeedbackClient(credential: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(credential)) throw new FeedbackAccessError(404);
  let conversation: ConversationIdentity | null = null;
  async function request<T>(suffix: string, body?: object, signal?: AbortSignal, decode?: (response: Response) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    const timeout = window.setTimeout(abort, 12000);
    try {
      const response = await fetch(`/api/public/devolucion${suffix}`, {
        method: body ? 'POST' : 'GET', credentials: 'omit', cache: 'no-store',
        referrerPolicy: 'no-referrer', redirect: 'error', signal: controller.signal,
        headers: { Authorization: `Bearer ${credential}`, Accept: 'application/json', ...(conversation ? { 'X-Feedback-Conversation': conversation.id } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) {
        const seconds = Number(response.headers.get('Retry-After'));
        throw new FeedbackAccessError(response.status, Number.isFinite(seconds) ? Math.max(0, Math.min(600, Math.ceil(seconds))) : 0);
      }
      return decode ? await decode(response) : await response.json() as T;
    } catch (error) {
      if (error instanceof FeedbackAccessError) throw error;
      // No guardar ni reportar el objeto fetch/Error: podría contener credenciales.
      throw new FeedbackAccessError(0);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }
  return {
    read: async (signal?: AbortSignal) => {
      const result = await request<PublicFeedback>('', undefined, signal);
      if (result.conversation_scope !== conversation?.scope) conversation = result.conversation_scope ? openConversation(result.conversation_scope) : null;
      return result;
    },
    continuity: () => conversation,
    history: (cursor?: string, signal?: AbortSignal) => request<FeedbackHistory>(`/conversacion${cursor ? '?cursor=' + encodeURIComponent(cursor) : ''}`, undefined, signal),
    ask: (requestId: string, mensaje: string, signal?: AbortSignal) => request<FeedbackReply>('/preguntas', { request_id: requestId, mensaje }, signal),
    poll: (requestId: string, signal?: AbortSignal) => request<FeedbackReply>(`/preguntas/${encodeURIComponent(requestId)}`, undefined, signal),
    evidence: (page: number, signal?: AbortSignal) => {
      if (!Number.isSafeInteger(page) || page < 1) return Promise.reject(new FeedbackAccessError(404));
      return request(`/evidencia/${page}`, undefined, signal, async response => {
        if (!response.headers.get('Content-Type')?.startsWith('image/png')) throw new FeedbackAccessError(0);
        return { blob: await response.blob(), pages: Math.max(1, Number(response.headers.get('X-Evidence-Pages')) || 1) };
      });
    },
  };
}
export type PublicFeedbackClient = ReturnType<typeof createPublicFeedbackClient>;
