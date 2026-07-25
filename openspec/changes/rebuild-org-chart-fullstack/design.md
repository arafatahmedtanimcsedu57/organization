## Context

Today the org chart is produced by a small `tsx` script (`readMasters → buildOrg → renderHtml`) that parses xlsx at runtime and writes a static HTML file. It has no persistence, no UI, and no history, so it can only satisfy Requirements 1, 2, and a partial 4. This change rebuilds the solution as a full-stack application to (a) satisfy **all four** requirements and (b) demonstrate application-engineering depth in the stack the author works in daily: **Node.js, NestJS, React**.

Fixed constraints from the brief that shape the design:

- **Free DBMS only** → PostgreSQL (open source).
- **Add columns, don't modify existing ones** on the masters → additive schema + a separate audit table; concurrent duties live in a *new* relation, never as extra columns on `sys_user`.
- **UTF-8, Japanese-capable output** → UTF-8 everywhere; the PDF renderer must ship CJK fonts.
- **Maintainable by someone other than the author** → one-command Docker setup + documented API/UI.

The domain rules (department-tree hierarchy, title-rank ordering, last-name disambiguation, `(兼)` markers, location tags, full/half-width title normalization, and the known data-drift gaps) are already understood and documented in `docs/assignment-understanding.md` and `docs/concurrent-duties-design.md`; this design carries them forward into a persisted model.

## Goals / Non-Goals

**Goals:**

- A NestJS REST API + React SPA + PostgreSQL, orchestrated by Docker Compose, runnable with `docker compose up`.
- Implement all four requirements: printable chart (1&2), master CRUD UI (3), change history (3), and a working concurrent-duties model (4).
- Keep the proven domain logic (tree build, rank ordering, name disambiguation) as a **pure, unit-tested service** independent of HTTP/DB frameworks.
- Server-rendered, print-ready **A3 landscape PDF** plus an interactive in-browser chart.
- Clean, conventional architecture a reviewer can navigate quickly.

**Non-Goals:**

- Authentication/authorization beyond a single-role admin stub (the brief does not ask for it; called out as an open question).
- Real-time collaboration, multi-tenant, or i18n of the admin UI (labels stay JP with EN where the legend provides it).
- Reproducing the legacy Excel layout pixel-for-pixel - the brief explicitly allows any printable format.
- Editing the original `TryOutProgram/` files; they are read-only import sources.

## Decisions

### 1. Monorepo: npm workspaces (`apps/api`, `apps/web`, `packages/domain`)

```text
organization_chart/
├─ docker-compose.yml         # postgres + api + web + seed - one `docker compose up`
├─ apps/
│  ├─ api/                    # NestJS
│  └─ web/                    # React + Vite
└─ packages/
   └─ domain/                 # framework-free org-chart logic + types (shared)
```

The org-chart build rules go in `packages/domain` so they stay pure and testable and can be reused by both the chart service and the PDF renderer. **Alternative considered:** two separate repos - rejected; a single workspace is easier for a reviewer to clone and run, and lets the API import the domain package directly.

### 2. PostgreSQL 16 + TypeORM (entities + migrations)

TypeORM is the NestJS-idiomatic ORM (decorator entities, DI-friendly repositories, first-class migrations). **Alternative considered:** Prisma - great DX, but a second schema language and generator; TypeORM keeps the model in TypeScript next to the Nest modules.

**PostgreSQL over SQLite - resolved.** Both are free and the dataset is tiny (95 employees / 20 departments), so this is not a performance call. Data-modeling depth (entities, migrations, the audit subscriber) is demonstrated via TypeORM on *either* engine; the one thing Postgres adds is a real client/server DB orchestrated in Docker. We keep **PostgreSQL** because (a) the project is a skill showcase, (b) the audience is a software company that will have Docker, and (c) the submission includes a demo video, so any run-friction is cushioned - **and** the friction is removed outright by Decision #9: a single `docker compose up` brings the DB up in a container, so no reviewer ever installs Postgres. The `change_log.before/after` columns use Postgres **`jsonb`** (a genuine engine-specific dependency), which is another reason not to pretend the app is DB-portable - we commit to Postgres, single-engine.

### 3. Data model - additive, with a separate audit log

```text
departments            employees                 assignments (兼務)          change_log (audit)
───────────            ─────────                 ──────────────────          ────────────────
id (24100…) PK         sys_id PK                 id PK                        id PK
name                   user_id                   employee_sys_id FK          entity ('employee'|'department'|'assignment')
parent_name  ─┐self    last_name, first_name     department_id  FK           entity_id
head          │        title                     title (per-dept)            action ('create'|'update'|'deactivate')
sys_id        │        department_id FK (home)   is_primary  bool            actor
active        │        active bool               assignment_type            changed_at
              └───────────────────────────────── valid_from / valid_to      before jsonb / after jsonb
```

