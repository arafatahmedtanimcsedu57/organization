import 'reflect-metadata';
import { createTestDataSource, resetTestDatabase } from './test-database.ts';

/** CLI entrypoint (`npm run test:db:seed`): reset the ephemeral test db to the deterministic fixtures. */
async function run() {
  const dataSource = createTestDataSource();
  await dataSource.initialize();
  try {
    await resetTestDatabase(dataSource);
    console.log('[test-db] ephemeral test database reset and seeded with deterministic fixtures');
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err: unknown) => {
  console.error('[test-db] failed to seed the ephemeral test database:', err);
  process.exitCode = 1;
});
