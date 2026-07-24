import { create } from 'zustand';
import { applyTheme, getInitialTheme, type Theme } from '../design/theme';

/** Global light/dark theme. Standalone Zustand store (like `uiStore`) because the theme is
 * app-wide chrome state, not server data — every setter also mirrors the value onto <html> and
 * localStorage via `applyTheme`. Initial value matches what index.html's pre-paint script set. */
interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
}));