- **Concurrent duties** are rows in `assignments`, never extra columns on `employees` - this is the additive-schema requirement made concrete and the core of Requirement 4. `is_primary` marks the home posting; `assignment_type = concurrent` rows render with `(兼)`. `valid_from/valid_to` give 兼務 postings their own effective-dating.
- **Change history** = an append-only `change_log` table capturing `before`/`after` JSON snapshots. **Alternative considered:** TypeORM temporal tables / soft-delete versioning - rejected as heavier and less transparent than an explicit audit row a reviewer can read. A Nest **interceptor / TypeORM subscriber** writes the log on every write so controllers don't repeat themselves.
- **`active` flags** implement non-destructive "delete" (deactivate), consistent with the audit-first philosophy.

### 4. NestJS module layout (feature modules over a shared domain service)

```text
apps/api/src/
├─ import/         # ImportModule   → data-import capability (SheetJS at seed time)
├─ departments/    # CRUD + tree
├─ employees/      # CRUD
├─ assignments/    # 兼務 CRUD
├─ org-chart/      # OrgChartService (uses packages/domain) + /chart, /chart/pdf
├─ history/        # read-only change_log API
└─ common/         # audit interceptor, DTO validation, error filters
```

Controllers stay thin; DTOs are validated with `class-validator` + a global `ValidationPipe`. The `OrgChartService` composes persisted rows and delegates ordering/disambiguation to `packages/domain`.

### 5. PDF export via Puppeteer rendering the real chart route

`GET /chart/pdf` launches headless Chrome, navigates to the SPA's `/chart?print=1` route (same React component as the interactive view, print CSS applied), and prints A3 landscape. **Alternative considered:** a separate server-side HTML template for print - rejected to avoid a second chart renderer drifting from the React one; single source of truth wins. **Trade-off:** the API image must include Chromium + **Noto Sans CJK JP** fonts (see Risks).

### 6. React SPA: Vite + TypeScript, RTK Query for server state, Zustand for local UI

- **Vite** for fast dev/build; **React Router** for `/chart`, `/admin/employees`, `/admin/departments`, `/admin/assignments`, `/history`.
- **State:** RTK Query owns all server data/caching/mutations (auto-invalidation after edits); **Zustand** holds ephemeral parent↔child UI state (filters, selection, print mode). This mirrors a clean separation of server vs UI state.
- **Chart rendering:** a custom CSS **indented tree of department cards** - color-coded branch rails, tiered division/department/group cards, and connector rails that terminate at the last child - driven by the API's `OrgNode` JSON (the same shape the domain package produces). This layout was **validated against the full dataset** in the `ui_design/shopify` study: five nesting levels stay legible and the widest rosters wrap cleanly, so **open question #4 is resolved - plain CSS suffices, no D3/graph dependency.** The **same React component** renders both the interactive view and the PDF; the only difference is CSS. The interactive view MAY collapse an oversized roster behind an expand affordance (`＋32 課員`); the print stylesheet expands every roster in full so the PDF omits no one. So the two are the *same source with the same data*, not byte-identical output - see the `design-system` spec ("Preserve complete rosters when printing").

### 7. Import & normalization at seed time

The `data-import` capability uses **SheetJS** (dev/seed-time only, not in the request path) to read the provided masters, normalizes full-width digits in titles (`主任２→主任2`) and department names, repairs known mojibake, seeds the initial `assignments` (the three verifiable 兼務 rows), and records unmatched names / phantoms as **import warnings** rather than failing. Idempotent (upsert by `sys_id` / department `id`).

### 8. Design language: Organo Admin (Shopify / Polaris-style) - the single visual system

Three finished design studies exist under `ui_design/` - **Blueprint** (drafting-table), **Constructivist** (Swiss × JP poster), and **Organo Admin** (Shopify / Polaris). The SPA commits to **Organo Admin**. **Why:** Requirement 3 *is* a maintenance admin, so a commerce-admin aesthetic (app shell, index tables, status badges, contextual save bar, banners) is the most faithful and lowest-risk fit - the mockup is already a near-preview of `apps/web`. The other two studies remain in-repo as design provenance, not as build targets.

Implementation is a **token-first** design system (`packages` or `apps/web/src/design`): color / type / spacing / radius / shadow tokens defined once (CSS variables), then a small component set (app shell, card, badge, banner, index table, buttons) consumed by every screen. The chart's presentation rules - indented tree, branch colors, tier styling, sourced 兼務 chips, Tree ⇄ Network switch, print-expands-all - live in the `design-system` spec so they are testable, not just visual taste. **Alternative considered:** a component library (MUI / Chakra / Polaris React) - rejected; the surface is small and bespoke, and hand-rolled tokens keep the bundle lean and the aesthetic exact.

