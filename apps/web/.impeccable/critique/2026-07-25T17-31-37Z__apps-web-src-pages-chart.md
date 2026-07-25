---
target: apps/web/src/pages/chart
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-07-25T17-31-37Z
slug: apps-web-src-pages-chart
---
Method: dual-agent (A: a16f553a8b04d33a2 · B: a16ed9774aad51e1c)

# Critique — `/chart` (Organo Organization Chart)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Zoom %, search hit-count, hover spotlight are good — but selecting a node produces no visible response (editor opens off-screen). |
| 2 | Match System / Real World | 3 | Correct domain vocabulary (名 / 役職 / 課員 / 兼務); undercut by role labels truncated to "Business…", "Senior C…". |
| 3 | User Control and Freedom | 3 | Pan / zoom / fit / fullscreen / search / expand; Cancel on forms; Esc / outside-click closes menus. No undo beyond `window.confirm`. |
| 4 | Consistency and Standards | 2 | Canvas truncates role labels the print report spells out; two competing search boxes; native `window.confirm` vs custom modals; the color system contradicts itself. |
| 5 | Error Prevention | 2 | Destructive "Deactivate" on real personnel is a green text link identical to "Edit", guarded only by a browser confirm. |
| 6 | Recognition Rather Than Recall | 2 | The color legend is broken by a collision; identical truncated card titles force you to remember which "Software Development…" is which. |
| 7 | Flexibility and Efficiency | 3 | Keyboard pan/zoom, search-cycle, subset PDF export. No node-to-node keyboard traversal. |
| 8 | Aesthetic and Minimalist Design | 3 | Clean Polaris-style surfaces, restrained, strong dark mode; the report is beautiful. |
| 9 | Error Recovery | 3 | `DataIssuesStrip` surfaces build warnings; "0 hits" turns red; ErrorState has retry. The strip is a flat text wall when long. |
| 10 | Help and Documentation | 2 | Legend explains color + 兼務, but click-to-edit is undiscoverable and pan/zoom has no first-run hint. |
| **Total** | | **26/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict — HIGH (authored for this product)

**LLM assessment.** This is emphatically not reskinned admin scaffolding. It is built around concepts you'd never see in a generic tool: 兼務 (kenmu) concurrent duties rendered as dashed "(兼)" chips *and* curved name-to-name links that self-label their source department/title; branch-colored division rails; rosters keyed by Japanese position rank; collision-disambiguated surnames (Sato(K)/Sato(Y)); a bilingual Noto Sans JP + Figtree type system. The **print/PDF report** is a genuine showpiece — a 株式会社シスラボ masthead, "Effective July 2026 / 4 Divisions / 98 Positions", per-division leadership badges, and 兼務 provenance callouts. The one drift toward generic: the page *shell* (sidebar + breadcrumb + a Card whose header is literally the word "Chart"), and — ironically — the interactive canvas is a *weaker* expression of the data than the report it generates.

