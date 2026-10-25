export function normalizeChatMarkdown(text: string) {
  // Protect code and math; never strip arbitrary asterisks from educational text.
  return text.split(/(```[\s\S]*?```|`[^`\n]*`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g)
    .map((part, index) => index % 2 ? part : part.replace(/\*\*([^*\n]+?)\*\*/g, (_match, inner: string) => inner.trim() ? `**${inner.trim()}**` : _match)).join('');
}
