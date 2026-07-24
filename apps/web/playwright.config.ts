import { defineConfig, devices } from '@playwright/test';

const webPort = Number(process.env.WEB_PORT) || 5173;

/** Journeys A/B/C (tasks 13.8–13.10) run headless against the app stack already started via `docker compose up` — see `E2E_BASE_URL` in `.env.example`. */
export default defineConfig({
  testDir: './e2e',
  // The journeys mutate one shared, seeded database (and overlap on "the first employee"),
  // so they must run serially to stay deterministic — running them in parallel races.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || `http://localhost:${webPort}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
