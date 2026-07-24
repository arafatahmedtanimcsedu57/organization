import { Outlet } from 'react-router-dom';
import { PAGE_TITLE } from '../../design/formStyles';

export function AdminLayout() {
  return (
    <section>
      <h1 className={PAGE_TITLE}>Admin</h1>
      <Outlet />
    </section>
  );
}
