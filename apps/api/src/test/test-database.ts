import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DataSource } from 'typeorm';
import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';
import { ChangeLog } from '../history/change-log.entity.ts';
import { fixtureAssignments, fixtureDepartments, fixtureEmployees } from './fixtures.ts';

const migrationsGlob = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations', '*.ts');

/** Tables in FK-safe delete order (children before the parents they reference). */
const TABLES_IN_DELETE_ORDER = ['change_log', 'assignments', 'employees', 'departments'];

function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set (see .env.example) — start the ephemeral test db with `npm run test:db:up` in apps/api',
    );
  }
  return url;
}

/**
 * A `DataSource` pointed at the ephemeral test Postgres service (`db-test` in
 * `docker-compose.yml`), never at the dev/prod database. Feature tests use this
 * instead of the app's own `TypeOrmModule` wiring so they can reset state between
 * runs without touching real data.
 */
export function createTestDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: testDatabaseUrl(),
    entities: [Department, Employee, Assignment, ChangeLog],
    migrations: [migrationsGlob],
    synchronize: false,
  });
}

/**
 * Brings the test db to a known, deterministic state: apply any pending
 * migrations, wipe every table, then load the fixture rows from `fixtures.ts`.
 * Call before each feature test run so results are reproducible.
 */
export async function resetTestDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.runMigrations();

  const tables = TABLES_IN_DELETE_ORDER.map((table) => `"${table}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);

  await dataSource.getRepository(Department).insert(fixtureDepartments);
  await dataSource.getRepository(Employee).insert(fixtureEmployees);
  await dataSource.getRepository(Assignment).insert(fixtureAssignments);
}
