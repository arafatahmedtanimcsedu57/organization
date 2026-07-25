# Presentation Video Script

Formal English script for the Syslabo take-home submission video. Read section by section;
bracketed notes are stage directions (what to click/show), not spoken text.

---

## 1. Introduction

Good morning. My name is [Your Name], and this is my submission for the organization chart
automatic output application requested by Syslabo Corp.

Before I walk through the solution, I want to briefly restate the brief as I understood it, so
it's clear how my implementation maps back to it.

Syslabo's request had four parts. The first two were required: build an application that
automatically generates a printable organization chart from the `sys_users` and
`cmn_department` masters, reproducing the hand-made chart you currently maintain in Excel; and
make sure that application is simple enough for someone other than me to maintain and extend.

The remaining two parts were explicitly marked as optional. The third was a simple maintenance
UI for the two masters, ideally with change-history tracking. The fourth was, in the brief's own
words, a design proposal only — "implementation is not required" — for how to model concurrent
duties, or 兼務 (Kenmu), since a person in `sys_users` can only belong to a single department
today.

What I actually delivered covers all four. Requirements 1 and 2 are the chart generator itself
and a one-command reproducible environment. But I chose to go further on 3 and 4, and I want to
explain why, because that decision shaped a lot of the architecture I'll show you.

For requirement 3, I didn't just sketch a maintenance screen — I built a full CRUD admin area
for employees, departments, assignments, and titles, with every create, update, and deactivate
automatically written to an append-only change log that you can browse and filter by entity and
time. I did this because the brief's own background section describes the real pain point:
masters drift out of sync with the hand-made chart because there's no application enforcing
consistency and no record of what changed. A design note wouldn't have fixed that; a working
maintenance UI does.

For requirement 4, the brief only asked for a design proposal, and I did write one first — it's
in `docs/concurrent-duties-design.md`. But once I had the schema designed, implementing it was a
small incremental step on top of the maintenance UI I'd already built for requirement 3, so I
went ahead and implemented it fully: concurrent duties are a real, first-class relation in the
database today, not just a proposal on paper. I'll show you a `(兼)` posting being created live
in the admin UI and its chip appearing on the chart in real time.

My reasoning for extending scope on both was the same: the two optional requirements aren't
separate features, they're the actual fix for the two root problems Syslabo described — manual,
drifting data, and an unrepresentable real-world concept. Solving requirement 1 alone would have
reproduced the chart once; solving 3 and 4 as well means the chart stays correct as the
organization keeps changing.

---

## 2. Technology stack, and why I chose it

Let me walk through the stack before I show the architecture, so the "why" is clear before you
see the "what."

**React**, on the frontend. The application is highly interactive — an infinitely pannable,
zoomable chart, inline editing drawers, and several CRUD screens — which is a natural fit for a
component-based UI library with a large ecosystem. It also directly serves requirement 2:
React's ecosystem and conventions are widely known, so a future maintainer who isn't me has the
best odds of being able to pick this up quickly.

**Redux Toolkit — specifically RTK Query**, for all server-state management. Every piece of data
that comes from the API — the chart itself, employees, departments, assignments, titles, and the
change history — is fetched and cached through an RTK Query API slice. I chose RTK Query over
hand-rolled `fetch` calls or plain Redux slices because it removes almost all of the repetitive
loading/error/caching boilerplate: each resource gets one small file that declares its endpoints,
and RTK Query handles the request lifecycle, caching, and refetching automatically. That
consistency matters for maintainability too — adding a seventh resource tomorrow means copying
the pattern of an existing slice, not inventing a new one.

**Caching** is tag-based, not time-based. Each list query is tagged, mutations invalidate the
exact row plus a shared list tag, and RTK Query refetches automatically wherever that tag is in
use. I chose tag invalidation over polling because this data only changes when a user explicitly
edits it — there's no reason to poll on an interval. The one deliberate exception is the chart
itself: chart data is derived from three other resources, so I invalidate its cache tag
explicitly after any department, employee, or assignment save, rather than trying to model that
cross-resource dependency declaratively.

