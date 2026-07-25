import { Link } from 'react-router-dom';
import { Breadcrumb, Button, Card } from '../design/components';
import { PAGE, PAGE_HEAD, PAGE_TITLE } from '../design/formStyles';
import { TitlesSection } from './settings/TitlesSection';
import { DepartmentTitlesSection } from './settings/DepartmentTitlesSection';

/**
 * Master-data settings: manage the title catalog and which titles each department
 * may use. Department add/update/deactivate lives in the Admin area (linked below).
 */
export function SettingsPage() {
  return (
    <div className={PAGE}>
      <div className={PAGE_HEAD}>
        <div>
          <Breadcrumb
            items={[
              { label: 'Home', to: '/' },
              { label: 'Maintenance', to: '/admin' },
              { label: 'Title' },
            ]}
          />
          <h1 className={PAGE_TITLE}>Title</h1>
        </div>
      </div>

      <TitlesSection />
      <DepartmentTitlesSection />

      <Card>
        <Card.Header
          title="Departments"
          actions={
            <Link to="/admin/departments">
              <Button variant="secondary" size="sm">
                Manage departments
              </Button>
            </Link>
          }
        />
        <Card.Body>
          <p className="text-[13px]" style={{ color: 'var(--color-sub)' }}>
            Add, rename, re-parent, or deactivate departments in the Admin area, then assign their
            usable titles above.
          </p>
        </Card.Body>
      </Card>
    </div>
  );
}
