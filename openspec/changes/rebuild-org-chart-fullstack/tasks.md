## 1. Repository & tooling foundation

- [ ] 1.1 `git init` and commit the current state so the legacy implementation is recoverable (rollback baseline)
- [ ] 1.2 Set up npm workspaces monorepo with `apps/api`, `apps/web`, `packages/domain`
- [ ] 1.3 Add root tooling: TypeScript config, ESLint/Prettier, `.gitignore`, `.env.example`
- [ ] 1.4 Write `docker-compose.yml` (PostgreSQL 16 + api service, healthchecks, named volume)
- [ ] 1.5 Verify `docker compose up` starts Postgres and the api container connects

## 2. Shared domain package (`packages/domain`)

- [ ] 2.1 Define framework-free types (`Employee`, `Department`, `Assignment`, `OrgNode`, `BuildWarning`)
- [ ] 2.2 Port tree-build (parent-by-name, 4 roots, orphan warning) from the legacy `buildOrg.ts`
- [ ] 2.3 Port rank ordering + manager/staff split and title normalization (`主任２`→`主任2`)
- [ ] 2.4 Port last-name disambiguation and display-override logic
- [ ] 2.5 Add concurrent (兼務) placement so `(兼)` postings render in their department, carrying source dept + title for the sourced chip
- [ ] 2.6 Port/extend unit tests; `packages/domain` passes `npm test` with no framework deps

## 3. Persistence layer (NestJS + TypeORM + Postgres)

- [ ] 3.1 Scaffold the NestJS app in `apps/api` with config module reading DB env vars
- [ ] 3.2 Define entities: `Department`, `Employee`, `Assignment`, `ChangeLog` (per design ER)
- [ ] 3.3 Generate the initial TypeORM migration and run it against Postgres
- [ ] 3.4 Add repositories/providers and confirm the schema matches the additive-only design

## 4. Data import (capability: data-import)

- [ ] 4.1 Build an import command/service using SheetJS to read the `TryOutProgram` masters (seed-time only)
- [ ] 4.2 Normalize titles/department names and repair known mojibake (`å¥³`→`女`) on import
- [ ] 4.3 Upsert employees by `Sys ID` and departments by `ID` (idempotent, re-runnable)
- [ ] 4.4 Seed the three verifiable 兼務 assignment rows
- [ ] 4.5 Collect and expose import warnings (unmatched departments, phantom names)
- [ ] 4.6 Verify counts after import: 20 departments, 4 roots, 95 employees, 3 concurrent

## 5. Org-chart API (capability: org-chart)

- [ ] 5.1 Implement `OrgChartService` that loads rows and delegates to `packages/domain`
- [ ] 5.2 Add `GET /chart` returning the department tree + ordered rosters as JSON (branch/tier metadata included)
- [ ] 5.3 Add `GET /chart/warnings` exposing build/data warnings
- [ ] 5.4 Add integration tests covering hierarchy, rank order, disambiguation, and `(兼)` placement

## 6. PDF export (capability: org-chart)

- [ ] 6.1 Add Chromium + `fonts-noto-cjk` to the api Docker image
- [ ] 6.2 Implement `GET /chart/pdf` via Puppeteer rendering the SPA `/chart?print=1` route (A3 landscape)
- [ ] 6.3 Verify the PDF renders Japanese correctly (no tofu), expands every roster in full, and marks `(兼)` distinctly

## 7. React SPA foundation (`apps/web`)

- [ ] 7.1 Scaffold React + Vite + TypeScript with React Router routes (`/`, `/chart`, `/admin/*`, `/history`, `/settings`)
- [ ] 7.2 Set up RTK Query API client (server state) and Zustand store (UI state: filters, selection, print/view mode)
- [ ] 7.3 Wire the dev proxy to the NestJS API and add a root layout placeholder the shell will fill

## 8. Design system foundation (capability: design-system — Organo Admin / Shopify-style)

