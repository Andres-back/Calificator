import visorImage from '@/assets/xali-bot/visor-avatar.png';
import checkImage from '@/assets/xali-bot/check-avatar.png';
import { cn } from '@/lib/cn';

type XaliAvatarMood = 'default' | 'happy' | 'success' | 'thinking' | 'student' | 'teacher';
type XaliAvatarVariant = 'default' | 'success';
type XaliAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type XaliAvatarProps = {
  size?: XaliAvatarSize;
  variant?: XaliAvatarVariant;
  mood?: XaliAvatarMood;
  /** Flotación suave continua (usa la keyframe `float` del tema). */
  animated?: boolean;
  className?: string;
  imageClassName?: string;
};

const sizeClasses: Record<XaliAvatarSize, { wrapper: string; image: string }> = {
  xs: { wrapper: 'h-8 w-8', image: 'h-7 w-7' },
  sm: { wrapper: 'h-9 w-9', image: 'h-8 w-8' },
  md: { wrapper: 'h-11 w-11', image: 'h-10 w-10' },
  lg: { wrapper: 'h-16 w-16', image: 'h-14 w-14' },
  xl: { wrapper: 'h-24 w-24', image: 'h-20 w-20' },
};

/** Fondo/anillo por mood. student = cian/menta (tutor), teacher = índigo/violeta (copiloto). */
const moodClasses: Record<XaliAvatarMood, string> = {
  default: 'bg-white/95 ring-black/5',
  happy: 'bg-sky-50 ring-sky-200 dark:bg-sky-500/15 dark:ring-sky-500/30',
  success: 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-500/15 dark:ring-emerald-500/30',
  thinking: 'bg-white/95 ring-black/5',
  student: 'bg-gradient-to-br from-sky-50 to-emerald-50 ring-cyan-200 dark:from-sky-500/15 dark:to-emerald-500/10 dark:ring-cyan-500/30',
  teacher: 'bg-gradient-to-br from-brand-50 to-violet-500/10 ring-violet-300 dark:from-brand-500/15 dark:to-violet-500/10 dark:ring-violet-500/30',
};

/**
 * Avatar de la mascota Xali. Compacto por diseño: los assets actuales (visor y
 * check con fondo transparente) funcionan como "cara". El check (`success`/
 * `variant="success"`) es para estados de logro/confirmación — NO usarlo como
 * avatar principal de conversación. El cuerpo completo por piezas queda para
 * una fase futura SVG/animable.
 */
export function XaliAvatar({
  size = 'md',
  variant,
  mood = 'default',
  animated = false,
  className,
  imageClassName,
}: XaliAvatarProps) {
  const resolvedVariant = variant ?? (mood === 'success' ? 'success' : 'default');
  const image = resolvedVariant === 'success' ? checkImage : visorImage;
  const label = resolvedVariant === 'success' ? 'Revision segura de Xali' : 'Avatar de Xali';

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-2xl shadow-sm ring-1',
        moodClasses[mood],
        mood === 'thinking' && 'animate-pulse',
        animated && mood !== 'thinking' && 'animate-float',
        sizeClasses[size].wrapper,
        className,
      )}
    >
      <img
        src={image}
        alt={label}
        className={cn('select-none object-contain', sizeClasses[size].image, imageClassName)}
        draggable={false}
      />
    </span>
  );
}