**Zustand**, for the small slice of state that isn't server data at all — specifically, whether
the app is in print mode, and light/dark theme. I deliberately kept this out of Redux. Redux Toolkit
is doing one job in this app — owning server state — and adding slice boilerplate for two
booleans would blur that. Zustand's API is minimal enough that this "app chrome" state stays a
five-line store, and the separation itself is documentation: if it's server data, it's in RTK
Query; if it's UI-only, it's in Zustand.

[Optional, if time allows: mention D3 briefly here as "and I'll cover the charting library, D3,
in the demo section, since it's easier to explain while you can see it running."]

---

## 3. Architecture

The project is a small monorepo with three packages.

**`apps/api`** is a NestJS REST API backed by PostgreSQL through TypeORM. I chose Postgres
because it satisfies the brief's constraint that any DBMS must be free of charge, and TypeORM
because it gives me migrations and a subscriber hook I rely on for the audit log, which I'll get
to in a moment.

The API exposes five controllers, matching the five things the app actually manages:
`OrgChartController` builds the chart itself — as JSON for the web app, and as a PDF export;
`EmployeesController`, `DepartmentsController`, and `AssignmentsController` are CRUD endpoints for
the three masters; and `HistoryController` is a deliberately read-only endpoint over the change
log — there's no route to edit or delete history, by design, because an audit trail you can edit
isn't an audit trail.

On startup, the API's own entrypoint waits for Postgres to become available, runs any pending
database migrations, and then imports and seeds the two Syslabo Excel masters — so bringing the
whole stack up is genuinely one command, with no manual seeding step, which again serves
requirement 2's "simple to maintain" bar.

The import step reads the original `sys_user.xlsx` and `cmn_department.xlsx` files with the same
SheetJS library the brief's data was exported with, normalizes the text — this is where I handle
things like the mojibake in the choice-values sheet and the full-width digit in `主任２` — and
upserts everything into Postgres idempotently, so re-running the import is always safe.

Every create, update, and deactivate against employees, departments, or assignments is captured
automatically by a TypeORM entity subscriber, which writes a row to a single append-only change
log table. I didn't have to remember to log anything in each controller — the subscriber
intercepts the ORM events directly, so the history feature can't silently fall out of sync with
the CRUD code.

For concurrent duties, an `Assignment` record carries an explicit `primary` or `concurrent` type,
plus a valid-from/valid-to date range, and the service layer enforces that a person can only ever
have one active primary posting — attempting to create a second is rejected outright. Concurrent
assignments are the ones that place a person into a second department's roster as a 兼務 posting.

### 3.1 Database schema

[Optional: show a migration file or an ER diagram on screen while narrating this part.]

I want to spend a moment on the schema itself, because it directly follows one of the brief's own
constraints: when changing `sys_users` or `cmn_department`, add columns rather than modifying
existing ones. Every migration I wrote honors that literally — nothing that mirrors the original
Excel masters was ever altered in place, only added alongside.

There are six tables. `departments` and `employees` mirror the two original masters closely.
`departments` is keyed by its own `id`, with a `parent_name` string that drives the tree exactly
the way the source `cmn_department.Parent` column does. `employees` is keyed by the 32-character
`sys_id` from `sys_user`, and holds a `department_id` foreign key for the person's single home
posting.

On top of those originals, I added two authoritative reference columns — never replacing the
free-text originals, only supplementing them. `departments` gained a nullable `head_sys_id`
foreign key into `employees`, so a department's head can be resolved by identity instead of by
matching a free-text name string, added in its own migration alongside the legacy `head` text
column. And both `employees` and `assignments` gained a `title_id` foreign key into a new `titles`
table, again alongside their original free-text `title` column.

`titles` is the managed position list — each row carries the numeric rank that drives roster
ordering and a flag marking rank-and-file positions. Which titles are valid in which department is
its own join table, `department_titles`, with a composite primary key and cascading deletes, so
removing a department or a title cleans up its links automatically.

`assignments` is the table that actually implements requirement 4. It's one row per
person-department posting — a home posting and every concurrent 兼務 posting are simply rows in
this same table, never extra columns on `employees`. Each row carries its own title, an
`is_primary` flag, an `assignment_type` of either `primary` or `concurrent`, and an optional
valid-from/valid-to date range. The one-active-primary-posting rule lives in the service layer
rather than as a database constraint, since it depends on that date range, not a static
uniqueness check.

Finally, `change_log` is the audit table behind requirement 3: a single append-only table for all
three masters, storing which entity and row changed, the action, an actor, a timestamp, and the
full before-and-after state as JSON — with no update or delete path exposed anywhere in the API.

The foreign keys' delete behavior was also a deliberate choice, not a default. Deleting an
employee cascades to their own assignment rows, since a posting has no meaning without the person
it belongs to; deleting a department or a title still in use is restricted outright — the
application deactivates those instead of hard-deleting them, which is why `departments`, `employees`,
and `titles` all carry an `active` flag. The one soft reference is `departments.head_sys_id`,
which simply clears to null if that employee is ever removed, rather than blocking the deletion.

**`packages/domain`** is a small, framework-free TypeScript package — no NestJS, no React — that
both the API and the web app depend on. It's the single source of truth for the business rules
that actually make this an "organization chart" and not just a data dump: building the
department tree from parent/child names, ordering each roster by position rank, disambiguating
people who share a last name, normalizing title strings, and placing concurrent assignments into
their target department. Keeping this logic framework-free and shared means the rules are defined
once, not once per app.

**`apps/web`** is the React single-page app — the chart itself, the admin area, and the history
browser — which I'll walk through directly in the browser next, since it's easier to show than
to describe.

---

## 4. Live walkthrough

[Switch to browser, navigate to the running app.]

### 4.1 The chart

This is the interactive organization chart, generated automatically from the current state of
the two masters — no hand-drawing involved.

A few things are happening here that go beyond just plotting boxes. The roster inside each
department is ordered automatically by position rank — Representative Director down to regular
staff — pulled from the managed title list, not hard-coded. Where two people share a last name,
the chart disambiguates them automatically with a parenthesized initial, exactly the convention
used in the original hand-made chart. And where someone holds a concurrent post in a second
department, you'll see a `(兼)` chip on their name in that second department, connected back to
their primary department with a dashed line — [click a kenmu chip / hover to show the link] —
that placement is derived entirely from the `Assignment` data, not drawn by hand.

There's also a warnings banner above the chart [point to `DataIssuesStrip`] that surfaces data
quality problems automatically — a department that doesn't resolve to a known parent, a title
that isn't in the managed list, an assignment referencing a department or employee that no longer
exists, and so on. This is the direct fix for the drift problem Syslabo described: instead of
someone noticing months later that the chart and the master data have quietly diverged, it's
flagged the moment the data goes stale.

### 4.2 How the chart is rendered — and D3's role specifically

The layout itself is computed with `d3-flextree`, a variant of D3's tree layout that supports
variable-sized nodes. I chose it over the standard `d3-hierarchy` tree layout because department
cards here aren't uniform boxes — they hold different numbers of people — and flextree is able to
pack sibling subtrees against each other's actual contours instead of spacing everything at a
fixed uniform width. On top of that I added custom logic for very wide parts of the org: it
collapses an overcrowded subtree into a compact vertical stack, and wraps rows of departments
downward instead of letting the chart run off the screen sideways.

Panning and zooming are handled by `d3-zoom`, bound through `d3-selection` to a plain container
element — this is a DOM and CSS layout, not a canvas or SVG scene graph; SVG is used only for the
connector lines between nodes. `d3-transition` drives the animated "fly to" behavior when you
search for a person and jump to their card [demonstrate the search box in the toolbar].

### 4.3 Editing directly from the chart

[Click a department node to open the editor drawer.]

Clicking any node opens an editing panel right here, without leaving the chart — I can rename a
department, add a sub-department, edit an employee, or add a new concurrent-duty posting for
someone. This reuses exactly the same API calls as the dedicated admin screens; the chart is just
another place they're exposed. After a save here, the chart's own cached data is explicitly
refreshed, so the change is reflected immediately.

### 4.4 Downloading the chart

[Click "Download PDF."]

This produces an A4, print-ready PDF — the format-agnostic, printable deliverable requirement 1
asked for.

I want to highlight something here, because the PDF and the page you've been looking at are not
the same rendering, and that's intentional. The web view is an interactive, infinitely pannable
canvas — that layout doesn't make sense on a fixed A4 page. So in print mode, the same React
application renders a different, purpose-built document layout: one division per page, bordered
department cards, a static roster list — no toolbar, no editing chrome, and none of the data
warnings banner, since that's a maintenance concern, not something that belongs on a distributed
chart.

The PDF itself is generated by launching a headless version of Chrome, through Puppeteer, and
pointing it at that same print-mode page — so the PDF is a real browser rendering of the same
React component, not a second, separately maintained template that could quietly drift from the
web view. I chose Puppeteer specifically for this reason: it guarantees the PDF has pixel-accurate
CSS and print pagination, and correctly shapes Japanese text, because it's a real browser engine
producing it — not a JavaScript-only PDF library trying to approximate one.

### 4.5 The admin area and history

[Navigate to `/admin`.]

This is the maintenance UI for requirement 3: Employees, Departments, Assignments, and Titles,
each as a simple list-and-edit screen. [Open the Assignments tab.] This is also where concurrent
duties are managed directly — creating an assignment as "concurrent" rather than "primary" is
what makes that `(兼)` chip appear on the chart.

[Navigate to `/admin/history`.]

And this is the change history: every create, update, and deactivate across those three masters,
in reverse chronological order, with a before-and-after view, filterable by entity and by date.
It's read-only by design — there's deliberately no way to edit or delete a history entry, because
an editable audit log defeats its own purpose.

[Optional: show `DATA_LANG=en` if reviewers may not read Japanese.] The chart data itself can
also be switched between the original Japanese and an English rendering with translated names,
titles, and department labels, purely by an environment variable at seed time — useful if a
reviewer or a future maintainer doesn't read Japanese.

---

## 5. Closing

To summarize: requirements 1 and 2 are fully met — the chart is generated automatically from the
live masters, and the whole stack comes up with a single command. Requirement 3 isn't just a
proposal, it's a working maintenance UI with a genuine, automatically-populated audit trail.
And requirement 4 went from a required design proposal to a fully working implementation, because
once the schema was designed, finishing it addressed the actual problem Syslabo described,
rather than just describing how it could be solved.

Thank you for reviewing my submission. I'm happy to answer any questions.

---

## Appendix: Diagrams

Screen-share these while narrating sections 3 and 3.1 above.

### System design

```
+------------------+
|  BROWSER (user)  |
+------------------+

          |
          | HTTP: loads the SPA, then fetch/XHR calls
          v

+----------------------------------------------------------------------------+
|  apps/web  --  React 19 + Vite SPA                                         |
|                                                                            |
|  Routes: /   /chart   /admin/employees   /admin/departments                |
|          /admin/assignments   /admin/titles   /admin/history               |
|                                                                            |
|  - RTK Query api slices    : server state + cache tags (chart,             |
|                              employees, departments, assignments,          |
|                              titles, history)                              |
|  - Zustand (uiStore/theme) : UI-only state (print mode, light/dark theme)  |
|  - D3 (flextree / zoom /   : chart layout, pan & zoom, animated            |
|       selection / transition)  'fit to node' on search                     |
+----------------------------------------------------------------------------+

                                       |
                                       | HTTP/JSON: /api/chart, /employees,
                                         /departments, /assignments, /titles, /history
                                       v

+---------------------------------------------------------------------------+
|  apps/api  --  NestJS REST API                                            |
|                                                                           |
|  OrgChartController   EmployeesController   DepartmentsController         |
|  AssignmentsController   TitlesController   HistoryController (GET only)  |
|                                                                           |
|  AuditSubscriber (TypeORM)                                                |
|      --writes--> change_log row on every create / update / deactivate     |
|                                                                           |
|  ChartPdfService                                                          |
|      --launches--> Puppeteer (headless Chrome)                            |
|           --GET--> http://web:5173/chart?print=1                          |
|           (renders <TopdownPrint> instead of <ChartCanvas>;               |
|            Puppeteer prints that page to an A4 PDF)                       |
+---------------------------------------------------------------------------+

                                      |
                                      | TypeORM (migrations on boot + queries at runtime)
                                      v

+--------------------------------------------------------+
|  PostgreSQL (Docker)                                   |
|                                                        |
|  departments | employees | titles | department_titles  |
|  assignments | change_log                              |
+--------------------------------------------------------+

         ^
         |
         | seed / import (SheetJS) once on every container start
         |

+----------------------------------------+
|  data/ja|en/*.xlsx                     |
|  (sys_user.xlsx, cmn_department.xlsx)  |
+----------------------------------------+

+--------------------------------------------------------------------+
|  packages/domain  (framework-free; imported by both api & web)     |
|                                                                    |
|  buildDepartmentTree | placeMembers (rank order)                   |
|  placeAssignments (kenmu / concurrent-duty placement)              |
|  disambiguateNames | resolveDepartmentHeads | title normalization  |
+--------------------------------------------------------------------+

docker-compose.yml orchestrates:  db (Postgres) --> api --> web
                                  (+ db-test: ephemeral Postgres, used only by API feature tests)
```

### Database schema

```
+--------------------------------------------------------------+    +------------------------------------------------------------+
|  departments                                                 |    |  employees                                                 |
|                                                              |    |                                                            |
|  PK  id              varchar                                 |    |  PK  sys_id          varchar(32)                           |
|      name            varchar   UNIQUE                        |    |      user_id         varchar                               |
|      parent_name     varchar                                 |    |      last_name       varchar                               |
|      head            varchar                                 |    |      first_name      varchar                               |
|  FK  head_sys_id     varchar(32)  NULL  -> employees.sys_id  |    |      title           varchar                               |
|      sys_id          varchar                                 |    |  FK  title_id        varchar      NULL  -> titles.id       |
|      active          boolean                                 |    |  FK  department_id   varchar            -> departments.id  |
+--------------------------------------------------------------+    |      active          boolean                               |
                                                                    +------------------------------------------------------------+

+----------------------------------------+    +----------------------------------------------------+
|  titles                                |    |  department_titles                                 |
|                                        |    |                                                    |
|  PK  id              varchar           |    |  PK FK department_id  varchar   -> departments.id  |
|      name            varchar   UNIQUE  |    |  PK FK title_id       varchar   -> titles.id       |
|      name_en         varchar           |    +----------------------------------------------------+
|      rank            integer           |
|      staff_level     boolean           |
|      active          boolean           |
+----------------------------------------+

+------------------------------------------------------------+    +-----------------------------------------------------------------------+
|  assignments                                               |    |  change_log                                                           |
|                                                            |    |                                                                       |
|  PK  id                 uuid                               |    |  PK  id           uuid                                                |
|  FK  employee_sys_id    varchar(32)  -> employees.sys_id   |    |      entity        varchar   (employee | department | assignment)     |
|  FK  department_id      varchar      -> departments.id     |    |      entity_id     varchar                                            |
|      title               varchar                           |    |      action        varchar   (create | update | deactivate)           |
|  FK  title_id            varchar  NULL  -> titles.id       |    |      actor         varchar                                            |
|      is_primary          boolean                           |    |      changed_at    timestamptz                                        |
|      assignment_type     varchar   (primary | concurrent)  |    |      before        jsonb  NULL                                        |
|      valid_from          date  NULL                        |    |      after         jsonb  NULL                                        |
|      valid_to            date  NULL                        |    |                                                                       |
+------------------------------------------------------------+    |  (append-only -- no update/delete route exposed anywhere in the API)  |
                                                                  +-----------------------------------------------------------------------+

Relationships (foreign key -> referenced primary key, delete behavior):

  employees.department_id          -> departments.id        ON DELETE RESTRICT
  employees.title_id               -> titles.id              ON DELETE RESTRICT
  departments.head_sys_id          -> employees.sys_id       ON DELETE SET NULL
  assignments.employee_sys_id      -> employees.sys_id       ON DELETE CASCADE
  assignments.department_id        -> departments.id        ON DELETE RESTRICT
  assignments.title_id             -> titles.id              ON DELETE RESTRICT
  department_titles.department_id -> departments.id        ON DELETE CASCADE
  department_titles.title_id      -> titles.id              ON DELETE CASCADE

  RESTRICT  = blocks deleting a department/title that's still referenced;
              the app deactivates (active = false) instead of hard-deleting.
  CASCADE   = dependent rows with no meaning on their own (an employee's
              own assignments, a department's title-eligibility links).
  SET NULL  = the one soft reference (department head) simply clears.
```
