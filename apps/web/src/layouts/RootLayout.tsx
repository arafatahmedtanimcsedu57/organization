import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** App shell: left nav + top bar wrapping every route (design-system capability). */
export function RootLayout() {
  return (
    <div className="frame">
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
