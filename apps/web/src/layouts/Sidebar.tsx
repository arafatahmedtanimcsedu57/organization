import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChartIcon,
  CloseIcon,
  ConcurrentIcon,
  DepartmentsIcon,
  EmployeesIcon,
  HistoryIcon,
  HomeIcon,
  SettingsIcon,
} from './icons';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType;
  end?: boolean;
}

/** General navigation. */
const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/chart', label: 'Organization chart', icon: ChartIcon },
];

/** Master-data administration - grouped separately under `/admin`. */
const ADMIN_NAV: NavItem[] = [
  { to: '/admin/employees', label: 'Employees', icon: EmployeesIcon },
  { to: '/admin/departments', label: 'Departments', icon: DepartmentsIcon },
  { to: '/admin/assignments', label: 'Concurrent duties', icon: ConcurrentIcon },
  { to: '/admin/history', label: 'Change history', icon: HistoryIcon },
  { to: '/admin/titles', label: 'Title', icon: SettingsIcon },
];

const NAV_BASE =
  'flex items-center gap-[9px] px-2.5 py-1.5 rounded-sm text-[13px] font-medium transition-[background] duration-[120ms] ease-brand [&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:shrink-0';
const NAV_INACTIVE = 'text-ink hover:bg-surface-hover [&_svg]:text-sub';
const NAV_ACTIVE = 'bg-surface shadow-1 font-semibold text-strong [&_svg]:text-strong';
const SECTION_LABEL = 'px-2.5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-sub';

export interface SidebarProps {
  /** Drawer open state (only meaningful on small screens). */
  open: boolean;
  /** Close the drawer - also called when a nav link is tapped on mobile. */
  onClose: () => void;
}

function NavItems({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  return (
    <>
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`}
        >
          <Icon />
          {label}
        </NavLink>
      ))}
    </>
  );
}

/**
 * Left navigation. On screens ≤1080px it collapses to an off-canvas drawer toggled
 * from the top bar; `.sidebar` is kept as a hook so the print stylesheet can hide it.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <aside
      className={`sidebar bg-surface-sub border-r border-line flex flex-col sticky top-0 h-screen z-40 max-[1080px]:fixed max-[1080px]:left-0 max-[1080px]:w-[var(--sidebar-w)] max-[1080px]:shadow-2 max-[1080px]:transition-transform max-[1080px]:duration-200 ${
        open ? 'max-[1080px]:translate-x-0' : 'max-[1080px]:-translate-x-full'
      }`}
    >
      <div className="flex items-center gap-[0.55rem] px-[14px] py-3 h-[var(--topbar-h)] border-b border-line">
        <span className="w-7 h-7 rounded-[7px] bg-brand grid place-items-center text-white font-extrabold shrink-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]">
          <span className="font-jp font-extrabold text-[15px]">組</span>
        </span>
        <span className="flex flex-col leading-[1.2]">
          <b className="font-bold text-[14px] text-strong">Organo</b>
          <small className="text-[11px] text-sub font-medium">株式会社シスラボ</small>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="ml-auto w-8 h-8 rounded-md grid place-items-center text-sub hover:bg-surface-hover min-[1081px]:hidden [&_svg]:w-[18px] [&_svg]:h-[18px]"
        >
          <CloseIcon />
        </button>
      </div>
      <nav className="p-2 flex flex-col gap-px overflow-y-auto flex-1" aria-label="Main">
        <NavItems items={MAIN_NAV} onNavigate={onClose} />
        <p className={SECTION_LABEL}>Admin</p>
        <NavItems items={ADMIN_NAV} onNavigate={onClose} />
      </nav>
    </aside>
  );
}