### 9. One-command orchestration - `docker compose up` = db + api + web + seed

A **single `docker compose up`** stands up the entire application: the Postgres container, the NestJS API, the React web app, and an automatic seed/import - no second command, no manual migration or seed step, no local installs. This *is* the "prepare and provide instructions for the dev environment" that Requirement 2 asks for, reduced to one line.

```text
   docker compose up
        │
        ├─ db    (postgres:16)   ── healthcheck: pg_isready ──┐
        ├─ api   (nest)          ── depends_on: db healthy ◀──┤ waits
        │        entrypoint: run migrations → run seed/import (idempotent) → start
        └─ web   (vite build → static/nginx, or vite preview) ── depends_on: api
```

- **Ordering:** `depends_on` + a Postgres **healthcheck** so the API never races the DB; the API entrypoint runs **migrations then the seed** before serving.
- **Seed is idempotent** (upsert by `sys_id` / department `id`), so re-running `docker compose up` is safe and re-import doesn't duplicate rows.
- **No local-Postgres fallback.** The earlier "documented non-Docker path" is dropped - it added friction rather than removing it. Docker is the single blessed path.
- **Env:** one `.env` (with `.env.example`) drives DB credentials and ports; sensible defaults so `up` works with zero editing.

### 10. Testing strategy - a pyramid keyed to features and user journeys

Tests are organized in three tiers so that both *features* (capability behaviors) and *user interactions* (end-to-end journeys) are covered, and the whole suite runs headless in one command / in CI.

```text
        ╱╲        E2E journeys (Playwright, browser)  ── the 3 user journeys A/B/C
       ╱  ╲       ── view+export chart · edit→history→chart · add 兼務→chart
      ╱────╲      API feature tests (Nest e2e / supertest) ── one per capability:
     ╱      ╲     ── org-chart JSON · CRUD+validation · 兼 rules · history immutability
    ╱────────╲    Domain unit tests (framework-free) ── tree/rank/disambig/兼 placement
```

- **Domain unit** (`packages/domain`): pure, fast, no DB - the rules from the legacy tests, extended.
- **API feature** (`apps/api`): boot the Nest app against an ephemeral test Postgres (a Compose service / throwaway schema), seeded with deterministic fixtures; assert each capability's key scenarios and its failure paths (missing dept, cycle, second primary, attempt to mutate history).
- **E2E journey** (`apps/web` via **Playwright**): drive the real UI for the three journeys and assert observable outcomes (chart reflects an edit; a history row appears; a 兼 chip shows up; Download PDF returns a valid A3 PDF). **Alternative considered:** Cypress - Playwright chosen for multi-browser + first-class headless-in-Docker and its trace viewer. The coverage bar itself is pinned in the `quality-assurance` spec so it's a requirement, not an afterthought.

## User interaction & journey

**Navigation / interaction map** - one app shell (left nav + top bar) hosts every screen:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Organo Admin  ▸ top bar: global search · notifications · account       │
├───────────────┬──────────────────────────────────────────────────────┤
│  LEFT NAV      │   ROUTE / SCREEN (React Router)                       │
│  ───────────   │                                                       │
│  Home          │ /            dashboard: metrics · setup · data issues │
│  Org chart  ◀──┼─ /chart      Tree ⇄ Network · legend · Print/Export   │
│  Employees     │ /admin/employees      index table + create/edit panel │
│  Departments   │ /admin/departments    index table + parent picker     │
│  Concurrent 兼 │ /admin/assignments    兼務 CRUD (primary + concurrent) │
│  Change history│ /history     append-only audit, reverse-chronological  │
│  Settings      │ /settings                                             │
└───────────────┴──────────────────────────────────────────────────────┘
```

**Journey A - View & export the chart (the primary read path):**

```text
Home ──▶ Org chart ──▶ [Tree view]  ──toggle──▶ [Network view]
                          │                         │
                          │  hover card → elevate    │ hover node → highlight
                          │  click 兼 chip → trace    │ dashed arrow → source dept
                          ▼                         ▼
                    "Export PDF" ───▶ GET /chart/pdf (Puppeteer, A3 landscape)
                          │
                          ▼
                 PDF with EVERY roster expanded (no ＋N truncation), 兼 marked
