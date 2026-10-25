/** Only opaque continuity metadata may live here. Never store a link or text. */
const prefix = 'xcalificator:feedback-conversation:v1:';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export interface ConversationIdentity { scope: string; id: string; persistent: boolean }

export function openConversation(scope: string): ConversationIdentity | null {
  if (!/^[a-f0-9]{64}$/.test(scope)) return null;
  const key = prefix + scope;
  try {
    const saved = localStorage.getItem(key);
    if (saved && uuid.test(saved)) return { scope, id: saved, persistent: true };
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return { scope, id, persistent: localStorage.getItem(key) === id };
  } catch {
    return { scope, id: crypto.randomUUID(), persistent: false };
  }
}
