# Features

A catalog of what the Organization Chart Auto-Output app actually does, grounded in the code.
Each feature notes **where it lives** and its **status**: ✅ delivered · 📐 designed (no code) ·
⛔ out of scope.

For *what the assignment asks for*, see [`docs/assignment-understanding.md`](docs/assignment-understanding.md).

---

## At a glance - coverage vs. the brief

| Req | Assignment asks for | Feature area | Status |
| --- | --- | --- | --- |
| 1 | Auto-generate a printable chart like the sample | [Generation pipeline](#1-generation-pipeline) | ✅ |
| 2 | Simple enough for a non-author to maintain | [Maintainability](#7-maintainability) | ✅ |
| 3 | Master-maintenance UI + change history | [CRUD + history](#not-built-requirement-3) | ⛔ |
| 4 | Design a concurrent-duties (兼務) data model | [Concurrent duties](#5-concurrent-duties--兼務) | 📐 designed + ✅ minimal slice wired in |

Pipeline shape:

```text
data/*.xlsx ──▶ readMasters ──▶ buildOrg ──▶ renderHtml ──▶ dist/organization-chart.html
                (SheetJS)        (domain)     (HTML+CSS)
```

---

## 1. Generation pipeline

**One command, one portable file.** `npm run chart` reads the three masters and writes a single
self-contained HTML document (Requirement 1). `src/index.ts` wires the three stages together.

- ✅ **Three-input join** - `readMasters.ts` parses `sys_user.xlsx` (`Page 1`),
  `cmn_department.xlsx` (`Page 1`), and `user_assignments.xlsx` (`assignments`) via **SheetJS**,
  which handles Japanese/UTF-8 transparently.
- ✅ **No build step** - runs through `tsx`; `npm install` is the only prerequisite (Node 20+).
- ✅ **Console summary** - prints departments / roots / people-placed / concurrent-entry counts
  and any data warnings after each run.

## 2. Department tree

Built entirely from `cmn_department`, **not** from `sys_user.Manager` (empty for all rows).
*(`src/buildOrg.ts`)*

- ✅ **Parent-by-name linking** - each department links to its parent by matching
  `Parent → Name`; the **four empty-parent roots** (営業本部, システム事業部, ITサポート事業部,
  管理部) seed the forest.
- ✅ **Orphan safety net** - a department whose `Parent` doesn't resolve is promoted to a root and
  reported as an `orphan-department` warning rather than being silently dropped.

## 3. Rank-based rostering

Each department's people are ordered by position, the way the hand-made chart does.
*(`src/buildOrg.ts`, `src/config.ts`)*

- ✅ **9-level position hierarchy** - `POSITION_RANK` (代表取締役 → … → 課員) drives ordering.
- ✅ **Managers vs. staff split** - anyone at/below `課員` (`STAFF_RANK`) renders in the wrapped
  staff grid; higher ranks render as individual titled lines.
- ✅ **Full/half-width title normalization** - `主任２` (full-width ２, as in `sys_user`) is treated
  as `主任2` (as in the legacy chart) via `normalizeTitle`.
- ✅ **Stable within-rank order** - ties break by Japanese-collated display name
  (`localeCompare(…, "ja")`) so output is deterministic.
- ✅ **Unknown-title guard** - a title not in `POSITION_RANK` sorts last and raises an
  `unknown-title` warning.

## 4. Name display & disambiguation

Reproduces the chart's last-name-only labels with collision handling. *(`computeDisplayNames`)*

- ✅ **Last-name-only** by default.
- ✅ **Collision-aware suffix** - when two+ people share a last name company-wide, the given
  name's first character is appended: `佐藤(悠)` / `佐藤(晃)`.
- ✅ **Manual overrides** - `DISPLAY_OVERRIDES` (keyed by Sys ID) pins hand-crafted labels the
  automatic rule can't derive, e.g. the location tag `大西【大阪】`. Overrides always win.

```text
last name unique?  ──yes──▶  「佐藤」
        │
        no
        ▼
  append given-name initial  ──▶  「佐藤(悠)」   (DISPLAY_OVERRIDES overrides both)
```

## 5. Concurrent duties / 兼務

The central domain concept, and Requirement 4. A person can hold a post in a second department;
those postings are marked **(兼)**. *(`docs/concurrent-duties-design.md`, `src/buildOrg.ts`)*

- 📐 **Proposed data model** - a separate `user_department_assignments` relation (one row per
  person×department: `user_sys_id`, `department_id`, `title`, `is_primary`, `assignment_type`,
  `valid_from`, `valid_to`). Additive (leaves both masters untouched, per the precautions),
  scales beyond two posts, carries a **per-department title**, and its effective-dating columns
  double as the foundation for Requirement 3's history.
- ✅ **Working slice wired in** - `buildOrg` reads `concurrent` rows from `user_assignments.xlsx`
  and places each person into the referenced department; `primary` rows are informational (home
  posting still comes from `sys_user`).
- ✅ **(兼) marker** - concurrent placements render prefixed with a red `(兼)` in the output.
- ✅ **Referential-integrity guards** - assignments pointing at an unknown user or department raise
  `unknown-assignment-user` / `unknown-assignment-department` warnings.
- ✅ **Regenerable seed** - `scripts/seed-assignments.ts` rebuilds the three seeded 兼務 rows
  (照沼→購買調達部, 濱井→1課1G, 山田→購買調達部).

## 6. Printable HTML output

A single self-contained, print-ready document - no external assets. *(`src/renderHtml.ts`)*

- ✅ **Hybrid tree + roster cards** - nested department cards connected by CSS guide lines; each
  card shows titled managers then a wrapped 課員 grid.
- ✅ **Inline print CSS, A3 landscape** - `@page { size: A3 landscape }`, `print-color-adjust` so
  the red (兼) survives printing; export to PDF via the browser Print dialog.
- ✅ **UTF-8 + CJK font stack** - Hiragino / Yu Gothic / Meiryo / Noto Sans CJK JP; Japanese prints
  correctly (satisfies the UTF-8 precaution).
- ✅ **English department labels** - `DEPARTMENT_EN` renders the English name beside the Japanese.
- ✅ **Department head + empty-department marker** - shows `長:` per dept; empty departments render
  `（在籍者なし）` instead of a blank box.
- ✅ **HTML escaping** - all interpolated data is escaped.

## 7. Maintainability

Requirement 2: adjustable by someone other than the author. *(`src/config.ts`, `README.md`)*

- ✅ **Single knobs file** - `config.ts` centralizes `CHART_TITLE`, `POSITION_RANK`,
  `DEPARTMENT_EN`, `DISPLAY_OVERRIDES`, and `PATHS`; the README maps "to change X, edit Y".
- ✅ **Data edited as xlsx** - maintainers edit copies in `data/` (originals in `TryOutProgram/`
  are never touched) and re-run.
- ✅ **Unit tests** - `npm test` (`src/buildOrg.test.ts`) covers the domain core; `npx tsc
  --noEmit` typechecks.
- ✅ **Reproducible setup** - documented install/run, only Node 20+ required.

## 8. Data-quality reporting

Turns the master↔chart drift (the problem that motivates the brief) into visible output.
*(`BuildWarning` in `src/buildOrg.ts`)*

- ✅ **Warning types** - `orphan-department`, `unknown-title`, `unmatched-department`,
  `unknown-assignment-user`, `unknown-assignment-department`.
- ✅ **Run stats** - `departments`, `peoplePlaced`, `concurrentEntries` printed each run.

---

## Not built (Requirement 3)

⛔ **CRUD maintenance UI + change history** for `sys_user` / `cmn_department` is out of scope this
iteration. The Requirement-4 model's `valid_from` / `valid_to` columns are the intended foundation:
a personnel change closes the old row and opens a new one, giving an audit trail without
destructive edits.

## Known data-driven behaviors & gaps

Documented in [`docs/concurrent-duties-design.md`](docs/concurrent-duties-design.md):

- **`ソリューション営業部` missing from `cmn_department`** - shown as an intermediate 部 on the
  legacy chart but absent from the master; its 1課/2課 point straight at 営業本部, so the generator
  renders them there. (Recommended fix: add the row + reparent, then seed 佐藤(悠)'s 部長 兼務.)
- **代表取締役 佐藤** - rendered from his actual `sys_user` record (代表取締役 in システム事業部),
  not as the chart's `(兼)事業部長`; no 兼務 row needed.
- **Phantoms & variants** (芹澤 / 岡本 / 河合; 田崎 vs 田﨑) exist on the hand-made chart but not in
  the current master - surfaced via warnings rather than silently reproduced.
