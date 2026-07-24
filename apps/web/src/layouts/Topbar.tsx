import { NavLink } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import { BellIcon, MoonIcon, SearchIcon, SunIcon } from './icons';

/** `.topbar` is kept as a hook so the print stylesheet can hide it. */
export function Topbar() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <header className="topbar h-[var(--topbar-h)] bg-surface border-b border-line flex items-center gap-[14px] px-4 sticky top-0 z-20">
      <div className="flex-1 max-w-[480px] mx-auto relative max-[640px]:hidden [&_svg]:absolute [&_svg]:left-2.5 [&_svg]:top-1/2 [&_svg]:-translate-y-1/2 [&_svg]:w-4 [&_svg]:h-4 [&_svg]:text-sub">
        <SearchIcon />
        <input
          type="search"
          placeholder="Search employees, departments…"
          aria-label="Search"
          className="w-full h-[34px] border border-line-strong rounded-md bg-surface-sub pl-[34px] pr-3 text-[13px] text-ink placeholder:text-sub focus:outline-none focus:bg-surface focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,128,96,0.14)]"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <button
          className="w-[34px] h-[34px] rounded-md grid place-items-center text-sub relative transition-[background] duration-[120ms] ease-brand hover:bg-surface-hover [&_svg]:w-[18px] [&_svg]:h-[18px]"
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-pressed={isDark}
          title={isDark ? 'Light theme' : 'Dark theme'}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          className="w-[34px] h-[34px] rounded-md grid place-items-center text-sub relative transition-[background] duration-[120ms] ease-brand hover:bg-surface-hover [&_svg]:w-[18px] [&_svg]:h-[18px]"
          type="button"
          aria-label="Notifications"
        >
          <span className="absolute top-[7px] right-2 w-[7px] h-[7px] rounded-full bg-brand border-[1.5px] border-surface z-[1]" />
          <BellIcon />
        </button>
        <NavLink
          to="/settings"
          className="w-[34px] h-[34px] rounded-md grid place-items-center text-sub relative transition-[background] duration-[120ms] ease-brand hover:bg-surface-hover"
          aria-label="Account"
        >
          <div className="w-[26px] h-[26px] rounded-full bg-[linear-gradient(135deg,#00806022,#00806055)] text-brand-dark grid place-items-center font-bold text-[12px] shrink-0">
            A
          </div>
        </NavLink>
      </div>
    </header>
  );
}
