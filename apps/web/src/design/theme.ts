/**
 * Theme (light/dark) plumbing. The `data-theme` flag on <html> is what the CSS reads
 * (see design/tailwind.css `:root[data-theme="dark"]`); this module is the single place that
 * reads/writes it plus the persisted choice. The initial value is also applied pre-paint by the
 * inline script in index.html so there is no flash - `getInitialTheme()` returns the same value,
 * keeping the store in sync with what that script already set.
 */

export type Theme = 'light' | 'dark';

/** localStorage key for the persisted explicit choice. Keep in sync with the index.html script. */
export const THEME_STORAGE_KEY = 'org-theme';

/** Saved choice if any, else the OS preference, else light. Defensive against storage being
 * unavailable (private mode / blocked cookies) so it can never throw during store init. */
export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage blocked - fall through to the OS preference */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Reflect a theme onto <html> and persist it. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage blocked - the DOM flag still applies for this session */
  }
}
