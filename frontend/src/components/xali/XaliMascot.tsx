import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import type { XaliVisualState } from './xaliStates';

type XaliMascotProps = {
  state: XaliVisualState;
  size?: 'compact' | 'story' | 'static';
  animate?: boolean;
  className?: string;
  label?: string;
};

const sizeClass = {
  compact: 'h-20 w-20',
  story: 'h-40 w-32 sm:h-48 sm:w-40',
  static: 'h-28 w-24',
};

const eyesByExpression: Record<XaliVisualState['expression'], { left: string; right: string; mouth: string }> = {
  calm: { left: 'M74 75h12', right: 'M114 75h12', mouth: 'M88 94q12 7 24 0' },
  happy: { left: 'M73 78q7-10 14 0', right: 'M113 78q7-10 14 0', mouth: 'M87 93q13 15 26 0' },
  proud: { left: 'M73 77q7-8 14 0', right: 'M113 77q7-8 14 0', mouth: 'M88 92q12 11 24 0' },
  thinking: { left: 'M74 79q6-5 12-2', right: 'M114 73q6-7 12-2', mouth: 'M94 96q8-3 16 0' },
  attentive: { left: 'M80 70v13', right: 'M120 70v13', mouth: 'M92 94q8 7 16 0' },
  encouraging: { left: 'M74 75q6-7 12 0', right: 'M114 75q6-7 12 0', mouth: 'M86 92q14 15 28 0' },
  explaining: { left: 'M80 70v13', right: 'M120 70v13', mouth: 'M94 91q6 10 12 0q-6-5-12 0' },
  celebrating: { left: 'M73 78q7-11 14 0', right: 'M113 78q7-11 14 0', mouth: 'M84 91q16 20 32 0' },
};

function armTransforms(gesture: XaliVisualState['gesture']) {
  if (gesture === 'wave') return { left: 'rotate(-52 55 136)', right: 'rotate(8 145 136)' };
  if (gesture === 'point') return { left: 'rotate(18 55 136)', right: 'rotate(-52 145 136)' };
  if (gesture === 'thumbs-up') return { left: 'rotate(-34 55 136)', right: 'rotate(12 145 136)' };
  if (gesture === 'open-arms') return { left: 'rotate(42 55 136)', right: 'rotate(-42 145 136)' };
  return { left: 'rotate(8 55 136)', right: 'rotate(-8 145 136)' };
}

export function XaliMascot({ state, size = 'story', animate = true, className, label = 'Xali acompaña tu retroalimentación' }: XaliMascotProps) {
  const reduced = useReducedMotion();
  const shouldAnimate = animate && !reduced;
  const face = eyesByExpression[state.expression];
  const arms = armTransforms(state.gesture);

  return (
    <motion.svg
      viewBox="0 0 200 260"
      role="img"
      aria-label={label}
      className={cn('xali-mascot overflow-visible drop-shadow-[0_16px_20px_rgba(49,46,129,0.18)]', sizeClass[size], className)}
      initial={false}
      animate={shouldAnimate ? { y: [0, -4, 0], rotate: [0, -0.8, 0] } : { y: 0, rotate: 0 }}
      transition={shouldAnimate ? { duration: 3.2, repeat: 1, ease: 'easeInOut' } : { duration: 0 }}
      style={{ color: 'var(--xali-primary, #4f46e5)' }}
    >
      <defs>
        <linearGradient id="xali-shell" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="xali-body" x1="0" x2="1">
          <stop stopColor="#eef2ff" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="244" rx="55" ry="9" fill="currentColor" opacity=".13" />
      <g data-part="legs" stroke="#172554" strokeWidth="5" strokeLinejoin="round">
        <path d="M72 193v33l-17 10h37v-43" fill="url(#xali-shell)" />
        <path d="M128 193v33l17 10h-37v-43" fill="url(#xali-shell)" />
        <path d="M54 236h39" stroke="currentColor" />
        <path d="M107 236h39" stroke="currentColor" />
      </g>
      <g data-part="torso">
        <rect x="58" y="111" width="84" height="94" rx="32" fill="url(#xali-body)" stroke="#172554" strokeWidth="5" />
        <path d="M70 126q30 18 60 0" fill="none" stroke="currentColor" strokeWidth="7" />
        <path d="M100 149l5 9 10 1-8 7 3 10-10-5-10 5 3-10-8-7 10-1z" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
      </g>
      <motion.g data-part="arm-left" style={{ transformOrigin: '55px 136px' }} animate={{ transform: arms.left }}>
        <path d="M61 133q-21 10-28 37" fill="none" stroke="#172554" strokeWidth="18" strokeLinecap="round" />
        <path d="M61 133q-21 10-28 37" fill="none" stroke="url(#xali-shell)" strokeWidth="11" strokeLinecap="round" />
        <circle cx="32" cy="173" r="10" fill="currentColor" stroke="#172554" strokeWidth="4" />
      </motion.g>
      <motion.g data-part="arm-right" style={{ transformOrigin: '145px 136px' }} animate={{ transform: arms.right }}>
        <path d="M139 133q21 10 28 37" fill="none" stroke="#172554" strokeWidth="18" strokeLinecap="round" />
        <path d="M139 133q21 10 28 37" fill="none" stroke="url(#xali-shell)" strokeWidth="11" strokeLinecap="round" />
        <circle cx="168" cy="173" r="10" fill="currentColor" stroke="#172554" strokeWidth="4" />
      </motion.g>
      <g data-part="head">
        <rect x="38" y="22" width="124" height="96" rx="43" fill="url(#xali-shell)" stroke="#172554" strokeWidth="5" />
        <rect x="51" y="39" width="98" height="62" rx="28" fill="#081a3a" stroke="currentColor" strokeWidth="4" />
        <g fill="none" stroke="#67e8f9" strokeWidth="7" strokeLinecap="round">
          <path d={face.left} /><path d={face.right} /><path d={face.mouth} strokeWidth="5" />
        </g>
        <path d="M78 22q22-14 44 0" fill="currentColor" opacity=".9" />
      </g>
      {state.accessory === 'book' && (
        <g data-part="accessory" transform="translate(73 177)">
          <path d="M0 0q14-6 27 2v28q-13-8-27-2zM54 0Q40-6 27 2v28q13-8 27-2z" fill="#ffffff" stroke="currentColor" strokeWidth="3" />
        </g>
      )}
      {state.accessory === 'lesson-card' && (
        <g data-part="accessory" transform="translate(136 152)">
          <rect width="47" height="58" rx="8" fill="#ffffff" stroke="currentColor" strokeWidth="3" />
          <circle cx="13" cy="16" r="5" fill="#facc15" />
          <path d="M23 15h15M9 30h29M9 40h22" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {state.tone === 'success' && <circle cx="154" cy="37" r="13" fill="#22c55e" stroke="#fff" strokeWidth="3" />}
    </motion.svg>
  );
}
