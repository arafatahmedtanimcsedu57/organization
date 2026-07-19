import type { SVGProps } from 'react';

/** Inline nav / top-bar icons, ported from `ui_design/shopify/admin.html`. */
function Icon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" {...props} />;
}

export function HomeIcon() {
  return (
    <Icon>
      <path d="M3 11l9-8 9 8M5 10v10h14V10" strokeWidth={1.6} strokeLinejoin="round" />
    </Icon>
  );
}

export function ChartIcon() {
  return (
    <Icon>
      <rect x="9" y="3" width="6" height="4" rx="1" strokeWidth={1.6} />
      <rect x="3" y="15" width="6" height="4" rx="1" strokeWidth={1.6} />
      <rect x="15" y="15" width="6" height="4" rx="1" strokeWidth={1.6} />
      <path d="M12 7v4M6 15v-2h12v2" strokeWidth={1.6} />
    </Icon>
  );
}

export function EmployeesIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="3.2" strokeWidth={1.6} />
      <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" strokeWidth={1.6} strokeLinecap="round" />
    </Icon>
  );
}

export function DepartmentsIcon() {
  return (
    <Icon>
      <path d="M4 20V5a1 1 0 011-1h9l6 4v12" strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M4 20h16" strokeWidth={1.6} />
    </Icon>
  );
}

export function ConcurrentIcon() {
  return (
    <Icon>
      <path d="M8 7h8a4 4 0 010 8H6M8 7L5 4M8 7L5 10" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

export function HistoryIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" strokeWidth={1.6} />
      <path d="M12 7v5l3 2" strokeWidth={1.6} strokeLinecap="round" />
    </Icon>
  );
}

export function SettingsIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" strokeWidth={1.6} />
      <path
        d="M19.4 13a7.5 7.5 0 000-2l2-1.5-2-3.5-2.4 1a7 7 0 00-1.7-1L14.5 3h-4l-.3 2.5a7 7 0 00-1.7 1l-2.4-1-2 3.5 2 1.5a7.5 7.5 0 000 2l-2 1.5 2 3.5 2.4-1a7 7 0 001.7 1l.3 2.5h4l.3-2.5a7 7 0 001.7-1l2.4 1 2-3.5z"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </Icon>
  );
}

export function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="7" strokeWidth={1.8} />
      <path d="M21 21l-4-4" strokeWidth={1.8} strokeLinecap="round" />
    </Icon>
  );
}

export function BellIcon() {
  return (
    <Icon>
      <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 20a2 2 0 004 0" strokeWidth={1.6} strokeLinejoin="round" />
    </Icon>
  );
}
