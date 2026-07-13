import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/stores/theme';

export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const dark = mode === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema"
      className="focus-ring relative grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-border bg-surface text-fg transition hover:border-brand-300"
    >
      <motion.span
        key={mode}
        initial={{ y: 14, opacity: 0, rotate: -30 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {dark ? <Moon className="h-5 w-5 text-brand-300" /> : <Sun className="h-5 w-5 text-amber-500" />}
      </motion.span>
    </button>
  );
}
