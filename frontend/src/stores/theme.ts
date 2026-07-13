import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Mode = 'light' | 'dark';

interface ThemeState {
  mode: Mode;
  toggle: () => void;
  set: (m: Mode) => void;
}

function apply(mode: Mode) {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      toggle: () => {
        const next = get().mode === 'dark' ? 'light' : 'dark';
        apply(next);
        set({ mode: next });
      },
      set: (m) => {
        apply(m);
        set({ mode: m });
      },
    }),
    {
      name: 'xc-theme',
      onRehydrateStorage: () => (state) => {
        if (state) apply(state.mode);
      },
    },
  ),
);
