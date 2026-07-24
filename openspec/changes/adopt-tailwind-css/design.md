## Context

Styling for the running app lives entirely in `apps/web`:

- **~1,300 lines of hand-written CSS** across six files in `src/design/`: `tokens.css` (CSS-variable design tokens), `shell.css`, `components.css`, `chart.css`, `fonts.css` (`@fontsource` imports), and `print.css` (A3-landscape rules). All are imported in `main.tsx`.
- **Semantic class names** (`.btn`, `.card`, `.dept`, `.dn`, `.rail`, `.savebar`, `.itable`, …) applied across ~23 components and pages, plus small design components (`Button`, `Card`, `Badge`, `Banner`, `IndexTable`, `SaveBar`, state components) that compose those classes.
- **Print/PDF export** (Puppeteer, A3 landscape) depends on `print.css` + the `@page` rule and on the full-roster print expansion.
- **Offline Japanese rendering**: fonts are self-hosted via `@fontsource` (Figtree + Noto Sans JP) so Puppeteer renders CJK with **zero network access**.
- **Playwright E2E** (`apps/web/e2e/*.spec.ts`) selects nodes by **CSS class name** (`.tree`, `.node`, `.dn`, `.network`, `.itable tbody tr`, `.person`, `.dept`, `.line`, `.pos`, `.p.kenmu`, `.kenmu-mark`, `.kenmu-src`) — so class names are load-bearing for the test suite, not just for styling.

Stack: npm-workspaces monorepo, Vite 8, React 19. Only `apps/web` has CSS; `apps/api` and `packages/domain` have none. The design-system spec requires centralized tokens, an indented tree of cards, color-coded branch rails, sourced 兼務 markers, full-roster print, Tree/Network views, and accessible + print-ready styling — all of which must survive the migration unchanged in outcome.

## Goals / Non-Goals

**Goals:**

- Make **Tailwind CSS the styling authority** across `apps/web` — visual styling expressed as utility classes in JSX.
- Expose the existing design tokens through Tailwind's `@theme`, **keeping token names and values** so the Organo Admin look is preserved by construction.
- Keep the app **visually identical** before/after.
- Keep the **PDF/print export**, **offline CJK fonts**, and **Playwright E2E suite** all passing.

**Non-Goals:**

- No visual redesign, no new palette, no new component library (no shadcn/Radix) — plain Tailwind utilities + the existing small React components.
- No changes to `apps/api` or `packages/domain` (they carry no CSS).
- The static HTML design studies under `ui_design/` are **out of scope** — they are reference prototypes, not part of the shipped app, and keep their own CSS.
- Not rewriting the Playwright specs (see Decision 4).

## Decisions

### 1. Tailwind CSS v4 (CSS-first) over v3 (JS-config)

Use Tailwind **v4** with the first-party **`@tailwindcss/vite`** plugin. Rationale: v4's `@theme` maps our existing CSS-variable tokens **1:1** into utilities, it needs **no `tailwind.config.js`** and no separate PostCSS setup, content is auto-detected, and it integrates with Vite via a single plugin. _Alternative — v3:_ requires `tailwind.config.js`, `postcss.config.js`, and manual `content` globs, and maps our token vars less cleanly. Rejected.

### 2. Preserve tokens by porting `:root` variables into `@theme`

Port every token in `tokens.css` (`--bg`, `--surface`, `--text-sub`, `--brand`, `--r-lg`, `--shadow-1`, `--sidebar-w`, `--topbar-h`, the font stacks, status tones, …) into an `@theme` block so they become Tailwind utilities (`bg-surface`, `text-sub`, `rounded-lg`, `shadow-1`, `w-sidebar`, etc.) that keep the **same names**. Rationale: guarantees visual parity and keeps a single source of truth for tokens. _Alternative — adopt Tailwind's default palette/scale:_ would shift the look; contradicts the "preserve" goal. Rejected.

### 3. Base-layer concerns stay in one Tailwind entry stylesheet

