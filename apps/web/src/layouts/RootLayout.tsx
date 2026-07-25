import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** App shell: left nav + top bar wrapping every route (design-system capability).
 * On small screens the nav collapses to a drawer toggled from the top bar.
 * `.frame` / `.main` / `.page` are kept as hooks so the print stylesheet can reflow them. */
export function RootLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);

  return (
    <div className="frame grid min-h-screen grid-cols-[var(--sidebar-w)_1fr] max-[1080px]:grid-cols-[1fr]">
      <Sidebar open={navOpen} onClose={closeNav} />
      {navOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 min-[1081px]:hidden"
          onClick={closeNav}
          aria-hidden="true"
        />
      ) : null}
      <div className="main flex flex-col min-w-0">
        <Topbar onMenuClick={() => setNavOpen((open) => !open)} />
        <main className="">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
