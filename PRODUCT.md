# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary (tool-first): the internal HR / back-office maintainer at Syslabo.** They keep the two
company masters current and produce the printable organization chart whenever the org changes — an
annual reorg or any personnel move. The interface is designed for this operator doing real
maintenance work, not for a demo.

**Evaluating audience: Syslabo hiring reviewers.** This is a recruitment take-home; reviewers
assess it (and role-play the maintainer) to judge the solution and its craft. The deliverable must
read clearly to them, but the app is built as a genuine tool the maintainer would trust — not a
throwaway showcase. (Confirmed: "both, tool-first.")

## Product Purpose

Replace Syslabo's manual, error-prone process of hand-drawing the org chart in Excel every time the
organization changes. The app joins the employee master (`sys_user`) and department master
(`cmn_department`) to **automatically generate a printable A3 organization chart** that reproduces
the hand-made FY2024 chart, adds a **maintenance UI** for the masters with **append-only change
history**, and models **concurrent duties (兼務 / kenmu)** as first-class data so the chart's `(兼)`
placements are derived rather than hand-drawn.

Success right now (status: **live recruitment submission**, deadline **July 26**): fully and
clearly satisfy the assignment's four requirements, on time, in a way a non-author can maintain.

## Positioning

The chart is **derived from the two masters, never hand-drawn** — through a documented join
(department tree by parent-name, title-rank ordering, collision-aware name disambiguation), so it
cannot silently drift from the data the way the manual Excel redraw does. Two things a neighboring
tool could not truthfully copy without the same discipline:

1. **Append-only change history** — every master edit becomes an auditable before/after record with
   no destructive edit or delete path.
2. **Additive concurrent-duties (兼務) relation** — captures a person's second posting per
   department without altering either master, filling the exact gap the source data (one department
   per person) cannot represent.

## Operating Context

- **Triggered by organizational change.** The maintainer edits Employees / Departments /
  Assignments in the admin UI, then views and prints the chart. Chart export is a core workflow.
- **Output is a printable A3-landscape PDF** (browser / Puppeteer), UTF-8 / CJK so Japanese renders
  and prints correctly.
- **Source data** is ServiceNow-style `.xlsx` exports (`sys_user`: 95 active rows, 47 columns;
  `cmn_department`: 20 rows), imported and seeded automatically at container start.
- **Bilingual data.** A Japanese dataset (default) and an English one (romaji names, English
  department/title labels) are selectable at seed time via `DATA_LANG`, so reviewers who don't read
  Japanese can still read the chart. The UI chrome labels themselves stay Japanese.
- **One-command setup.** `docker compose up` brings up db + api + web; the API entrypoint waits for
  Postgres, runs migrations, and imports the masters before serving.

## Capabilities and Constraints

**Delivered capabilities (all four assignment requirements):**

- Auto-generated org chart from the masters — department tree from `cmn_department.Parent` (**not**
  `sys_user.Manager`, which is empty for every row); 9-level title-rank ordering; collision-aware
  last-name disambiguation (`佐藤(悠)` vs `佐藤(晃)`); full/half-width title normalization
  (`主任２` === `主任2`).
- Interactive chart view with a **Tree ⇄ Network** toggle, zoom / pan, search, legend, and a
  data-issues strip that surfaces master↔chart drift as explicit warnings.
- Admin maintenance UI: **Employees, Departments, Assignments** CRUD (create / edit / deactivate).
  A second *primary* posting for one person is rejected; adding a *concurrent* posting produces that
  person's `(兼)` chip in the target department on the chart.
- **Append-only change-history browser** (reverse-chronological, before/after; no edit or delete
  path).
- **PDF export** (A3 landscape, Puppeteer).

**Durable constraints (from the brief's PRECAUTIONS):**

- DBMS must be **free of charge** → PostgreSQL.
- Master (`sys_user` / `cmn_department`) schema changes must be **additive** — add columns, never
  repurpose existing ones.
- Output must be **UTF-8 / Japanese-capable**.
- Must be **simple enough for a non-author to maintain**, with setup instructions.
- Provided files/data are **for this project only**; originals in `TryOutProgram/` are read-only
  reference — only the working copies in `data/` are imported.

**Terminology:** 兼務 (kenmu) = concurrent duty, marked `(兼)` / `（兼）`; *masters* = `sys_user` &
`cmn_department`; *roster* = the people listed under a department; *primary* vs *concurrent*
posting.

## Brand Commitments

- **Product name: Organo** (confirmed, to preserve). The in-code design system is referred to as
  "Organo Admin," described as Shopify/Polaris-style. Recorded as the committed identity; no logo or
  further brand assets confirmed yet.
- UI chrome copy is **Japanese** (the operator's language); chart *data* may be Japanese or English.

## Evidence on Hand

- **Real source data:** Syslabo's `sys_user.xlsx` (95 active employees) and `cmn_department.xlsx`
  (20 departments), plus the supplementary rank / English legend. Working copies in `data/`;
  read-only originals in `TryOutProgram/`.
- **Target chart:** `TryOutProgram/組織図(Current Organizational Chart).xlsx` (title cell
  「2024年度組織図」) and a rendered reference at `docs/sample-chart.png`.
- **Task brief:** `TryOutProgram/TASK_an organization chart automatic output application.pdf`.
- **Design notes:** `docs/assignment-understanding.md`, `docs/concurrent-duties-design.md`.
- **Known data gaps future work must NOT fabricate around:** `ソリューション営業部` appears on the
  hand-made chart but is absent from `cmn_department` (documented gap); phantom names on the chart
  (`芹澤` / `岡本` / `河合`) and kanji variants (`田崎` vs `田﨑`) are surfaced as warnings, not
  silently reproduced.
- The assignment also expects a **presentation video** explaining the solution — a deliverable
  outside the app itself.

## Product Principles

1. **Derived, never hand-drawn.** The chart is always a function of the masters; drift becomes a
   visible warning, not a silent error.
2. **Additive and non-destructive.** Extend via new columns / relations and append-only history;
   never mutate or delete master truth in place.
3. **Maintainable by a non-author.** One-command setup, centralized knobs, data edited as data,
   documented "to change X, edit Y."
4. **Correct Japanese first.** UTF-8 / CJK correctness, title and name normalization, and faithful
   reproduction of the domain's naming rules are non-negotiable; English is an additive convenience.
5. **Honor the source of truth.** The two masters are authoritative; the app reconciles and reports
   — it does not invent people or structure.

## Accessibility & Inclusion

Bilingual JA / EN chart data is a confirmed capability (for reviewers who don't read Japanese). No
specific accessibility standard (e.g. a WCAG level) was established for this deliverable — recorded
as **undecided**, not assumed.
