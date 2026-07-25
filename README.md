# Organization Chart Auto-Output App

A full-stack app that automatically generates a **printable organization chart** (interactive
React view → A4 PDF) from the two Syslabo masters - `sys_user` (employees) and `cmn_department`
(departments) - reproducing the hand-made `組織図(Current Organizational Chart).xlsx`, and adds a
maintenance UI with change history and a working concurrent-duties (兼務) model.

Built for the Syslabo assignment. Covers all four requirements:

- **1 & 2** - the chart generator itself, and a reproducible one-command dev environment.
- **3** - a maintenance UI for employees/departments/assignments with an append-only change-history browser.
- **4** - concurrent duties (兼務) as a first-class relation, feeding the `(兼)` chips on the chart.

See [`docs/assignment-understanding.md`](docs/assignment-understanding.md) and
[`docs/concurrent-duties-design.md`](docs/concurrent-duties-design.md) for the background design notes.

## Architecture

```
apps/api        NestJS REST API - TypeORM + PostgreSQL, xlsx import, org-chart, PDF export
                 (Puppeteer), employee/department/assignment CRUD, append-only history.
apps/web        React SPA (Vite) - interactive org chart (Tree ⇄ Network), admin area for the
                 masters, history browser. Organo Admin (Shopify/Polaris-style) design system.
packages/domain Framework-free domain core shared by api and web: department tree, rank
                 ordering, name disambiguation, title normalization, 兼務 placement.
data/           Working copies of the provided xlsx masters, used only as the import source.
docker-compose.yml   db (Postgres) + api + web, wired together; a test-only db-test service.
```

## Requirements

- **Docker** and **Docker Compose** (the only prerequisite to run the app).
- **Node.js 20+** and npm, only if you want to run things outside Docker (e.g. `npm run lint`,
  or the test suite, which drives Docker itself for the databases).

## Setup & usage

```bash
cp .env.example .env   # optional - defaults already work
docker compose up --build
```

This single command brings up **the database, the API, and the web app**, and the API's
entrypoint automatically **waits for Postgres, runs migrations, and imports/seeds the masters**
from `data/<DATA_LANG>/*.xlsx` before starting - no separate seed step.

Once it's up:

- **Web app:** http://localhost:5173 - chart at `/chart`, admin at `/admin`, history at `/history`.
- **API:** http://localhost:3000 - see the controllers below.

Stop with `Ctrl+C`, or `docker compose down` (add `-v` to also drop the `db-data` volume and
start from a clean database next time).

### Chart language (Japanese / English)

The seed loads one of two committed datasets, chosen by the **`DATA_LANG`** env var - `ja`
(default) or `en`. English gives readable department names, position titles, and romaji person
names for reviewers who don't read Japanese:

```bash
DATA_LANG=en docker compose up --build   # or set DATA_LANG in .env
```

Because the language is applied at **seed time**, switching it needs only a re-seed, not a
rebuild: change the value and recreate the api container (`docker compose up -d --force-recreate api`).
The English dataset (`data/en/*.xlsx`) is generated from the Japanese masters plus a single
hand-editable translation map, `data/translations.en.json`; edit that file and regenerate with
`npm run data:gen:en` (from `apps/api`). The web UI's own labels stay Japanese - only the chart
data changes language.

## Maintainer guide

### Everyday maintenance (no code changes)

Use the **admin UI** at `/admin` (Employees, Departments, Assignments tabs):

- **Employees / Departments** - create, edit, and deactivate. Schema changes are additive-only
  (new columns, never repurposed ones), per the assignment's precautions.
- **Assignments** - a person's **primary** posting plus any **concurrent (兼務)** postings.
  Adding a concurrent assignment is what makes a person's `(兼)` chip appear in another
  department on the chart; a second _primary_ posting for the same person is rejected.
- Every create/update/deactivate across these three is recorded automatically; browse it at
  `/history` (reverse-chronological, before/after, no edit or delete path - the log is
  append-only by design).

### API surface (`apps/api`, NestJS)

| Controller              | Base path      | Purpose                                            |
| ----------------------- | -------------- | -------------------------------------------------- |
| `OrgChartController`    | `/chart`       | Chart JSON + PDF export (Puppeteer, A4)            |
| `EmployeesController`   | `/employees`   | CRUD                                               |
| `DepartmentsController` | `/departments` | CRUD                                               |
| `AssignmentsController` | `/assignments` | Primary/concurrent posting CRUD                    |
| `HistoryController`     | `/history`     | Read-only change-log query (filter by entity/time) |

### Domain core (`packages/domain`)

The department tree (parent-by-name from `cmn_department`, **not** `sys_user.Manager` - empty for
every row), position-rank ordering, shared-last-name disambiguation, and title normalization
(`主任２` full-width === `主任2`) all live here, framework-free, and are unit-tested directly.

### Re-importing the masters

The API re-runs its import/seed step on every container start (safe/idempotent). To re-import
manually against a running stack:

```bash
docker compose exec api npm run seed
```

To change the source data, edit the working copies in `data/ja/*.xlsx` (never the originals in
`TryOutProgram/`) and re-run the seed. For the English dataset, edit `data/translations.en.json`
and regenerate with `npm run data:gen:en` (see **Chart language** above) rather than editing
`data/en/*.xlsx` by hand.

### Database migrations

```bash
docker compose exec api npm run migration:generate -- src/migrations/<Name>
docker compose exec api npm run migration:run
```

## Tests

One command runs the whole suite headless (domain unit tests → API feature tests → Playwright
E2E), the same way CI does (`.github/workflows/ci.yml`):

```bash
npm run test:all
```

This spins up the ephemeral `db-test` Postgres service for API feature tests, then the full
`docker compose` stack (reset to the same deterministic fixtures) for the three Playwright
journeys: view/export the chart, edit a master and see chart + history update, and add a 兼務
posting and see its chip appear in the target department.

To run a layer individually:

```bash
npm test --workspace=@org-chart/domain     # domain unit tests
npm test --workspace=@org-chart/api        # API feature tests (needs db-test - see below)
npx playwright test --config=apps/web/playwright.config.ts   # E2E (needs the full stack running)
```

```bash
npm run test:db:up --workspace=@org-chart/api    # start the ephemeral db-test service
npm run test:db:down --workspace=@org-chart/api  # tear it down
```

## Constraints honored

- **Free DBMS** - PostgreSQL.
- **Additive schema only** - master-table changes add columns rather than modifying existing ones.
- **UTF-8 output** - the chart and PDF render Japanese correctly.
- **Originals untouched** - `TryOutProgram/*.xlsx` are read-only reference; `data/*.xlsx` are the
  working copies actually imported.
