import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** App shell: left nav + top bar wrapping every route (design-system capability).
 * `.frame` / `.main` / `.page` are kept as hooks so the print stylesheet can reflow them. */
export function RootLayout() {
  return (
    <div className="frame grid min-h-screen grid-cols-[var(--sidebar-w)_1fr] max-[1080px]:grid-cols-[1fr]">
      <Sidebar />
      <div className="main flex flex-col min-w-0">
        <Topbar />
        <main className="">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
