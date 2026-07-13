import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/cn';

export type RichContentVariant = 'chat' | 'feedback' | 'evaluation' | 'compact';

export type RichContentProps = {
  content: string;
  variant?: RichContentVariant;
  className?: string;
};

function normalizeTextSegment(segment: string): string {
  return segment
    .replace(/^\s*\*\s+/gm, '- ')
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, expression: string) => `\n\n$$\n${expression.trim()}\n$$\n\n`)
    .replace(/\\\(([^()\n]+)\\\)/g, (_match, expression: string) => `$${expression.trim()}$`)
    .replace(/\n{3,}/g, '\n\n');
}

export function normalizeEducationalMarkdown(content: string): string {
  if (!content) return '';

  const normalizedNewlines = content.replace(/\r\n?/g, '\n');
  const fencedCodePattern = /(```[\s\S]*?```)/g;

  return normalizedNewlines
    .split(fencedCodePattern)
    .map((segment, index) => (index % 2 === 1 ? segment : normalizeTextSegment(segment)))
    .join('')
    .trim();
}

const variantClass: Record<RichContentVariant, string> = {
  chat: 'text-sm leading-relaxed text-inherit',
  feedback: 'text-sm leading-relaxed text-muted',
  evaluation: 'text-sm leading-relaxed text-fg',
  compact: 'text-sm leading-relaxed text-inherit',
};

const spacingClass: Record<RichContentVariant, string> = {
  chat: '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
  feedback: '[&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
  evaluation: '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
  compact: '[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
};

const components: Components = {
  a({ children, href }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-brand-600 underline decoration-brand-400/50 underline-offset-2 hover:text-brand-700 dark:text-brand-300"
      >
        {children}
      </a>
    );
  },
  ul({ children }) {
    return <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>;
  },
  li({ children }) {
    return <li className="pl-1">{children}</li>;
  },
  strong({ children }) {
    return <strong className="font-bold text-fg">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  h1({ children }) {
    return <h1 className="mb-2 mt-3 font-display text-lg font-bold text-fg first:mt-0">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="mb-2 mt-3 font-display text-base font-bold text-fg first:mt-0">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="mb-1.5 mt-3 font-display text-sm font-bold text-fg first:mt-0">{children}</h3>;
  },
  blockquote({ children }) {
    return <blockquote className="my-3 border-l-4 border-brand-300 pl-3 text-muted">{children}</blockquote>;
  },
  code({ children, className }) {
    const isBlock = Boolean(className);
    if (!isBlock) {
      return (
        <code className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] text-fg">
          {children}
        </code>
      );
    }

    return <code className={cn('font-mono text-xs leading-relaxed text-fg', className)}>{children}</code>;
  },
  pre({ children }) {
    return (
      <pre className="my-3 max-w-full overflow-x-auto rounded-xl border border-border bg-surface-2 p-3">
        {children}
      </pre>
    );
  },
  table({ children }) {
    return (
      <div className="my-3 max-w-full overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full border-collapse text-left text-sm">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return <th className="border-b border-border bg-surface-2 px-3 py-2 font-semibold text-fg">{children}</th>;
  },
  td({ children }) {
    return <td className="border-t border-border px-3 py-2 align-top">{children}</td>;
  },
  hr() {
    return <hr className="my-4 border-border" />;
  },
};

export function RichContent({ content, variant = 'chat', className }: RichContentProps) {
  const normalized = normalizeEducationalMarkdown(content);

  if (!normalized) return null;

  return (
    <div
      className={cn(
        'rich-content min-w-0 max-w-full overflow-hidden break-words',
        '[&_.katex-display]:my-3 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:pb-1',
        '[&_.katex]:max-w-full',
        variantClass[variant],
        spacingClass[variant],
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
