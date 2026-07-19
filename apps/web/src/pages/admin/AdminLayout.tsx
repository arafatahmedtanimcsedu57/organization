import { Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <section>
      <h1>Admin</h1>
      <Outlet />
    </section>
  );
}
