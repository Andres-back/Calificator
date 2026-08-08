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

const sizeMap: Record<XaliAvatarSize, string> = {
  xs: 'h-9 w-9',
  sm: 'h-11 w-11',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
  xl: 'h-28 w-28',
};

const mascotByMood: Record<XaliAvatarMood, string> = {
  default: '/branding/xali-hello.png',
  happy: '/branding/xali-celebrating.png',
  success: '/branding/xali-celebrating.png',
  thinking: '/branding/xali-studying.png',
  student: '/branding/xali-studying.png',
  teacher: '/branding/xali-hello.png',
};

/** Usa siempre la mascota oficial del branding de XCalificator. */
export function XaliAvatar({
  size = 'md',
  variant,
  mood = 'default',
  animated = false,
  className,
}: XaliAvatarProps) {
  const resolvedMood = variant === 'success' ? 'success' : mood;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-slate-100',
        sizeMap[size],
        resolvedMood === 'thinking' && 'animate-pulse',
        animated && resolvedMood !== 'thinking' && 'animate-float',
        className,
      )}
    >
      <img
        src={mascotByMood[resolvedMood]}
        alt="Mascota Xali"
        className="h-full w-full object-contain mix-blend-multiply"
      />
    </span>
  );
}
