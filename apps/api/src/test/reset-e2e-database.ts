import 'reflect-metadata';
import { createDataSource, resetTestDatabase } from './test-database.ts';

/**
 * CLI (`npm run test:e2e:seed`, invoked by `scripts/test-all.sh`): resets the dev
 * database that the full `docker compose up` stack's `api`/`web` connect to
 * (`DATABASE_URL`) to the same deterministic fixtures used by the API feature
 * tests, so the Playwright E2E journeys run against a known, reproducible
 * dataset on every run instead of whatever the imported masters happen to hold.
 */
async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set (see .env.example)');
  }

  const dataSource = createDataSource(databaseUrl);
  await dataSource.initialize();
  try {
    await resetTestDatabase(dataSource);
    console.log('[e2e-db] dev database reset and seeded with deterministic fixtures for E2E');
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err: unknown) => {
  console.error('[e2e-db] failed to reset the dev database for E2E:', err);
  process.exitCode = 1;
});
