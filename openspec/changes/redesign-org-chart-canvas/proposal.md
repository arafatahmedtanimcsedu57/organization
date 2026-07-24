## Why

The interactive chart today is a static, indented department tree (plus a secondary
dendrogram "Network" view) with no navigation: on the full 20-department / 95-person dataset
it runs off-screen horizontally and cannot be explored, searched, or edited in place. The
reference **Organogram** study (`org_chart/image.png`, `image copy.png`) sets the target — a
compact, window-aware top-down tree on a pannable/zoomable canvas with search and in-place
editing. This change re-skins and re-engineers the chart to that standard while keeping our
existing **department-based** data model.

## What Changes

- Add a **compact top-down tree** as the new default view: a tidy-tree layout
  (`d3-hierarchy` + `flextree`) that packs sibling subtrees and stacks deep/narrow branches
  vertically so horizontal width — and horizontal scrolling — stays minimal, adapting to the
  current viewport width.
- Wrap the chart in an **interactive canvas**: pointer-drag **pan**, wheel/control **zoom**
  (with a zoom-% readout and a fit-to-screen control), and **fullscreen** — the floating
  toolbar from the reference.
- Add **search-to-locate**: filter/highlight a matching person or department and auto
  fit-to-node.
- Add **inline CRUD on the canvas**: create / edit / deactivate departments and people, and
  add concurrent 兼務 postings, directly from a node — reusing the existing admin edit panel
  (`useEditorPanel`) and master-data APIs, so no CRUD logic is duplicated.
- **Re-theme the existing horizontal/indented tree** to the reference card aesthetic
  (avatar-style header, soft shadow, dotted-grid canvas, orthogonal elbow connectors) and keep
  it as the secondary view.
- **Remove the Network (dendrogram) view** — the compact top-down tree supersedes it; 兼務 is
  shown as a dashed cross-link on the top-down canvas. **BREAKING** (a view is removed).
- **Change PDF output from A3 landscape to A4 portrait, fit-to-width**, so the whole chart
  compacts onto A4 width. **BREAKING** (print format changes).
- Nodes stay **department-based**. Our data has no person→person reporting (`sys_user.Manager`
  is empty for every row), so we adopt the reference's look and interactions rather than its
  one-card-per-person structure; individuals nest inside a department card as its roster.

## Capabilities

### New Capabilities
- `chart-canvas`: the interactive organogram canvas — compact top-down layout with
  window-aware subtree compaction, pan / zoom / fullscreen navigation, search-to-locate, and
  inline create/edit/deactivate affordances that invoke the existing master-data operations.

### Modified Capabilities
- `design-system`: the chart's view set and visual language change — replace the plain indented
  tree with the organogram card/canvas aesthetic, retire the Network view, and offer
  **Top-down** (default) + re-themed **Horizontal** views instead of Tree + Network.
- `org-chart`: the printable-PDF requirement changes from **A3 landscape** to **A4 portrait,
  fit-to-width**.

## Impact

- **Web (`apps/web`)**: new canvas + top-down layout module under `pages/chart/`
  (`d3-hierarchy` + `flextree`), a zoom/pan/fullscreen controller, search, and node edit
  affordances reusing `useEditorPanel`; re-theme `DeptNode` / `OrgTree`; remove `NetworkView`
  and `networkLayout`; update `ChartPage`'s view toggle and `uiStore.viewMode`
  (`'tree' | 'network'` → `'topdown' | 'horizontal'`).
- **Dependencies**: add `d3-hierarchy` + `d3-flextree` (and likely `d3-zoom`). This **reverses**
  the earlier "no D3/graph library — plain CSS suffices" decision recorded in
  `rebuild-org-chart-fullstack/design.md` (Decision #6); the window-aware compaction and
  zoom/pan requested here are not achievable in plain CSS.
- **API (`apps/api`)**: `chart-pdf.service.ts` switches `page.pdf()` from A3/landscape to
  A4/portrait with fit-to-width; the print route (`/chart?print=1`) renders the top-down layout
  at print scale. `chart-pdf.render.test.ts` updated.
- **Tests / print**: journey-a PDF assertions (A3 → A4) and the print stylesheet update.
- **No schema or domain changes**: the `/chart` JSON (the `ChartNode` tree + rosters) is
  unchanged; this redesign is presentation and interaction only.
