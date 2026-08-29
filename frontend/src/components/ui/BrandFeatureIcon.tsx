import { BookOpen, ClipboardCheck, Presentation, WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';

export type BrandFeatureIconKind = 'materias' | 'recursos' | 'calificar' | 'presentaciones';

const SOURCES: Record<BrandFeatureIconKind, string> = {
  materias: '/branding/icons/materias.webp',
  recursos: '/branding/icons/recursos.webp',
  calificar: '/branding/icons/calificar.webp',
  presentaciones: '/branding/icons/presentaciones.webp',
};

const FALLBACKS = {
  materias: BookOpen,
  recursos: WandSparkles,
  calificar: ClipboardCheck,
  presentaciones: Presentation,
} satisfies Record<BrandFeatureIconKind, typeof BookOpen>;

interface BrandFeatureIconProps {
  kind: BrandFeatureIconKind;
  className?: string;
}

export function BrandFeatureIcon({ kind, className }: BrandFeatureIconProps) {
  const [failed, setFailed] = useState(false);
  const Fallback = FALLBACKS[kind];

  if (failed) {
    return (
      <span
        aria-hidden="true"
        data-brand-icon={kind}
        data-brand-icon-fallback="true"
        className={cn('grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200', className)}
      >
        <Fallback className="h-1/2 w-1/2" />
      </span>
    );
  }

  return (
    <img
      src={SOURCES[kind]}
      alt=""
      aria-hidden="true"
      data-brand-icon={kind}
      className={cn('h-12 w-12 object-contain drop-shadow-sm', className)}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