**Deterministic scan.** The static `detect.mjs` scan of the chart TSX came back **CLEAN (0 findings, exit 0)** — TSX parsed fine. That's expected: the real problems live in *rendered geometry and computed styles*, which a static Tailwind-utility scan can't see. The in-page overlay (run against the live DOM in a headless browser) reported, after removing false positives: **9 genuine low-contrast hits** — amber `#b98900` text on white at **3.2:1** (fails WCAG AA 4.5:1) on the zoom-% / count pills — and **75 undersized-ui-text** hits on the 10.5px roster names (a deliberate density tradeoff, but a real readability floor at auto-fit zoom). Detector hits I discarded as false positives: `text-overflow` (22 — that's `.truncate` working as designed), `clipped-overflow-container` (the pan/zoom surface *needs* `overflow-hidden`), `ai-color-palette` (the flagged gradient is a data-driven branch dot), and most `layout-transition` (intentional expand/collapse motion).

Where the two methods meet: the detector's 22 `text-overflow` hits are technically "working truncation," but they are the mechanical fingerprint of the very real Priority Issue #3 below — the review explains the UX cost the detector can only measure. And the P0 color collision is something *only* the design review + live inspection caught; it's a data-hashing logic bug, invisible to a style scan.

**Visual overlays.** The detector ran in a headless browser during Assessment B (injection succeeded, mutation confirmed) and the live server was stopped afterward — so there is **no persistent overlay tab open in your browser** right now. Screenshots were captured as evidence (paths at the end).

## Overall Impression

The bones are strong and the product character is real — this does not look like everyone else's admin app, and the printed report is the best-designed artifact in the whole project. But the *interactive* chart has one embarrassing correctness bug (two of four divisions are the same color) and one interaction that feels broken (clicking a node appears to do nothing). Fix those two and the perceived quality jumps a full band. The single biggest opportunity: the canvas should be as legible and as clearly-colored as the report it produces.

## What's Working

1. **The print/PDF report is award-caliber and unmistakably this product's.** It re-composes the data as a readable A4 narrative — banded masthead, per-division leadership badges, 兼務 provenance ("concurrent from Sales Division · Solution Sales Dept. – Section 1 · Manager"), "No members currently assigned" empty states — and it spells out every role label the canvas hides. It's the strongest thing on the surface.
2. **The 兼務 interaction model is a specific solution to the hardest domain problem.** Dashed chips at the person's row *plus* on-canvas curved links that spotlight on hover and self-label — exactly the concept Requirement 4 is about, made legible.
3. **Theming discipline.** One token layer drives light/dark with no per-component variants; dark mode is fully realized (deepened branch tints, lifted surfaces, brightened rails), and print forces the light palette so a dark-mode user still gets legible paper.

## Priority Issues

**[P0] Branch colors collide — the chart's own legend can't distinguish two of four divisions.** `branchColorFor` hashes the department id `% 6`, so System Division and Management Department both resolve to the same purple `rgb(138,92,196)` (confirmed live). Every rail dot, division tint, and legend swatch for those two is identical — the primary "which branch?" encoding is 50% broken with only four divisions, and it gets worse past six. *This is the detail a reviewer notices first.*
- **Fix:** assign palette entries by the root's de-duplicated ordinal index, not by hash, guaranteeing distinct colors up to palette size (and expand the palette or add a pattern fallback beyond it).
- **Command:** `/impeccable colorize`

**[P1] Selecting a node gives no above-the-fold feedback.** The CanvasEditor mounts as a full-width Card *after* the ~72vh canvas (`editorTop ≈ 927`, `innerHeight = 900`, `scrollY = 0`, no `scrollIntoView`). The maintainer clicks a card, sees only a faint ring, and concludes nothing happened — the entire edit surface is invisible.
- **Fix:** make it a right-side drawer/overlay pinned in the viewport, or at minimum `scrollIntoView` + slide-in on select.
- **Command:** `/impeccable layout`

**[P1] Department titles truncate to indistinguishable stubs, with no tooltip.** At the 61% auto-fit default, four cards read "Software Development…" and five read "Solution Sales Dept. …"; the name span is `truncate` with no `title` attribute, so there is no hover recovery. You cannot tell the departments apart without zooming or opening the editor — while the report renders them in full. (This is the design cost behind the detector's 22 `text-overflow` hits.)
- **Fix:** add a `title`/tooltip, allow two-line wrap, or surface the distinguishing "Group N / Section N" suffix.
- **Command:** `/impeccable clarify`

**[P2] Destructive actions on real personnel are undifferentiated and under-guarded.** "Deactivate" (department- and person-level) is a plain green link visually identical to "Edit", separated only by proximity and protected solely by `window.confirm`. For an HR maintainer editing live records this is a real misclick-into-data-loss path.
- **Fix:** critical-tone styling + separation for destructive actions, and a confirmation modal that names the record and its chart impact.
- **Command:** `/impeccable harden`

**[P2] Mobile is broken, not just cramped.** The floating toolbar (224px search + zoom cluster + fullscreen) overflows a 390px viewport, bleeding off both edges with "+" clipped and fullscreen gone; auto-fit collapses to ~30%, rendering names unreadable. (The 9 amber-pill contrast hits vanish at 390px only because the pills scroll off-screen.)
- **Fix:** responsive toolbar (wrap/stack, shrink or drop the search field, hide fullscreen on touch) and a mobile fallback toward the report layout.
- **Command:** `/impeccable adapt`

## Persona Red Flags

- **Sam (accessibility — screen reader + keyboard):** the chart is absolutely-positioned `<div role="group">` cards, so hierarchy is purely visual; `TreeEdges` and `KenmuLinks` are `aria-hidden`, so a screen-reader user gets a *flat* list of cards with no parent/child or 兼務 relationship. `role="application"` on the canvas suppresses browse-mode reading. After selecting a node the editor is off-screen, so a keyboard user has no focus destination. Per-row Edit/Deactivate announce with no owning-person context. Plus the amber pills fail AA contrast (3.2:1).
- **Alex (power user):** no node-to-node keyboard traversal (only pan/zoom); two search fields (global topbar "Search employees, departments…" vs canvas "Search employee / department…") create an ambiguous "which one finds someone *on the chart*?" moment; truncated titles slow scanning.
- **Riley (stress-tester):** identical truncated titles; empty divisions render as hollow "0 名" cards; a 5th/6th+ division wraps the 6-color palette into more collisions.
- **HR maintainer (project persona):** edits live people via a green "Deactivate" link + browser confirm, no in-canvas preview/undo; clicking a person's card doesn't reveal their editor (off-screen); 兼務/date fields render as US `mm/dd/yyyy` on a Japanese HR tool.

## Minor Observations

- The Card header label "Chart" is redundant beneath an "Organization chart" H1 — dead copy.
- Toolbar controls use glyph characters (−, ＋, ⤢, ⛶) rather than icons; functional but reads utilitarian next to the polished report.
- `DataIssuesStrip` is empty in the current seed; by code it's a `<br/>`-separated flat list that will become a wall of text if many warnings fire — group by kind with counts.
- The 兼務 hover spotlight is real but very subtle at auto-fit zoom; discoverability of the hover-to-trace interaction is low.

## Questions to Consider

- If the print report is the better-designed, more-readable expression of this data, why is the interactive canvas the default surface rather than a filterable, zoomable version *of the report layout*?
- Two search boxes on one screen: does the maintainer ever learn which one pans the chart to a person vs. navigates away?
- What is a click on a department card *promising*? Right now it promises editing but delivers an invisible panel — should cards open a peek/summary, with edit as a deliberate secondary step?
