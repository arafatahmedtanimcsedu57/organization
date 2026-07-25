## Context

The org chart is served by `apps/api` as a **department hierarchy** (`GET /chart` →
`ChartNode[]`, tiers division → department → group, each node carrying `managers[]` + `staff[]`
rosters). The hierarchy comes from `cmn_department.Parent` + title rank because
`sys_user.Manager` is empty for every row - there are **no person→person reporting edges** in
the data. The web app (`apps/web`) renders this two ways today:

- `pages/chart/OrgTree.tsx` → `DeptNode.tsx`: an **indented, left-to-right** tree of department
  cards with CSS elbow rails. Grows wide and scrolls off-screen on the full dataset.
- `pages/chart/NetworkView.tsx` + `networkLayout.ts`: a left→right **dendrogram** (x = depth,
  y = leaf order) with SVG connectors and dashed 兼務 arrows.

Print is `chart-pdf.service.ts`: Puppeteer loads `/chart?print=1` and calls
`page.pdf({ format: 'A3', landscape: true })`. `uiStore.viewMode` is `'tree' | 'network'`.

The reference **Organogram** study (`org_chart/`) is a person-based, top-down canvas with a
floating toolbar (search, fit, pan, zoom %, fullscreen) and an Assign drawer. We adopt its look
and interactions, **not** its person-node structure or its Assign feature (we have no
task-assignment concept). An earlier project decision (`rebuild-org-chart-fullstack/design.md`,
Decision #6) chose "plain CSS, no graph library"; the window-aware compaction and zoom/pan asked
for here are not achievable in plain CSS, so that decision is deliberately reversed.

## Goals / Non-Goals

**Goals:**
- A **compact top-down tree** (new default) whose horizontal footprint adapts to the viewport:
  sibling subtrees pack tightly and deep/narrow subtrees stack vertically, minimizing horizontal
  scroll.
- An **interactive canvas**: pan (pointer drag), zoom (wheel + buttons + fit-to-screen), and
  fullscreen, via a floating toolbar matching the reference.
- **Search-to-locate** a person or department (highlight + auto fit-to-node).
- **Inline CRUD** from a node (edit/deactivate department & people, add child department, add
  兼務 posting) reusing the existing edit panel and master-data APIs - zero duplicated CRUD.
- A **re-themed horizontal tree** as the secondary view, matching the reference card aesthetic.
- **A4 portrait, fit-to-width** PDF.

**Non-Goals:**
- No person→person org chart (data has no reporting edges) - nodes stay department-based.
- No "Assign" / effective-date-relationship UI from the mockup (no such feature here).
- No backend/domain/schema change: `/chart` JSON stays as-is; layout is computed client-side.
- No new master-data operations - the canvas is a new *entry point* to existing ones.

## Decisions

### 1. Keep department nodes; adopt the reference's look, not its structure
Each canvas node is a **department card** (head + roster), styled like the reference person
cards (avatar-style header, soft shadow, status accents). Individuals appear only *inside* a
card. Rationale: `Manager` is empty, so a person tree is un-derivable; forcing one would fabricate
reporting lines. Alternative (person nodes with synthesized edges) rejected as inventing data.

### 2. Layout: `d3-hierarchy` + `flextree`, rendered as React DOM
Compute positions with `d3-hierarchy` (`stratify`/`hierarchy`) fed into **`flextree`** (a tidy
Reingold–Tilford variant that supports **variable node sizes** - needed because department cards
differ in height with roster size). Render the resulting nodes as absolutely-positioned React
DOM cards inside a sized container; draw connectors in an SVG layer beneath them.
- *Why flextree over vanilla `d3.tree`:* `d3.tree` assumes uniform node size; our cards vary.
- *Why DOM cards over pure SVG/Canvas:* reuse existing Tailwind card components, keep text
  selectable/accessible, and hang inline-edit affordances off real DOM.
- *Alternatives considered:* hand-rolled RT compaction (more code/risk, no dep - rejected for
  time and quality); turnkey `d3-org-chart` (imperative D3 that fights React and is hard to theme
  pixel-exactly - rejected). Import submodules only (`d3-hierarchy`, `d3-flextree`, `d3-zoom`) to
  keep the bundle small.

### 3. Window-aware compaction (the "reuse the gaps" behavior)
flextree already interlocks sibling subtree bounding boxes (that *is* gap reuse). On top of it,
apply a **subtree-orientation rule**: a subtree whose measured width exceeds a fraction of the
viewport, or that is deep-and-narrow, is laid out as a **vertical stack** (children below each
other with elbow connectors) instead of a horizontal fan - reproducing the hybrid in
`org_chart/image.png`. The rule is recomputed on container resize (`ResizeObserver`) so the tree
re-packs to the current width. Thresholds are tunable constants, snapshot-tested on the real
20-dept dataset.

### 4. Navigation: `d3-zoom` transform + Fullscreen API
A single transform (`translate(x,y) scale(k)`) applied to the canvas group drives pan/zoom.
`d3-zoom` handles wheel/drag/pinch and gives programmatic, eased transitions for **fit-to-screen**
and **fit-to-node** (used by search). The transform lives in a ref/state kept **separate from
layout** so pan/zoom never triggers relayout - only a cheap `transform` update. Fullscreen uses
the Fullscreen API on the canvas container. Toolbar = search field, fit-to-screen, zoom-out /
`k%` / zoom-in, fullscreen (Assign button omitted). `prefers-reduced-motion` disables zoom
transitions (existing a11y requirement).

### 5. Search-to-locate
Build a lightweight index of nodes (department name/id) and roster people (display name, title)
from the `/chart` data. A match highlights the node and calls `fitToNode` to ease the viewport
onto it. Debounced; Enter cycles multiple matches.

### 6. Inline CRUD reuses `useEditorPanel` + master-data APIs
A node exposes contextual actions - **Edit department**, **Add sub-department**, **Add 兼務
posting**, **Edit / Deactivate person** (on a roster row). Each opens the **existing** editor
panel (extracted in the recent refactor) bound to the existing RTK Query mutations
(`departmentsApi`, `employeesApi`, `assignmentsApi`). On success, RTK Query tag invalidation
already refetches `/chart`, so the canvas updates with no bespoke sync. No new endpoints; the
canvas is purely a new UI surface over `master-data-management` / `concurrent-duties`.

### 7. View set: `topdown` (default) + `horizontal`; remove `network`
`uiStore.viewMode` becomes `'topdown' | 'horizontal'` (default `'topdown'`). `NetworkView.tsx` and
`networkLayout.ts` are deleted; 兼務 is drawn on the top-down canvas as a **dashed cross-link**
between the two departments (reusing the source-department resolution logic currently in
`networkLayout.ts`). The horizontal view keeps `DeptNode`/`OrgTree` but re-themed to the new card
language. `ChartPage` renders the top-down canvas interactively and **always renders top-down for
print** (as it already forces the tree for print today).

### 8. Print: A4 portrait, fit-to-width
The top-down layout has an intrinsic pixel size `W × H`. For `?print=1`, wrap the canvas in a
print container that scales content by `scale = printableWidthPx / W` so the full width fits A4
portrait; height flows onto additional pages. `chart-pdf.service.ts` switches to
`page.pdf({ format: 'A4', landscape: false, printBackground: true })`; the `@page`/print
stylesheet sets margins and the fit-to-width transform, hides chrome (toolbar/no-print), and
expands every roster in full (existing "preserve complete rosters when printing" requirement).
Connectors live in the same scaled SVG layer, so they scale with the cards.

## Risks / Trade-offs

- **Compaction quality on real data** → flextree gives tidy interlocking; the vertical-stack rule
  is custom. *Mitigation:* threshold constants + snapshot/visual tests on the full dataset; tune
  before shipping default.
- **Very tall roster cards** (e.g. the large ITサポート roster) dominate height and hurt
  packing → *Mitigation:* keep the existing interactive roster-truncation affordance
  (`＋N 課員`), expand fully only for print.
- **A4 fit-to-width legibility** - scaling a 95-person / 20-dept org to ~190mm can make text
  small → *Mitigation:* fit width but allow multi-page height; enforce a minimum readable scale
  and let content overflow to more pages rather than shrink below it; documented trade-off.
- **d3-zoom ↔ React** re-render churn → *Mitigation:* transform in a ref, memoized layout, update
  only the group's `transform`; never relayout on pan/zoom.
- **Bundle size from D3** (reverses the no-dep decision) → *Mitigation:* import only the three
  submodules; they are tree-shakeable and small.
- **Fullscreen + print interaction** and browser differences → *Mitigation:* print always uses
  the dedicated `?print=1` route, independent of interactive fullscreen state.
- **Overlap with the in-progress shell refresh** (Breadcrumb/theme changes landing now) →
  *Mitigation:* build on the new design tokens; no conflicting files (chart vs shell).

## Migration Plan

1. **Additive:** add `d3-hierarchy`/`d3-flextree`/`d3-zoom`; build the top-down canvas behind the
   view toggle *alongside* the existing tree (no removals yet).
2. Re-theme `DeptNode`/`OrgTree` to the new card language (horizontal view).
3. Flip default `viewMode` to `'topdown'`; map any persisted `'network'`→`'topdown'`,
   `'tree'`→`'horizontal'`.
4. Remove `NetworkView`/`networkLayout`; move 兼務 cross-link rendering onto the canvas.
5. Switch print to A4 portrait fit-to-width; update `chart-pdf.render.test.ts` and journey-a PDF
   assertions.
6. **Rollback:** revert default `viewMode` and the print format (A4→A3); the removed Network view
   is restorable from VCS if needed. Backend/domain untouched throughout, so rollback is
   web/PDF-only.

## Open Questions

- Exact compaction thresholds (viewport-width fraction, depth/breadth) that switch a subtree to a
  vertical stack - resolve empirically against the dataset.
- In-node roster display: full list vs. head + count + expand (interactive), always full (print).
- Minimum acceptable print scale / max page count for A4 on the largest org.
- Search scope: department + person name only, or also title/role; multi-match cycling UX.
