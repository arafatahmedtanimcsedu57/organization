#!/usr/bin/env bash
# One command for the whole test pyramid (task 13.11, `quality-assurance` spec):
#   1) packages/domain unit tests (framework-free)
#   2) apps/api feature tests, against the ephemeral `db-test` Postgres service
#   3) apps/web Playwright E2E journeys, against the full `docker compose up` stack
#      reset to the same deterministic fixtures used by the feature tests
#
# Headless everywhere, safe to run locally or in CI (see .github/workflows/ci.yml).
set -euo pipefail

cd "$(dirname "$0")/.."

export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://orgchart:orgchart@localhost:5433/orgchart_test}"
export DATABASE_URL="${DATABASE_URL:-postgresql://orgchart:orgchart@localhost:5432/orgchart}"
export WEB_PORT="${WEB_PORT:-5173}"
export E2E_BASE_URL="${E2E_BASE_URL:-http://localhost:${WEB_PORT}}"

cleanup() {
  docker compose rm -sf db-test >/dev/null 2>&1 || true
  docker compose down >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> [1/3] Domain unit tests (packages/domain)"
npm test --workspace=@org-chart/domain

echo "==> [2/3] API feature tests (apps/api, ephemeral db-test)"
docker compose up -d db-test --wait
npm test --workspace=@org-chart/api
docker compose rm -sf db-test

echo "==> [3/3] E2E browser journeys (apps/web, full stack)"
docker compose up -d --build --wait
node scripts/wait-for-http.mjs "${E2E_BASE_URL}"
npm run test:e2e:seed --workspace=@org-chart/api
npx playwright test --config=apps/web/playwright.config.ts

echo "==> All tests passed."
