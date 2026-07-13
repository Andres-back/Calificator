import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-500', className)} />;
}

export function LoadingScreen({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner className="h-7 w-7" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('relative overflow-hidden rounded-xl bg-surface-2 shimmer', className)} />;
}
