# Concurrent Duties (兼務 / Kenmu) — Data Model Design

*Requirement 4 of the Syslabo assignment.* This document proposes how to model people who
hold posts in more than one department, and explains the minimal implementation shipped in
this project.

## Problem

`sys_user` stores exactly **one** `Department` and **one** `Title` per person. The legacy
hand-made chart, however, shows some people in a second department prefixed with **(兼)**
(e.g. `(兼)照沼`). That secondary post cannot be represented in — or recovered from — the
current `sys_user` data. As a result, an automated chart driven purely by `sys_user` cannot
reproduce those (兼) entries.

## Design principle

The Syslabo precautions ask us to **add items rather than modify existing ones**. So instead of
altering `sys_user` (adding `Department2`, `Title2`, … columns — which does not scale beyond two
posts and denormalizes the data), we introduce a separate **assignment relation** and leave both
masters untouched.

## Proposed structure: `user_department_assignments`

A many-to-many relation between users and departments. One row per (person, department) posting.

| Column            | Type      | Notes                                                             |
|-------------------|-----------|-------------------------------------------------------------------|
| `assignment_id`   | PK        | Stable id for the row.                                            |
| `user_sys_id`     | FK        | → `sys_user.Sys ID`.                                              |
| `department_id`   | FK        | → `cmn_department.ID`.                                            |
| `title`           | string    | Position held **in that department** (a person can be 事業部長 in one and 部長 in another). |
| `is_primary`      | boolean   | Exactly one primary posting per person (their "home").           |
| `assignment_type` | enum      | `primary` \| `concurrent` (兼務).                                 |
| `valid_from`      | date?     | Optional effective-dating — enables history (see below).         |
| `valid_to`        | date?     | Optional; empty = currently active.                              |

### Why this shape
- **Scales** to any number of concurrent posts (not just two).
- **Per-department title**, matching how the legacy chart labels the same person differently in each box.
- **`is_primary` / `assignment_type`** cleanly separate the home posting from 兼務 ones, so the chart knows which entries to prefix with (兼).
- **`valid_from` / `valid_to`** make the same table the natural foundation for the change-history feature (Requirement 3): a personnel change closes the old row (`valid_to`) and opens a new one, giving a full audit trail without destructive edits.

### Migration path
1. Seed one `primary` row per user from the existing `sys_user.Department` + `Title`.
2. Add `concurrent` rows for the 兼務 postings (net-new information).
3. Optionally, once every posting lives in this table, `sys_user.Department`/`Title` can be
   treated as a cached convenience copy of the primary row.

## Minimal implementation in this project

Fully implementing the relation is out of scope (Requirement 4 asks for a design), but to make
the generated chart faithful we ship a working slice of it:

- **File:** `data/user_assignments.xlsx`, sheet `assignments`, with the columns above plus a
  human-readable `note` column (ignored by the generator).
- **Generator wiring:** `src/buildOrg.ts` reads `concurrent` rows and places each person into the
  referenced department with a (兼) marker; `primary` rows are currently informational (the
  primary posting still comes from `sys_user`).
- **Seed contents:** the three concurrent postings from the legacy chart whose target department
  exists in `cmn_department`:
  1. 照沼 邦義 → `24510` 購買調達部 as 部長 (primary: 事業部長 of ITサポート事業部)
  2. 濱井 啓介 → `24111` ソリューション営業部 1課1G as 主任 (primary: 課長 of 1課)
  3. 山田 真也 → `24510` 購買調達部 as 部長 (primary: 課長 of 2課)

Regenerate the seed with `npx tsx scripts/seed-assignments.ts`; thereafter maintainers edit the
xlsx directly and re-run `npm run chart`.

## Data-quality findings surfaced while building this

Two (兼) cases from the legacy chart are intentionally **not** seeded, because they reveal
inconsistencies between the hand-made chart and the master data — exactly the kind of drift an
automated, master-driven chart is meant to eliminate:

1. **`ソリューション営業部` is missing from `cmn_department`.** The legacy chart shows it as an
   intermediate 部 (with `(兼)佐藤(悠)` as 部長), and the supplementary reference legend lists it
   as a department — but there is no such row in the master. Its two課 (`1課`, `2課`) instead point
   directly at `営業本部`. The generator therefore renders them under `営業本部`.
   **Recommendation:** add a `ソリューション営業部` department row (parent `営業本部`) and reparent
   `1課`/`2課` to it; then 悠一郎 佐藤's 部長 兼務 can be added to `user_assignments.xlsx`.
2. **代表取締役 佐藤 (曠弌 佐藤).** The legacy chart draws him only as `(兼)事業部長` of
   システム事業部, but in `sys_user` his primary posting **is** システム事業部 with title 代表取締役.
   The generator renders him there as 代表取締役 (his actual master record); no 兼務 row is needed.
