import { Outlet } from 'react-router-dom';

/**
 * Placeholder shell for every route. Section 8 (design-system) replaces this
 * with the real app shell: left nav (Home · Org chart · Employees ·
 * Departments · Concurrent duties · Change history · Settings) + top bar.
 */
export function RootLayout() {
  return (
    <div className="app-shell-placeholder">
      <Outlet />
    </div>
  );
}