- [ ] 8.1 Define design tokens as CSS variables (color, type, spacing, radius, shadow) — port from `ui_design/shopify/styles.css`; single source, no per-component overrides
- [ ] 8.2 Load Figtree (UI) + Noto Sans JP (Japanese) with system fallbacks; bundle/self-host so the PDF renderer has the fonts offline
- [ ] 8.3 Build the app shell: left nav (Home · Org chart · Employees · Departments · Concurrent duties · Change history · Settings) + top bar (search, notifications, account)
- [ ] 8.4 Build the core component set: Card, Badge (success/info/warn/critical + kenmu), Banner, Button (primary/secondary/plain), IndexTable
- [ ] 8.5 Add the contextual save bar plus shared loading / empty / error states
- [ ] 8.6 Accessibility & motion pass: visible focus rings, `prefers-reduced-motion`, color-contrast check
- [ ] 8.7 Baseline A3-landscape print stylesheet (hide shell/nav/actions, white background, expand content)

## 9. Interactive chart tree component (capabilities: org-chart + design-system)

- [ ] 9.1 Build the recursive tree-of-cards from the `/chart` JSON: department card + rank-ordered roster lines
- [ ] 9.2 Apply the spacing rhythm (large gap between top-level divisions, tighter gap between siblings) so no cards touch, and connector rails that terminate at the last child
- [ ] 9.3 Color-code each division branch: rail + card accent stripe + node marker cascade to the whole subtree
- [ ] 9.4 Tier styling: division vs. department vs. group cards (tinted header + larger name for divisions)
- [ ] 9.5 Render roster lines: position label + wrapped 課員 grid; disambiguated names (given-name initial) and location tags (`【大阪】`)
- [ ] 9.6 Render 兼務 as a sourced chip (dashed connector → chip naming source dept + title), visually distinct from primary members
- [ ] 9.7 Oversized-roster truncation with an expand affordance (`＋N 課員`) in the interactive view only
- [ ] 9.8 Print mode: `?print=1` expands every roster in full (no truncation) and applies the A3 print CSS — this is the route the PDF endpoint (6.2) renders
- [ ] 9.9 Network view: nodes + reporting lines + dashed 兼務 arrows, with an in-place Tree ⇄ Network switch
- [ ] 9.10 Legend + data-issues strip, and a "Download PDF" action calling `GET /chart/pdf`

## 10. Master maintenance UI (capability: master-data-management)

- [ ] 10.1 Employees CRUD API (create/read/update/deactivate) with `class-validator` DTOs
- [ ] 10.2 Departments CRUD API including parent selection and cycle prevention
- [ ] 10.3 Employees admin UI: IndexTable list + create/edit panel + deactivate, via RTK Query
- [ ] 10.4 Departments admin UI: list, create, edit (parent picker), deactivate
- [ ] 10.5 Wire the contextual save bar (Unsaved → Save/Discard) and validation errors into the edit panels
- [ ] 10.6 Verify edits are reflected in the chart after regeneration; deactivation is non-destructive

## 11. Concurrent duties (capability: concurrent-duties)

- [ ] 11.1 Assignments CRUD API with per-department title, `is_primary`, `assignment_type`, `valid_from/valid_to`
- [ ] 11.2 Enforce exactly one primary posting per person; reject a second primary
- [ ] 11.3 Assignments admin UI to add/edit/remove concurrent postings
- [ ] 11.4 Verify a new concurrent posting appears on the chart with the sourced `(兼)` chip in the target department

## 12. Change history (capability: change-history)

- [ ] 12.1 Implement an audit interceptor / TypeORM subscriber writing `ChangeLog` on every create/update/deactivate
- [ ] 12.2 Capture actor, timestamp, action, and before/after JSON for employees, departments, and assignments
- [ ] 12.3 Add read-only `GET /history` (filter by entity + time); ensure no edit/delete path exists
- [ ] 12.4 Build the history browser UI (per-entity, reverse-chronological, shows what changed)

## 13. Cleanup, docs & verification

- [ ] 13.1 Remove legacy code: `src/*.ts`, `src/buildOrg.test.ts`, `scripts/seed-assignments.ts`, and the `npm run chart` script
- [ ] 13.2 Update `README.md` with the Docker one-command setup and a maintainer guide (satisfies Req 2)
- [ ] 13.3 End-to-end check: `docker compose up` → import → chart JSON → PDF → an edit → history entry → chart reflects it
- [ ] 13.4 Confirm constraints: free DBMS, additive schema only, UTF-8 output, originals in `TryOutProgram/` untouched
