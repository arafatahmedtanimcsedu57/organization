import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChartIcon,
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

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/chart', label: 'Organization chart', icon: ChartIcon },
  { to: '/admin/employees', label: 'Employees', icon: EmployeesIcon },
  { to: '/admin/departments', label: 'Departments', icon: DepartmentsIcon },
  { to: '/admin/assignments', label: 'Concurrent duties', icon: ConcurrentIcon },
  { to: '/history', label: 'Change history', icon: HistoryIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

const NAV_BASE =
  'flex items-center gap-[9px] px-2.5 py-1.5 rounded-sm text-[13px] font-medium transition-[background] duration-[120ms] ease-brand [&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:shrink-0';
const NAV_INACTIVE = 'text-ink hover:bg-surface-hover [&_svg]:text-sub';
const NAV_ACTIVE = 'bg-surface shadow-1 font-semibold text-strong [&_svg]:text-action';

/** `.sidebar` is kept as a hook so the print stylesheet can hide it. */
export function Sidebar() {
  return (
    <aside className="sidebar bg-surface-sub border-r border-line flex flex-col sticky top-0 h-screen">
      <div className="flex items-center gap-[0.55rem] px-[14px] py-3 h-[var(--topbar-h)] border-b border-line">
        <span className="w-7 h-7 rounded-[7px] bg-brand grid place-items-center text-white font-extrabold shrink-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]">
          <span className="font-jp font-extrabold text-[15px]">組</span>
        </span>
        <span className="flex flex-col leading-[1.2]">
          <b className="font-bold text-[14px] text-strong">Organo</b>
          <small className="text-[11px] text-sub font-medium">株式会社シスラボ</small>
        </span>
      </div>
      <nav className="p-2 flex flex-col gap-px overflow-y-auto flex-1" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
