export interface IndividualFeedbackMessage {
  studentName: string;
  evaluationName: string;
  url: string;
}

export interface PrivateFeedbackListItem {
  studentName: string;
  url: string;
  confirmed: boolean;
}

export interface NativeFeedbackShare {
  share?: (data: { text: string }) => Promise<void>;
}

export type FeedbackNativeShareResult =
  | { status: 'completed' | 'cancelled' | 'unsupported' }
  | { status: 'error'; error: unknown };

function singleLine(value: string): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) throw new Error('Falta el nombre para preparar el mensaje.');
  return text;
}

function completeUrl(value: string): string {
  if (!value || /\s/.test(value) || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new Error('El enlace confirmado no es válido.');
  try {
    const parsed = new URL(value);
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || !parsed.hostname) throw new Error('Invalid URL');
  } catch { throw new Error('El enlace confirmado no es válido.'); }
  // Do not canonicalize: the authorized URL, including its fragment, is copied intact.
  return value;
}

export function buildIndividualFeedbackMessage({ studentName, evaluationName, url }: IndividualFeedbackMessage): string {
  return `Hola. Esta es la retroalimentación de ${singleLine(studentName)} en ${singleLine(evaluationName)}: ${completeUrl(url)}`;
}

/** Private teacher material for individual distribution, never a group message. */
export function buildPrivateFeedbackList(items: readonly PrivateFeedbackListItem[]): string {
  return items.filter(item => item.confirmed === true).map(item => `${singleLine(item.studentName)}: ${completeUrl(item.url)}`).join('\n');
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Completion/cancellation describes the native UI only; it never proves delivery. */
export async function shareFeedbackMessage(message: string, native: NativeFeedbackShare): Promise<FeedbackNativeShareResult> {
  try {
    if (typeof native.share !== 'function') return { status: 'unsupported' };
    await native.share({ text: message });
    return { status: 'completed' };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') return { status: 'cancelled' };
    return { status: 'error', error };
  }
}
