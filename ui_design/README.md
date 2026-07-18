# UI Design — Organization Chart

Pure **HTML + CSS + CSS-animation** design studies for the org-chart application described in
[`../FEATURES.md`](../FEATURES.md) and [`../docs/assignment-understanding.md`](../docs/assignment-understanding.md).
No JavaScript, no framework, no build step — open the files in a browser.

**Three complete themes**, same three screens each, so the same product can be seen through three
very different aesthetics:

| Theme | Location | Tone |
| --- | --- | --- |
| **組織の設計図 · Blueprint** | `./` (this folder) | Light, refined, editorial-technical — the chart as a drafting-table drawing |
| **構成 · Constructivist** | `./constructivist/` | Light, bold Swiss × Japanese poster — huge numerals, one loud vermilion |
| **Organo Admin · Shopify-style** | `./shopify/` | Polished SaaS admin (Polaris-like) — app shell, cards, status badges, an IndexTable |

Each theme has the same three sheets, and the pages cross-link between themes at the foot of each page:

| File | Sheet | What it shows |
| --- | --- | --- |
| `index.html` | 00 · Cover | Concept, the drift problem, the ledger stats, and the capability grid |
| `chart.html` | 01 · Chart | The organization chart — hierarchy, rank ordering, name disambiguation, the 兼務 marker, and a data-integrity strip |
| `admin.html` | 02 · Maintenance | Employee/department CRUD table, an edit record with additive columns, and the append-only change-history timeline |

## Theme A — 組織の設計図 (Blueprint)

The org chart treated as an **engineering drawing**: a drafting-table blueprint crossed with
Japanese editorial ledger design.

- **Paper & ink** — warm ivory drafting paper over a faint graph grid + paper grain; deep navy ink.
- **One accent** — a single vermilion *hanko* red (朱色), reserved for the **兼 (兼務)** seal, key
  figures, and registration marks. Everything else stays ink + paper for discipline.
- **Type** — Fraunces (display serif) · Shippori Mincho (明朝, Japanese headings) · Hanken Grotesk
  (UI text) · IBM Plex Mono (IDs, department codes, annotations).
- **Motion** — CSS only: seals *stamp* in, department cards reveal in sequence, and the tree's
  hairline connectors **draw themselves** (vertical rail grows down, ticks extend right, joint
  dots pop). Respects `prefers-reduced-motion`.

## Theme B — 構成 (Constructivist)

The org chart as a **Swiss × Japanese poster**: strict modular grid, confident geometry.

- **Bone & ink** — bone-white field with a faint modular grid; ink black; **one loud vermilion**
  (#E4331F) used as bold fills, a diagonal hero bar, and the 兼務 tag.
- **Type** — Anton (condensed heavy display) · Archivo (text) · Noto Sans JP 900 (Japanese
  headings) · DM Mono (data).
- **Signature** — giant Anton rank numerals **01–09**, ●/■ node markers, thick 3–4px black rules,
  a vertical poster spine label, and **hard *snap* reveals** (clip-path wipes and overshoot pops,
  not soft fades). Respects `prefers-reduced-motion`.

## Theme C — Organo Admin (Shopify / Polaris-style)

The org chart as a **product**: a polished commerce-style admin — the most faithful preview of the
planned React app (`apps/web`), since Requirement 3 *is* an admin.

- **App shell** — left sidebar navigation (Home · Chart · Employees · Departments · Concurrent
  duties · Change history) + a top bar with a search field; each page is a Polaris-style *Page*.
- **Surfaces** — light neutral canvas (#f1f2f4), white rounded cards with soft shadows, status
  badges (success / info / warn / critical), a green **contextual save bar**, banners, a **setup
  guide** with progress, metric tiles, and an **IndexTable** of employees.
- **Colour** — Shopify brand green (#008060) for accents/links/兼務, **dark** primary buttons.
- **Type** — Figtree (UI) · Noto Sans JP (Japanese). Subtle load fade-ups, hover elevation, focus
  rings — restrained, product-grade motion.
- `index.html` here is a **dashboard** (not a marketing cover): setup guide, metrics, recent
  changes, and a data-issues banner.

## Notes

- **Fonts** load from Google Fonts (needs a network connection); the CSS falls back to system
  serif/gothic/mono offline.
- **Printing** — `chart.html` includes an `@media print` A3-landscape stylesheet; use the browser's
  print dialog (Ctrl/Cmd + P → Save as PDF).
- The chart data is a faithful subset of the real masters (departments, rank order, disambiguated
  names, the three seeded 兼務 postings, and the known drift cases).
