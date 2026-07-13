import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Confetti ligero sin dependencias (inspirado en micro-interacciones de
 * Uiverse, reescrito en React + framer-motion). Totalmente scopeado: solo
 * renderiza piezas absolutas dentro de un contenedor `relative`.
 */
const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];

export function Confetti({ fire, count = 90 }: { fire: boolean; count?: number }) {
  const [pieces, setPieces] = useState<number[]>([]);
  useEffect(() => {
    if (fire) {
      setPieces(Array.from({ length: count }, (_, i) => i));
      const t = setTimeout(() => setPieces([]), 2200);
      return () => clearTimeout(t);
    }
  }, [fire, count]);

  if (pieces.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((i) => {
        const left = Math.random() * 100;
        const color = COLORS[i % COLORS.length];
        const size = 6 + Math.random() * 8;
        const rotate = Math.random() * 360;
        const delay = Math.random() * 0.25;
        const duration = 1.4 + Math.random() * 0.8;
        return (
          <motion.span
            key={i}
            initial={{ top: '-5%', left: `${left}%`, opacity: 1, rotate }}
            animate={{ top: '105%', rotate: rotate + 360, opacity: [1, 1, 0.8, 0] }}
            transition={{ duration, delay, ease: 'easeIn' }}
            style={{ position: 'absolute', width: size, height: size * 0.6, background: color, borderRadius: 2 }}
          />
        );
      })}
    </div>
  );
}