```

**Journey B - Maintain a master and see it flow through (the write path):**

```text
Employees ─▶ pick a row ─▶ Edit panel ─▶ change Title / Department ─▶ [Save]
     │                                                                  │
     │                          contextual save bar (Unsaved ▸ Save/Discard)
     ▼                                                                  ▼
  validation (class-validator)                              audit interceptor writes
  reject if dept missing / cycle                            change_log(before→after, actor, ts)
     │                                                                  │
     └───────────────────────────┬──────────────────────────────────────┘
                                  ▼
                    Org chart re-renders with the edit
                                  │
                                  ▼
                    Change history shows the new entry (who/when/what)
```

**Journey C - Add a concurrent duty (兼務 - Requirement 4 made real):**

```text
Concurrent duties ─▶ "Add posting" ─▶ pick person · target dept · per-dept title
        │                                    │
        │              enforce: exactly one PRIMARY posting per person
        │              this one = concurrent (assignment_type=concurrent)
        ▼                                    ▼
   Save ─▶ audit logged ─▶ Org chart target dept now shows the sourced 兼 chip
                                    (e.g. 購買調達部 ← 照沼 / 山田)
```

These three journeys map one-to-one onto the capabilities: **A** exercises `org-chart` + `design-system`; **B** exercises `master-data-management` + `change-history`; **C** exercises `concurrent-duties`. Every write path funnels through the audit interceptor, so history is a side effect of editing, never a separate step the user must remember.

## Risks / Trade-offs

- **Headless Chrome needs Japanese fonts in Docker** → without CJK fonts the PDF shows tofu (□). *Mitigation:* install `fonts-noto-cjk` in the API image; pin the Puppeteer/Chromium version.
- **Puppeteer bloats the image and can be flaky in CI** → *Mitigation:* use `puppeteer-core` + the system Chromium from the base image; add a healthcheck; keep PDF generation behind a single endpoint with a timeout.
- **Scope is large for a take-home** → *Mitigation:* build in the tasks order (foundation → import → chart → PDF → CRUD → history → 兼務), each independently demoable; core Requirements 1&2 land first so there is always a working artifact.
- **Data drift (芹澤 / 岡本 / 河合 phantoms; 田崎 vs 田﨑)** → *Mitigation:* surface as import warnings and a UI "data issues" panel - the app *diagnoses* the exact drift the brief complains about instead of hiding it.
- **`ソリューション営業部` missing from `cmn_department`** → design decision needed at import (see Open Questions); default is to render its 課 under `営業本部` and warn.
- **Reviewer must have Docker** → *Mitigation:* a single `docker compose up` brings up db + api + web + seed with **no local installs**; the audience is a software company (Docker expected) and the submission includes a demo video, so run-friction is low. The old "local Postgres" fallback is dropped - it added friction, not less (Decision #9).

## Migration Plan

This is a greenfield rebuild with **no production data**, so "migration" means replacing the codebase, not migrating live records.

1. **Initialize git** (repo is currently untracked) so the old implementation is recoverable - this is the rollback strategy.
2. Scaffold the monorepo (`apps/api`, `apps/web`, `packages/domain`) and a `docker-compose.yml` that brings up db + api + web + seed in one command.
3. Port the pure domain logic from the old `buildOrg.ts`/`config.ts` into `packages/domain` with its tests.
4. Stand up Postgres + TypeORM migrations + the auto-seed/import (run by the API entrypoint on `up`); verify counts (20 departments, 4 roots, 95 employees, 3 兼務).
5. Build features in tasks order; delete the old `src/*.ts` and `scripts/` and the `npm run chart` script once the chart endpoint reaches parity.
6. **Rollback:** revert to the pre-change git commit; the removed files remain in history.

## Open Questions

- **`ソリューション営業部`:** add it as a real department (parent `営業本部`, reparent 1課/2課) so 佐藤(悠)'s 部長 兼務 can be modeled - or keep the master as-is and only warn? (Leaning: add it, since the app now *owns* the data and this fixes a real gap.)
- **Auth:** ship a single admin stub, or leave the admin routes open for the demo? (Leaning: stub login, since maintenance edits imply an actor for the audit `actor` field.)
- **History coverage:** confirm `change_log` should also record `assignments` (兼務) edits, not just employees/departments. (Leaning: yes.)
- ~~**Chart library:** revisit a D3/graph library only if the custom CSS tree can't handle the widest department (the big ITサポート roster) cleanly in A3.~~ **Resolved:** the `ui_design/shopify` study validated the CSS indented tree against the full dataset (5 levels legible, wide rosters wrap cleanly) - no graph library; see Decision #6.
- ~~**Design theme:** Blueprint vs. Constructivist vs. Organo Admin for the SPA.~~ **Resolved:** Organo Admin (Shopify / Polaris) - see Decision #8.
- **Roster truncation threshold:** at what roster size does the interactive view collapse to `＋N 課員` (fixed count, or fit-to-card)? Print always expands fully; only the interactive threshold is open.
