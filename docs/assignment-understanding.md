# Assignment Understanding - Organization Chart Auto-Output App

> Source of truth for this doc: the five files in `TryOutProgram/`, read directly
> (`TASK_…​.pdf` brief + the three `.xlsx` data files + the hand-made sample chart).
> This is a **requirements-understanding** capture, not a design or an implementation plan.

---

## 1. What this actually is

A **recruitment take-home** from **Syslabo Corp. (株式会社シスラボ)** - the second stage of
their hiring process. The deliverable is an application **plus a presentation video** explaining
the solution and the development approach, emailed in.

- **Deadline:** July 26 (SUN). Results ~2 weeks after.
- **Sample/target file:** `組織図(Current Organizational Chart).xlsx` (its title cell reads
  `2024年度組織図` - "FY2024 org chart").
- Provided files are **for this project only** (do not reuse elsewhere).

---

## 2. The problem they're trying to solve (the "why")

Syslabo maintains two masters and hand-draws an org chart in Excel every time the org changes:

```text
   sys_users  ──┐
   (employees)  │   once/year (or on any personnel change)
                ├──►  a human re-draws  組織図(Organization chart).xlsx  BY HAND
   cmn_department│                       ▲
   (departments)┘                        │
                                         └── tedious, error-prone, drifts out of sync
```

Pain points they name explicitly:

1. **The chart is 100% manual.** Every reorg / personnel change ⇒ someone edits `sys_users`,
   then manually redraws the Excel chart.
2. **No maintenance app and no change history** for the two masters.
3. **"Kenmu (兼務)" / concurrent duties can't be represented.** A person can hold a post in a
   second department. On the legacy chart these are marked with **`（兼）`**. But `sys_users` has
   only **one** `Department` per person, so concurrent placements exist *only* in the hand-made
   chart - they cannot be derived from the data.

> The drift is real and visible in the data (see §7). The sample chart contains people who are
> **not** in the current `sys_user` master - exactly the failure mode that motivates the request.

---

## 3. Requirements (verbatim intent)

