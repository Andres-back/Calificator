import { Download, FileText } from 'lucide-react';
import { presentacionFileUrl } from './api';

export function PresentationFileLink({
  id,
  format,
}: {
  id: string;
  format: 'pptx' | 'pdf';
}) {
  const isPdf = format === 'pdf';
  const Icon = isPdf ? FileText : Download;

  return (
    <a
      href={presentacionFileUrl(id, format)}
      target={isPdf ? '_blank' : undefined}
      rel={isPdf ? 'noopener noreferrer' : undefined}
      download={isPdf ? undefined : true}
      className="focus-ring inline-flex min-h-10 select-none items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 text-sm font-semibold text-fg transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-slate-400 hover:bg-surface-2 dark:hover:border-slate-500"
      title={isPdf ? 'Abrir el PDF sin cerrar XCalificator' : 'Descargar archivo PPTX'}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {isPdf ? 'Abrir o descargar PDF' : 'Descargar PPTX'}
    </a>
  );
}