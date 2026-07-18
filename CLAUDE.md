# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

This is a **recruitment take-home assignment** from Syslabo Corp. (株式会社シスラボ), not an
existing product. The brief lives in `TryOutProgram/TASK_an organization chart automatic output application.pdf`.

**Goal:** build an application that automatically generates a **printable organization chart**
from two Excel "master" data sources, reproducing the hand-made chart in
`TryOutProgram/組織図(Current Organizational Chart).xlsx`.

### Implementation state

Implemented in **Node.js + TypeScript**, run via `tsx` (no build step). Output is a single
self-contained **HTML** file (print-to-PDF, A3 landscape). Scope delivered: Requirements 1, 2,
and 4; Requirement 3 (maintenance UI + history) is not built. **This is not a git repository.**

### Commands

```bash
npm install                        # deps: xlsx (SheetJS), typescript, tsx
npm run chart                      # data/*.xlsx -> dist/organization-chart.html (+ summary/warnings)
npm test                           # node:test unit tests for the domain core
npx tsc --noEmit                   # typecheck
npx tsx scripts/seed-assignments.ts# regenerate data/user_assignments.xlsx (the 兼務 seed)
node --import tsx --test src/buildOrg.test.ts   # run a single test file
```

### Architecture

Pipeline: `readMasters` → `buildOrg` → `renderHtml`, wired by `src/index.ts`.
- `src/readMasters.ts` — SheetJS parses the three `data/*.xlsx` into typed rows (reads `Page 1` /
  `assignments` sheets only).
- `src/buildOrg.ts` — **the domain core**: builds the department tree (parent-by-name), places
  primaries from `sys_user` and concurrents from `user_assignments`, orders rosters by position
  rank, disambiguates shared last names, emits an `OrgNode` tree + `BuildWarning[]`.
- `src/renderHtml.ts` — `OrgNode` tree → one HTML doc with inline print CSS (hybrid tree + roster
  cards; `(兼)` = 兼務 shown in red).
- `src/config.ts` — **the maintainer-editable knobs**: `POSITION_RANK`, `DEPARTMENT_EN`,
  `DISPLAY_OVERRIDES` (Sys-ID-keyed name overrides), `PATHS`, `CHART_TITLE`.
- `src/model.ts` — shared types. `data/` holds working copies of the masters (never edit the
  originals in `TryOutProgram/`). Req-4 design: `docs/concurrent-duties-design.md`.

Gotchas: hierarchy comes from the department tree + title rank, **not** `sys_user.Manager` (empty
for all rows); titles are normalized so `主任２` (full-width) === `主任2`; `ソリューション営業部`
is absent from `cmn_department` though the legacy chart shows it (documented data gap).

## Deliverables (from the brief)

- **Required (1 & 2):** an app that auto-generates the org chart. Output format is free but
  **must be printable** (something other than Excel is acceptable). Keep it **simple enough to be
  maintained by someone other than the author.**
- **Optional (3):** a maintenance UI for `sys_users` / `cmn_department` with **change-history**
  tracking.
- **Optional (4):** a *design proposal* (no implementation needed) for how to model **concurrent
  duties / 兼務 (Kenmu)** — see below — since the current data cannot represent it.

### Hard constraints (PRECAUTIONS)

- Any DBMS used must be **free of charge**.
- When changing the `sys_users` / `cmn_department` schemas, **add columns rather than modifying
  existing ones** where possible.
- The generated chart must use a Japanese-capable encoding (**UTF-8**). Source Japanese data may
  be rewritten if it blocks development.
- The provided files/data are for this project only.

## Data model (the big picture)

The chart is produced by joining two masters. Understanding this join is the core of the task.

### `TryOutProgram/sys_user.xlsx` — employee master (sheet `Page 1`, 95 active rows, 47 columns)

ServiceNow-style export. Most columns are irrelevant; the ones that matter:

- **`Last name` / `First name`** — Japanese names, stored split (e.g. `佐藤` / `曠弌`).
- **`Title`** — the person's **position**, and one of a fixed rank set (see hierarchy below).
- **`Department`** — a **single** department, stored as a **name string** that matches
  `cmn_department.Name` (e.g. `SW開発課 1G`). A user can belong to only one department here — this
  is the limitation Requirement 4 asks you to solve.
- **`User ID`** (e.g. `0002`) and **`Sys ID`** (32-char hex) — stable identifiers.
- **`Manager`** is **empty for every row** — do *not* build the hierarchy from it. Hierarchy comes
  entirely from `cmn_department.Parent` + `Title` rank.
- Sheet `choice_values` holds dropdown option lists and contains **mojibake** (`å¥³`, `ç”·` =
  `女`/`男`) from a UTF-8/Latin-1 round-trip — a reminder to handle encoding carefully.

### `TryOutProgram/cmn_department.xlsx` — department master (sheet `Page 1`, 20 rows)

- **`Name`** — department name (the join key from `sys_user.Department`).
- **`Parent`** — parent department **by Name** (empty string = top level). Build the tree by
  matching `Parent` → `Name`. Four roots have empty parent: `営業本部`, `システム事業部`,
  `ITサポート事業部`, `管理部`.
- **`Department head`** — full name of the head; **`ID`** and **`Sys ID`** identify the dept.

### `TryOutProgram/組織図(Supplementary Explanation ...).xlsx` — reference/legend

Maps **positions → rank order** and **department names → English**. This is the authority for the
ordering below.

## Domain rules that drive chart correctness

Study `組織図(Current Organizational Chart).xlsx` to see these in action — the generator must
reproduce them:

1. **Position hierarchy (high → low), used to order people within a department:**
   代表取締役 (Representative Director) → 本部長 (Division Manager / honbu) → 事業部長 (Division
   Manager / jigyoubu) → 部長 (General Manager) → 課長 (Manager) → 担当課長 (Deputy Manager) →
   主任 (Chief) → 主任２ (Chief) → 課員 (Employee). Note `Title` uses a full-width `２` in `主任２`.

2. **Kenmu / 兼務 (concurrent duties)** — the central domain concept. A person holding a second
   post in another department appears there prefixed with **`(兼)`** / full-width **`（兼）`**
   (e.g. `(兼)佐藤(悠)` is 本部長 of 営業本部 shown again as acting 部長 of ソリューション営業部).
   Because `sys_user.Department` is single-valued, these secondary placements **cannot currently be
   derived from the data** — they exist only in the hand-made chart. Requirement 4 is to design the
   data structure that would capture them (e.g. a join table of user ↔ department ↔ title ↔
   primary/concurrent flag).

3. **Name display & disambiguation** — the chart shows **last name only**, disambiguating
   collisions with a parenthesized given-name initial or extra kanji: `佐藤(悠)` vs `佐藤(晃)`,
   `伊東(健)`, `加藤(健)` / `加藤(優)`, `山本洸` / `山本祥` / `山本皓`, `中島（眞）`. Any generator
   must implement a collision-aware shortening rule rather than a naive last-name label.

4. **Location tags** — a work location may be appended in full-width brackets, e.g.
   `大西【大阪】` (Osaka).

## Working with the `.xlsx` files

There is no tooling yet; inspect the data with Python + `openpyxl`
(`pip install openpyxl --break-system-packages`), loading with `data_only=True`. Filenames contain
Japanese and parentheses — always quote paths.
