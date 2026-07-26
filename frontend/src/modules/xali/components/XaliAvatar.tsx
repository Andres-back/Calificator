import { cn } from '@/lib/cn';

type XaliAvatarMood = 'default' | 'happy' | 'success' | 'thinking' | 'student' | 'teacher';
type XaliAvatarVariant = 'default' | 'success';
type XaliAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type XaliAvatarProps = {
  size?: XaliAvatarSize;
  variant?: XaliAvatarVariant;
  mood?: XaliAvatarMood;
  animated?: boolean;
  className?: string;
};

const sizeMap: Record<XaliAvatarSize, { box: number; ring: number; pupil: number; glow: number }> = {
  xs: { box: 32, ring: 14, pupil: 4, glow: 6 },
  sm: { box: 36, ring: 16, pupil: 5, glow: 7 },
  md: { box: 44, ring: 20, pupil: 6, glow: 8 },
  lg: { box: 64, ring: 28, pupil: 8, glow: 12 },
  xl: { box: 96, ring: 42, pupil: 12, glow: 18 },
};

const moodGradients: Record<XaliAvatarMood, [string, string, string]> = {
  default: ['#6366f1', '#818cf8', '#a5b4fc'],
  happy: ['#0ea5e9', '#38bdf8', '#7dd3fc'],
  success: ['#10b981', '#34d399', '#6ee7b7'],
  thinking: ['#6366f1', '#818cf8', '#a5b4fc'],
  student: ['#06b6d4', '#22d3ee', '#67e8f9'],
  teacher: ['#7c3aed', '#a78bfa', '#c4b5fd'],
};

/**
 * SVG avatar de Xali — robot amigable con visor luminoso.
 * Reemplaza la imagen PNG genérica por un vectorial atractivo.
 */
export function XaliAvatar({
  size = 'md',
  variant,
  mood = 'default',
  animated = false,
  className,
}: XaliAvatarProps) {
  const resolvedVariant = variant ?? (mood === 'success' ? 'success' : 'default');
  const s = sizeMap[size];
  const [c1, c2, c3] = moodGradients[mood];
  const gradId = `xg-${size}-${mood}`;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5',
        mood === 'thinking' && 'animate-pulse',
        animated && mood !== 'thinking' && 'animate-float',
        className,
      )}
      style={{ width: s.box, height: s.box }}
    >
      <svg
        viewBox="0 0 48 48"
        width={s.box}
        height={s.box}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Avatar de Xali"
      >
        <defs>
          <radialGradient id={gradId} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor={c3} />
            <stop offset="100%" stopColor={c1} />
          </radialGradient>
          <filter id={`glow-${gradId}`}>
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle cx="24" cy="24" r="23" fill={`url(#${gradId})`} />

        {/* Visor / face plate */}
        <rect x="12" y="16" width="24" height="16" rx="8" fill="white" fillOpacity="0.92" />

        {/* Eyes */}
        {resolvedVariant === 'success' ? (
          /* Checkmark for success mood */
          <path
            d="M18 24l3 3 6-6"
            stroke={c1}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <>
            {/* Left eye */}
            <circle cx="19" cy="24" r={s.pupil * 0.45} fill={c1} filter={`url(#glow-${gradId})`} />
            <circle cx="19" cy="23.5" r={s.pupil * 0.18} fill="white" fillOpacity="0.8" />
            {/* Right eye */}
            <circle cx="29" cy="24" r={s.pupil * 0.45} fill={c1} filter={`url(#glow-${gradId})`} />
            <circle cx="29" cy="23.5" r={s.pupil * 0.18} fill="white" fillOpacity="0.8" />
          </>
        )}

        {/* Antenna */}
        <line x1="24" y1="8" x2="24" y2="14" stroke={c2} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="24" cy="7" r="2" fill={c2} />

        {/* Body hint */}
        <rect x="18" y="33" width="12" height="8" rx="4" fill={c2} fillOpacity="0.7" />
      </svg>
    </span>
  );
}
