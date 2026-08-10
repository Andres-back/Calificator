import { useRef } from 'react';
import { FileText, ScanText, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/cn';

gsap.registerPlugin(useGSAP);

interface Props {
  compact?: boolean;
  className?: string;
}

export function DocumentProcessingAnimation({ compact = false, className }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.to('.processing-document', {
        y: -5,
        rotate: 1.5,
        duration: 1.05,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
      gsap.fromTo(
        '.processing-scan',
        { yPercent: -120, opacity: 0 },
        {
          yPercent: 430,
          opacity: 0.9,
          duration: 1.8,
          ease: 'power1.inOut',
          repeat: -1,
          repeatDelay: 0.25,
        },
      );
      gsap.to('.processing-dot', {
        opacity: 0.25,
        scale: 0.75,
        duration: 0.45,
        ease: 'sine.inOut',
        stagger: { each: 0.18, repeat: -1, yoyo: true },
      });
      gsap.to('.processing-spark', {
        scale: 1.18,
        rotate: 12,
        duration: 0.8,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    });
    return () => media.revert();
  }, { scope: root });

  return (
    <div
      ref={root}
      aria-hidden="true"
      className={cn(
        'relative grid shrink-0 place-items-center',
        compact ? 'h-14 w-14' : 'h-36 w-40',
        className,
      )}
    >
      <div
        className={cn(
          'absolute rounded-full bg-brand-400/15 blur-xl',
          compact ? 'h-12 w-12' : 'h-24 w-28',
        )}
      />
      <div
        className={cn(
          'processing-document relative overflow-hidden rounded-2xl border border-brand-200 bg-white text-brand-700 shadow-lg shadow-brand-500/15 will-change-transform dark:border-brand-500/30 dark:bg-slate-900 dark:text-brand-200',
          compact ? 'h-11 w-9' : 'h-24 w-20',
        )}
      >
        <FileText className={cn('mx-auto mt-3', compact ? 'h-5 w-5' : 'h-9 w-9')} />
        <div className="mx-auto mt-2 h-1 w-3/5 rounded-full bg-brand-200 dark:bg-brand-500/30" />
        {!compact && (
          <>
            <div className="mx-auto mt-2 h-1 w-2/5 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="mx-auto mt-2 h-1 w-3/5 rounded-full bg-slate-200 dark:bg-slate-700" />
          </>
        )}
        <div className="processing-scan absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.9)] will-change-transform" />
      </div>
      <div className={cn('processing-spark absolute text-cyan-500 will-change-transform', compact ? '-right-0 top-0' : 'right-3 top-2')}>
        <Sparkles className={compact ? 'h-4 w-4' : 'h-7 w-7'} />
      </div>
      {!compact && (
        <div className="absolute bottom-1 flex items-center gap-1.5 text-brand-500">
          <ScanText className="h-4 w-4" />
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="processing-dot h-2 w-2 rounded-full bg-current" />
          ))}
        </div>
      )}
    </div>
  );
}