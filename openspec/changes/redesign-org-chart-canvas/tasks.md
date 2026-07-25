## 1. Dependencies and scaffolding

- [x] 1.1 Add `d3-hierarchy`, `d3-flextree`, and `d3-zoom` (+ their `@types/*`) to `apps/web/package.json`, importing submodules only to keep the bundle small.
- [x] 1.2 Create a `pages/chart/topdown/` module and a `ChartCanvas` shell component mounted by `ChartPage` behind the view toggle (no behavior yet).
- [x] 1.3 Change `uiStore.viewMode` to `'topdown' | 'horizontal'` (default `'topdown'`); map legacy `'network'`→`'topdown'` and `'tree'`→`'horizontal'`.

## 2. Top-down layout engine

- [x] 2.1 Build `topdownLayout.ts`: turn `ChartNode[]` roots into a `d3-hierarchy` and run `flextree` with per-node measured sizes, outputting absolute x/y + width/height per node.
- [x] 2.2 Derive variable node heights from roster size (measured or a line-height model) and feed them to flextree.
- [x] 2.3 Implement the compaction rule: lay a subtree out as a vertical stack (elbow connectors) when it is deep/narrow or would exceed a viewport-width fraction if fanned out; expose thresholds as tunable constants.
- [x] 2.4 Recompute layout on container resize via `ResizeObserver`; memoize so pan/zoom never triggers a relayout.
- [x] 2.5 Snapshot-test the layout on the full 20-department dataset (total width, no node overlaps).

## 3. Canvas navigation and toolbar

- [x] 3.1 Wrap the layout in a transform group and wire `d3-zoom` for wheel/drag pan + zoom, keeping the transform in a ref/state separate from layout.
- [x] 3.2 Implement `fitToScreen` and `fitToNode` eased transitions; disable transitions under `prefers-reduced-motion`.
- [x] 3.3 Build the floating toolbar: search field, fit-to-screen, zoom-out / `k%` readout / zoom-in, and fullscreen (Fullscreen API). Omit the reference's Assign button.
- [x] 3.4 Keyboard support: focusable nodes; arrow keys pan, `+`/`-` zoom, `0` reset; visible focus ring.

## 4. Node rendering and connectors

- [x] 4.1 Render department nodes as absolutely-positioned React cards in the organogram aesthetic (avatar-style header, roster rows, tier styling, branch color) on a dotted-grid canvas.
- [x] 4.2 Draw parent→child connectors (orthogonal elbows) in an SVG layer beneath the cards, scaling with the canvas transform.
- [x] 4.3 Draw 兼務 as dashed cross-links (source→target department) labeled with person + source title; port the source-department resolution from `networkLayout.ts` before deleting it.
- [x] 4.4 Interactive roster truncation (`＋N 課員`) with an expand affordance.

## 5. Search-to-locate

- [x] 5.1 Build a search index of departments + roster people from the `/chart` data.
- [x] 5.2 Wire the toolbar search: debounce, highlight the match, `fitToNode`; Enter cycles multiple matches; show an empty state on no match.

## 6. Inline CRUD from the canvas

- [x] 6.1 Add node context actions: Edit department, Add sub-department, Add 兼務 posting, Edit/Deactivate person (roster row).
- [x] 6.2 Open the shared `useEditorPanel` editor bound to `departmentsApi` / `employeesApi` / `assignmentsApi` - no duplicated CRUD logic.
- [x] 6.3 Confirm RTK Query tag invalidation refetches `/chart` so the canvas updates without a manual refresh.

## 7. Horizontal view re-theme and view switching

- [x] 7.1 Re-theme `DeptNode` / `OrgTree` to the organogram card aesthetic; keep them as the Horizontal (secondary) view.
- [x] 7.2 Update the `ChartPage` toggle to Top-down (default) / Horizontal and make Top-down the default.
- [x] 7.3 Delete `NetworkView.tsx` and `networkLayout.ts` (after 4.3), and remove Network from the toggle and any references/tests.

## 8. Print / PDF (A4 portrait, fit-to-width)

- [x] 8.1 For `?print=1`, always render the Top-down layout with every roster expanded, scaled to fit A4 width (multi-page height allowed), regardless of the active interactive view.
- [x] 8.2 Update the print stylesheet: A4-portrait `@page` + margins, fit-to-width transform, hide chrome/toolbar (`no-print`).
- [x] 8.3 Switch `chart-pdf.service.ts` to `page.pdf({ format: 'A4', landscape: false, printBackground: true })`.
- [x] 8.4 Enforce a minimum readable scale; when content would fall below it, overflow to additional pages instead of shrinking further.

## 9. Tests and QA

- [x] 9.1 Update `chart-pdf.render.test.ts` for A4 portrait output.
- [x] 9.2 Update journey-a E2E: assert the PDF is A4 (not A3); add Top-down/Horizontal toggle, a zoom/pan/fullscreen smoke, and search-to-locate.
- [x] 9.3 Add an E2E for inline CRUD on the canvas (edit a department, add a 兼務 posting) reflecting on the chart.
- [x] 9.4 `npm run typecheck` + build; verify no `network`/`Network` chart references remain; run the E2E suite against `docker compose up`.
- [x] 9.5 Visual pass against `org_chart/image.png` (card style, connectors, toolbar, compaction) on the full dataset.