| # | Req | Status | What it asks |
| --- | --- | --- | --- |
| **1** | Auto-generate the chart | **Required** | An app that automatically produces an org chart like `組織図(Organization chart).xlsx`. **Output format is free but must be printable** (anything other than Excel is fine). |
| **2** | Maintainable & simple | **Required** | Simple enough to be **maintained/modified by someone other than the author**. If a dev environment is needed, **provide setup instructions**. |
| **3** | Master maintenance UI | Optional | A simple function to maintain `sys_users` + `cmn_department`, ideally with **change-history** tracking. |
| **4** | Model concurrent duties | Optional | **Design & propose** a data structure to represent 兼務 (which the current data can't). **Implementation not required** - a design proposal is enough. |

## 4. Hard constraints (PRECAUTIONS)

- **Any DBMS used must be free of charge.**
- When changing the `sys_users` / `cmn_department` schemas, **add columns, don't modify existing
  ones**, wherever possible. (⇒ favors a *separate join table* for 兼務 over altering `sys_user`.)
- Output must use a **Japanese-capable encoding (UTF-8)**. Source Japanese *may* be rewritten if
  it blocks development.

---

## 5. The data model - the join that produces the chart

Three inputs. The chart is essentially **`sys_user` ⋈ `cmn_department`**, ordered by title rank,
with the reference sheet supplying rank order and English names.

### 5a. `sys_user.xlsx` - employee master (sheet `Page 1`)

- **95 data rows, 47 columns** (a ServiceNow-style export). Most columns are noise.
- Columns that matter: **`Last name`**, **`First name`** (Japanese, stored split, e.g. 佐藤 / 曠弌),
  **`Title`** (the position - a fixed rank set), **`Department`** (a **single** dept, as a **name
  string** matching `cmn_department.Name`), **`User ID`** (e.g. `0002`), **`Sys ID`** (32-hex).
- **`Manager` is empty for every row** ⇒ hierarchy is **NOT** built from it.
- Second sheet **`choice_values`** = dropdown option lists, and it contains **mojibake**:
  `å¥³`/`ç"·` sit next to the correct `女`/`男` - a UTF-8→Latin-1 round-trip artifact. A planted
  reminder to get encoding right.

### 5b. `cmn_department.xlsx` - department master (sheet `Page 1`, 20 rows)

- **`Name`** = join key (from `sys_user.Department`). **`Parent`** = parent **by Name**
  (empty = top level). **`Department head`** = full name (stored **First Last** with a full-width
  space, e.g. `邦義 照沼` = 照沼邦義 - note the *opposite* name order vs `sys_user`; one row even
  has a double space `直也  林田` = dirty data). **`ID`** / **`Sys ID`** identify the dept.

The tree (built by matching `Parent → Name`) - **four roots** with empty parent:

```text
営業本部 (24100)                         システム事業部 (24300)
├─ 営業本部　業務課 (24103)  †            ├─ 研究開発課 (24310)
├─ 営業本部（介護） (24101)  †            ├─ システム課 (24330)
├─ ソリューション営業部 1課 (24110)       └─ SW開発課 (24350)
│   ├─ …1課1G (24111)                       ├─ SW開発課 1G (24351)
│   └─ …1課2G (24113)                       ├─ SW開発課 2G (24353)
└─ ソリューション営業部 2課 (24130)         ├─ SW開発課 3G (24355)
    ├─ …2課1G (24131)                       └─ SW開発課 4G (24357)
    └─ …2課2G (24133)
                                         管理部 (24900)   [root, no children]
ITサポート事業部 (24500)
└─ ITサポート事業部 購買調達部 (24510)
```

† `営業本部　業務課` and `営業本部（介護）` exist in the master but **do not appear** in the
hand-made chart (empty departments, curated out).

### 5c. `組織図(Supplementary Explanation …).xlsx` - the legend (sheet `reference`)

The **authority** for two lookups:

- **Position → rank order** (High→Low), and **Japanese title → English**.
  *(A 4th column of Bengali translations is present - added by a prior reader, not part of the
  core JP→EN mapping.)*
- **Department name → English.**

```text
RANK  (high → low)          ENGLISH
 代表取締役                 Representative Director
 本部長                     Division Manager (honbu)
 事業部長                   Division Manager (jigyoubu)
 部長                       General Manager
 課長                       Manager
 担当課長                   Deputy Manager
 主任                       Chief
 主任２   (full-width ２)   Chief
 課員                       Employee
```

---

## 6. Domain rules the generator must reproduce

Derived by reading `組織図(Current Organizational Chart).xlsx` cell-by-cell. Its layout is a
**hybrid**: an indented department tree on the left (root at col C, deeper levels shift right to
G / J / M), each dept showing a **position label** then a **roster of people flowing
left→right, top→bottom**, ordered by descending title rank.

```text
C: 営業本部            本部長   佐藤(悠)
  G: ソリューション営業部  部長   (兼)佐藤(悠)          ← 兼務 (concurrent) in red
    J: １課           課長   濱井
      M: １G          主任   （兼）濱井   塚本         ← roster flows right →
      M: 2G           主任   島尻   佐藤(晃)
    J: 2課            課長   山田
      M: １G          主任   伊東(健)   増田
      M: 2G           主任   林田   小池   井川
```

**Rule 1 - Position hierarchy** orders people within a department (see §5c ranking).

**Rule 2 - Kenmu / 兼務 (concurrent duties)** - the central concept. A person holding a second
post in another department is shown there prefixed with **`(兼)`** / full-width **`（兼）`**.
Real examples in the sample:

- `(兼)佐藤(悠)` - 佐藤悠一郎 (本部長 of 営業本部) shown again as acting **部長 of ソリューション営業部**.
- `(兼)佐藤` - 佐藤曠弌 (代表取締役) shown as **事業部長 of システム事業部**.
- `（兼）濱井` - 濱井 (課長 of 1課) shown as **主任 of 1課1G**.
- `(兼)照沼` and `(兼)山田` - both shown in **購買調達部**.

These placements **cannot be derived from `sys_user`** (single department only) - they live only
in the hand-made chart. **This is exactly what Requirement 4 asks you to design a structure for.**

**Rule 3 - Name display & disambiguation** - the chart shows **last name only**, but resolves
collisions with a parenthesized given-name initial / extra kanji:
`佐藤(悠)` vs `佐藤(晃)` vs `佐藤`(plain), `伊東(健)`, `加藤(健)` / `加藤(優)`,
`山本洸` / `山本祥` / `山本皓`, `鈴木智` / `鈴木秀` / `鈴木和`, `中島（眞）` (vs the different
surname 中嶋). A naive "last name" label is **wrong** - a collision-aware shortening rule is required.

**Rule 4 - Location tags** - a work location may be appended in full-width brackets:
`大西【大阪】` (Osaka).

---

## 7. Gotchas & data-quality findings (discovered by reading the raw files)

These are the traps that separate a naive generator from a correct one:

1. **Hierarchy source.** Comes from `cmn_department.Parent` + `Title` rank - **never** from
   `sys_user.Manager` (empty for all 95 rows).
2. **Title normalization.** `sys_user` uses full-width `主任２`; the sample chart uses half-width
   `主任2`. Treat `主任２ === 主任2`. Same for full/half-width group/section numbers
   (`１課`/`1課`, `１G`/`1G`) and dept names (`ＳＷ開発課` vs `SW開発課`).
3. **Missing intermediate node - `ソリューション営業部`.** The chart shows it as a grouping level,
   but `cmn_department` has **no** such node - only `ソリューション営業部 1課 / 2課` whose `Parent`
   is `営業本部`. The chart *invents* the grouping. **Documented data gap.** (Similarly the chart's
   `購買調達部` = master's `ITサポート事業部 購買調達部`.)
4. **Most employees are dumped at a division root.** ~60 of 95 rows have
   `Department = ITサポート事業部` (the **root**, not a leaf) with `Title = 課員`. Only a handful
   sit in real leaf depts (SW開発課 subgroups, ソリューション営業部 courses, システム課, 研究開発課,
   管理部). The chart renders the big ITサポート roster as one flat block.
5. **The hand-made chart has drifted from the master** (the motivating problem, made concrete):
   - **Phantoms on the chart, absent from `sys_user`:** `芹澤`, `岡本`, and `河合`
     (master has `河井望実`, a different kanji - 合 vs 井).
   - **Kanji variants:** chart `田崎` vs master `田﨑`; surname readings collide across different
     kanji (中島 / 中嶋, 伊東 / 伊藤).
6. **Name-order mismatch across masters.** `sys_user` stores `Last name` + `First name`
   separately; `cmn_department.Department head` stores a single **First Last** string.
7. **Encoding hazard is planted** (mojibake in `choice_values`) - output **must** be UTF-8.
8. **Foreign name:** `レ　ウ　ウェイ` (katakana) renders as `ウェイ` on the chart.

---

## 8. Deliverables checklist

- [ ] **App that auto-generates a printable org chart** reproducing the sample (Req 1).
- [ ] **Simplicity + setup instructions** so a non-author can maintain it (Req 2).
- [ ] *(optional)* Maintenance UI for the two masters, with **change history** (Req 3).
- [ ] *(optional)* **Written design proposal** for modeling 兼務 - no code needed (Req 4).
- [ ] **Presentation video** explaining the solution & approach.
- [ ] Free DBMS only; schema changes = additive; UTF-8 output.

---

## 9. Open questions / risks worth resolving before committing to an approach

- **How faithful must the layout be?** "Like the sample" + "printable" - is a clean, correct,
  print-ready re-rendering acceptable, or do they expect a near-pixel Excel clone? (Brief says
  *"output format does not matter… other than Excel is acceptable"* - strongly implies a faithful
  *re-rendering* is fine, not a clone.)
- **Where does 兼務 data come from for Req 1?** The sample's `（兼）` entries aren't in the masters.
  Options: (a) render only what the data supports and treat 兼務 as the Req-4 design gap; (b) seed a
  small supplementary 兼務 source to demonstrate the chart *can* place concurrents.
- **How are the roster people ordered *within the same rank*?** By User ID? By appearance in the
  master? The sample's within-rank ordering isn't obviously keyed - needs a defined, stable rule.
- **Disambiguation rule specifics** - initial vs. extra-kanji vs. location tag: what precedence,
  and is it computed only among *colliding* surnames in the *same* dept, or globally?
- **Should phantoms/variants be reconciled or surfaced as warnings?** Emitting a warnings report
  (unmatched chart names, unplaced users, mojibake) turns the drift problem into a feature.
