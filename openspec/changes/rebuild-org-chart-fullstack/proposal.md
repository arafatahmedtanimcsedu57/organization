## Why

The current solution is a minimal `tsx` script that reads the xlsx masters and emits a static HTML file. It only covers Requirements 1, 2, and a partial 4, and it cannot demonstrate real application-engineering: no persistence, no maintenance UI, no change history, no live concurrent-duties (兼務) data. This change replaces that throwaway generator with a **full-stack NestJS + React + PostgreSQL application** that implements **all four** assignment requirements — turning the two optional requirements (maintenance UI with history, and a working 兼務 model) into shipped features rather than a design note.

## What Changes

- **BREAKING — remove the existing implementation.** Delete the `tsx` pipeline (`src/*.ts`, `scripts/seed-assignments.ts`), the static-HTML output path, and the flat `data/*.xlsx` runtime dependency. The old `docs/*` design notes are kept for reference; runtime code is replaced wholesale.
- **Add a NestJS backend** (`apps/api`): TypeORM entities, migrations, REST API, and a Puppeteer-based PDF export, backed by **PostgreSQL** running under **Docker Compose**.
- **Add a React SPA** (`apps/web`): an interactive, printable org-chart view plus an admin area for maintaining employees, departments, and concurrent duties, with a change-history browser.
- **Commit to the Organo Admin (Shopify / Polaris-style) design language** as the single visual system for the SPA — chosen over the Blueprint and Constructivist studies because Requirement 3 *is* an admin, so a product-grade commerce-admin aesthetic is the most faithful fit. The validated indented tree-of-cards chart (color-coded branch rails, tiered division/department/group cards, sourced 兼務 chips) becomes the chart component's spec.
- **Import the provided masters into the database** via a seed step, so the app runs from a real datastore instead of parsing xlsx at request time.
- **Implement concurrent duties (兼務)** as a first-class `assignments` relation that feeds the `(兼)` markers on the chart — Requirement 4 becomes real, not just a proposal.
- **Implement change history** as an append-only audit trail over every master edit, honoring the "add columns, don't modify" precaution.
- **Provide reproducible setup in one command**: a single `docker compose up` brings up the **database, API, web app, and an automatic seed/import** — no second step, no local installs. This single command *is* the "prepare and provide instructions for the dev environment" Requirement 2 asks for.
- **Add an automated test suite keyed to features and user journeys**: domain unit tests, per-capability API feature tests, and Playwright end-to-end tests that drive the three user journeys (view + export chart; edit a master → history → chart updates; add a 兼務 → chart), runnable headless in one command / in CI.

## Capabilities

### New Capabilities

- `data-import`: One-command import that loads the provided `sys_user` and `cmn_department` xlsx masters into PostgreSQL, normalizing encoding/full-width titles and seeding the initial concurrent-duty rows.
- `org-chart`: Builds the department tree (parent-by-name + title rank), orders each roster, disambiguates shared last names, and serves both an interactive React view and a print-ready A3 PDF (server-rendered via Puppeteer). Covers Requirements 1 & 2.
- `master-data-management`: REST API + React admin UI to create, read, update, and deactivate employees and departments, using additive schema changes only. Covers Requirement 3 (maintenance).
- `change-history`: An append-only audit trail recording every create/update/deactivate on the masters (who/when/before/after), browsable in the UI. Covers Requirement 3 (history).
- `concurrent-duties`: A `user_department_assignments` relation modeling primary + concurrent (兼務) postings per person, with CRUD and per-department titles that render as `(兼)` on the chart. Implements Requirement 4.
- `design-system`: The Organo Admin (Shopify / Polaris-style) design language for the SPA — centralized tokens, a shared component set (app shell, cards, badges, banners, index table), and the chart presentation rules (indented tree of department cards, color-coded branch rails that terminate at the last child, tiered division/department/group styling, sourced 兼務 chips, Tree ⇄ Network views, and print/PDF that expands every roster in full). Governs how Requirements 1–4 are surfaced to the user.
- `quality-assurance`: The test coverage the deliverable must meet — pure-domain unit tests, per-capability API feature tests, and Playwright end-to-end tests for the three user journeys — plus the requirement that the whole suite runs deterministically in one command / headless in CI against seeded fixtures.

### Modified Capabilities

<!-- None. This is a greenfield OpenSpec setup (no existing specs); the removal of the prior tsx implementation is captured under Impact, not as a spec-requirement change. -->

## Impact

- **Removed code:** `src/buildOrg.ts`, `src/renderHtml.ts`, `src/readMasters.ts`, `src/config.ts`, `src/model.ts`, `src/index.ts`, `src/buildOrg.test.ts`, `scripts/seed-assignments.ts`, and the `npm run chart` script.
- **New structure:** monorepo with `apps/api` (NestJS) and `apps/web` (React), plus `docker-compose.yml` and TypeORM migrations.
- **New dependencies:** `@nestjs/*`, `typeorm`, `pg`, `puppeteer`, React + build tooling (Vite), a validation lib (`class-validator`/`zod`), and test tooling (`vitest`/`jest` + `supertest` for API, `@playwright/test` for E2E). Adds a Docker requirement for the reviewer, met by a single `docker compose up` that runs db + api + web + seed.
- **Data:** PostgreSQL becomes the system of record; the xlsx files are used only as the import source. Output remains UTF-8 and printable (PDF), per the precautions.
- **Constraints honored:** free DBMS (PostgreSQL); additive-only schema changes; UTF-8 Japanese output; provided data used only for this project.
- **Preserved:** `TryOutProgram/` originals are never modified; `docs/assignment-understanding.md` and `docs/concurrent-duties-design.md` remain as background.
