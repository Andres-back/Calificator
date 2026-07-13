import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { Confetti } from '@/components/ui/Confetti';
import { cn } from '@/lib/cn';
import type { MatchingContenido } from '@/types/api';

const CABLES = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#84CC16', '#F97316', '#14B8A6'];

export function MatchingView({ data }: { data: MatchingContenido }) {
  const left = data.columna_izquierda ?? [];
  const right = data.columna_derecha ?? [];
  const solution: Record<number, string> = Object.fromEntries((data.soluciones ?? []).map((s) => [s.numero, s.letra]));

  const [matches, setMatches] = useState<Record<number, string>>({});
  const [selLeft, setSelLeft] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [anchors, setAnchors] = useState<{ l: Record<number, { x: number; y: number }>; r: Record<string, { x: number; y: number }> }>({ l: {}, r: {} });

  const recalc = useCallback(() => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const l: Record<number, { x: number; y: number }> = {};
    const r: Record<string, { x: number; y: number }> = {};
    for (const [k, el] of Object.entries(leftRefs.current)) {
      if (!el) continue;
      const b = el.getBoundingClientRect();
      l[+k] = { x: b.right - box.left, y: b.top + b.height / 2 - box.top };
    }
    for (const [k, el] of Object.entries(rightRefs.current)) {
      if (!el) continue;
      const b = el.getBoundingClientRect();
      r[k] = { x: b.left - box.left, y: b.top + b.height / 2 - box.top };
    }
    setAnchors({ l, r });
  }, []);

  useLayoutEffect(() => { recalc(); }, [recalc, matches, checked]);
  useEffect(() => {
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [recalc]);

  const connect = (numero: number, letra: string) => {
    if (checked) return;
    setMatches((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[+k] === letra) delete next[+k];
      next[numero] = letra;
      return next;
    });
    setSelLeft(null);
  };

  const colorIndex = (numero: number) => Object.keys(matches).map(Number).sort((a, b) => a - b).indexOf(numero);
  const correct = left.filter((l) => matches[l.numero] === solution[l.numero]).length;
  const allDone = Object.keys(matches).length === left.length;

  const reset = () => { setMatches({}); setSelLeft(null); setChecked(false); };

  const cables = Object.entries(matches).map(([num, letra]) => {
    const n = +num;
    const a = anchors.l[n];
    const b = anchors.r[letra];
    if (!a || !b) return null;
    const color = CABLES[colorIndex(n) % CABLES.length];
    const ok = solution[n] === letra;
    const dx = (b.x - a.x) * 0.45;
    return {
      key: `${n}-${letra}`,
      d: `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`,
      color: checked ? (ok ? '#22C55E' : '#EF4444') : color,
      dashed: checked && !ok,
    };
  }).filter(Boolean) as { key: string; d: string; color: string; dashed: boolean }[];

  return (
    <div className="space-y-5">
      <Confetti fire={checked && correct === left.length} />
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        Haz clic en un elemento de la izquierda y luego en su pareja de la derecha.
      </div>

      <div ref={containerRef} className="relative">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 1 }}>
          {cables.map((c) => (
            <g key={c.key}>
              <path d={c.d} fill="none" stroke={c.color} strokeWidth={6} strokeLinecap="round" opacity={0.18} />
              <path d={c.d} fill="none" stroke={c.color} strokeWidth={3} strokeLinecap="round" strokeDasharray={c.dashed ? '8 4' : undefined} />
            </g>
          ))}
        </svg>

        <div className="relative grid grid-cols-[1fr_44px_1fr] gap-0 sm:grid-cols-[1fr_72px_1fr]" style={{ zIndex: 2 }}>
          <div className="space-y-2.5">
            {left.map((item) => {
              const matched = item.numero in matches;
              const ci = matched ? colorIndex(item.numero) : -1;
              const color = ci >= 0 ? CABLES[ci % CABLES.length] : undefined;
              const ok = checked && matches[item.numero] === solution[item.numero];
              return (
                <button
                  key={item.numero}
                  ref={(el) => (leftRefs.current[item.numero] = el)}
                  onClick={() => setSelLeft(selLeft === item.numero ? null : item.numero)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl border-2 bg-surface px-3 py-2.5 text-left text-sm font-medium transition',
                    selLeft === item.numero ? 'border-brand-400 ring-2 ring-brand-300 scale-[1.01]'
                      : checked ? (ok ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : matched ? 'border-rose-400 bg-rose-50 dark:bg-rose-500/10' : 'border-border')
                        : 'border-border hover:border-brand-300',
                  )}
                  style={matched && !checked && color ? { borderColor: color } : undefined}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: color ?? '#cbd5e1' }}>
                    {item.numero}
                  </span>
                  <span className="flex-1">{item.texto}</span>
                  {checked && matched && (ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />)}
                </button>
              );
            })}
          </div>
          <div />
          <div className="space-y-2.5">
            {right.map((item) => {
              const matched = Object.values(matches).includes(item.letra);
              return (
                <button
                  key={item.letra}
                  ref={(el) => (rightRefs.current[item.letra] = el)}
                  onClick={() => selLeft !== null && connect(selLeft, item.letra)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl border-2 bg-surface px-3 py-2.5 text-left text-sm font-medium transition',
                    matched ? 'border-brand-300' : 'border-border hover:border-brand-300',
                  )}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-400 text-xs font-bold text-white">
                    {item.letra}
                  </span>
                  <span className="flex-1">{item.texto}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Conectadas: <span className="font-bold text-brand-600">{Object.keys(matches).length}/{left.length}</span>
        </p>
        <div className="flex gap-2">
          {!checked && allDone && (
            <Button size="sm" onClick={() => setChecked(true)}><Sparkles className="h-4 w-4" /> Verificar</Button>
          )}
          {(Object.keys(matches).length > 0 || checked) && (
            <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /> Reiniciar</Button>
          )}
        </div>
      </div>

      {checked && (
        <div className={cn('rounded-xl border-2 p-4 text-sm font-semibold', correct === left.length ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200')}>
          {correct === left.length ? '🎉 ¡Perfecto! Todas las parejas son correctas.' : `📝 ${correct} de ${left.length} correctas.`}
        </div>
      )}
    </div>
  );
}