A new `src/design/tailwind.css` becomes the single entry: `@import 'tailwindcss'`, the `@fontsource` `@import`s, the `@theme` token block, an `@layer base` for the few global resets we still want (focus-ring, `prefers-reduced-motion` disable of entry animations, keyframes), and a print block carrying `@page { size: A3 landscape }`. App chrome is hidden in print via Tailwind's **`print:hidden`** variant on the sidebar/topbar/save-bar plus the full-roster print expansion. Rationale: `@page`, `@font-face`, keyframes, and media resets are **not utilities** and belong in base CSS. `main.tsx`'s six CSS imports collapse to this one entry.

### 4. Retain the E2E-selected class names as style-free semantic hooks

The Playwright suite selects on `.tree`, `.node`, `.dn`, `.network`, `.itable`, `.person`, `.dept`, `.line`, `.pos`, `.p`, `.kenmu`, `.kenmu-mark`, `.kenmu-src`. Keep these **exact class names in the markup as hooks that carry no CSS**, applying Tailwind utilities alongside them. Rationale: **zero test-file churn** and it honors the quality-assurance guarantee that the suite stays green in CI; the classes become selectors, not styles, so Tailwind remains the styling authority. _Alternative — migrate the E2E hooks to `data-testid`:_ cleaner long-term but edits three spec files and risks destabilizing a currently-green suite; deferred to a follow-up (see Open Questions).

### 5. DRY variants in TypeScript, not in CSS

Where a class string repeats (Button variants, Badge tones, the department-card tiers), keep the existing small React components and compose utility strings in TS (the `classes.join(' ')` pattern already in `Button.tsx`). Avoid `@apply` except for a genuinely global element rule. Rationale: keeps utilities **visible in the JSX** (the point of the migration) while removing duplication in code, not in a stylesheet.

### 6. Scope = shipped app source only

Migrate `apps/web/src/**`. Leave `ui_design/` untouched. Rationale: those are throwaway visual studies, not built or served by the app.

## Risks / Trade-offs

- **Print/PDF fidelity** (Puppeteer A3 depends on `@page` + print rules) → keep `@page` in the entry stylesheet, re-express hide/flatten with `print:` variants, then re-run the journey-a PDF-export E2E and eyeball a rendered PDF.
- **Offline Japanese fonts** (must stay CDN-free) → keep the `@fontsource` `@import`s in the entry; Tailwind's Preflight does not touch `@font-face`; verify the exported PDF renders Japanese.
- **E2E selector breakage** (class-based selectors) → mitigated by Decision 4 (preserve hook classes); run the full Playwright suite as the gate.
- **Tailwind Preflight resets base styles** (margins, headings, lists) → Preflight is desirable (it replaces our ad-hoc resets), but audit any spot relying on default UA styling and restore via `@layer base`.
- **Utility verbosity / drift** → extract repeated utility strings into the shared React components (Decision 5).
- **Unused CSS** → v4 auto-detects template content; no manual purge/`content` config needed.

## Migration Plan

1. Add `tailwindcss@^4` + `@tailwindcss/vite` to `@org-chart/web`; register the plugin in `apps/web/vite.config.ts`.
2. Create `src/design/tailwind.css` (Decision 3: Tailwind import, `@fontsource` imports, `@theme` from `tokens.css`, base layer, print/`@page` block). Point `main.tsx` at this single entry.
3. Migrate in dependency order, keeping hook classes: `src/design/components/*` (Button, Card, Badge, Banner, IndexTable, SaveBar, Loading/Empty/Error states) → `src/layouts/*` (RootLayout, Sidebar, Topbar) → `src/pages/admin/*` → `src/pages/chart/*` (DeptNode, OrgTree, RosterLines, Legend, NetworkView, DataIssuesStrip) → remaining pages.
4. Delete `shell.css`, `components.css`, `chart.css`, `tokens.css` once their rules are gone; keep print/font concerns only in the entry.
5. **Verify:** `tsc --noEmit`, `eslint`, `vite build`, the full Playwright E2E suite (all three journeys incl. PDF export), a visual spot-check against the pre-migration UI, and a manual A3 PDF check for Japanese glyphs + full rosters.

**Rollback:** code-only — revert the branch; the deleted CSS files are restored from git. No schema, data, or API changes are involved.

## Open Questions

- Migrate the E2E hooks from class names to `data-testid` as a follow-up (Decision 4)? Recommended but non-blocking.
- Is a design-token config ever needed by another app? Only `apps/web` has CSS today, so a shared Tailwind theme package is unnecessary now.
