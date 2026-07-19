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

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="side-brand">
        <span className="logo">
          <span className="jp">組</span>
        </span>
        <span className="store">
          <b>Organo</b>
          <small>株式会社シスラボ</small>
        </span>
      </div>
      <nav className="nav" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
