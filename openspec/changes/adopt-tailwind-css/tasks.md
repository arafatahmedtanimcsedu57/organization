## 1. Install & wire Tailwind (apps/web)

- [x] 1.1 Add `tailwindcss@^4` and `@tailwindcss/vite` as devDependencies of `@org-chart/web` and install
- [x] 1.2 Register the Tailwind plugin in `apps/web/vite.config.ts` (`plugins: [react(), tailwindcss()]`)
- [x] 1.3 Create `src/design/tailwind.css` entry: `@import 'tailwindcss'`, then the `@fontsource` imports (moved from `fonts.css`)
- [x] 1.4 Add an `@theme` block porting every token from `tokens.css` (surfaces, text, borders, brand/action, status tones, radius, shadow, `--sidebar-w`/`--topbar-h`, font stacks) with the same names
- [x] 1.5 Add an `@layer base` for the resets/behaviors still needed: keyboard focus ring, `prefers-reduced-motion` disable of entry animations, and any keyframes
- [x] 1.6 Add the print block: `@page { size: A3 landscape; margin: 12mm }` plus the flatten rules that can't be expressed as `print:` utilities
- [x] 1.7 Replace the six CSS imports in `src/main.tsx` with the single `tailwind.css` entry; run `vite build` to confirm Tailwind compiles

## 2. Migrate shared design components (`src/design/components/*`)

- [x] 2.1 `Button.tsx` — express `.btn` + variants (secondary/primary/brand/plain/critical/ghostdark) and `sm` size as utility strings composed in TS
- [x] 2.2 `Card.tsx` and `Badge.tsx` — utilities for surface/border/radius/shadow and each status tone
- [x] 2.3 `Banner.tsx`, `SaveBar.tsx` (keep `.savebar` hook; `print:hidden`), `IndexTable.tsx` (keep `.itable` hook)
- [x] 2.4 `LoadingState.tsx`, `EmptyState.tsx`, `ErrorState.tsx`
- [x] 2.5 Confirm `src/design/components/index.ts` exports are unchanged and everything typechecks

## 3. Migrate the app shell (`src/layouts/*`)

- [x] 3.1 `RootLayout.tsx` — grid/flex shell using `w-sidebar`/`h-topbar` token utilities
- [x] 3.2 `Sidebar.tsx` (keep `.sidebar` hook; `print:hidden`) and `Topbar.tsx` (keep `.topbar` hook; `print:hidden`)
- [x] 3.3 `icons.tsx` — sizing/color utilities if any inline styles remain (none — SVG sizes come from parent `[&_svg]` utilities)

## 4. Migrate the admin pages (`src/pages/admin/*`)

- [x] 4.1 `AdminLayout.tsx` and `EmployeesPage.tsx` (preserve `.itable`, `.person`, `.dept` hooks the E2E suite selects on)
- [x] 4.2 `DepartmentsPage.tsx` and `AssignmentsPage.tsx`
- [x] 4.3 `HistoryPage.tsx`, `SettingsPage.tsx`, `HomePage.tsx`

## 5. Migrate the chart (`src/pages/chart/*` + `ChartPage.tsx`)

- [x] 5.1 `DeptNode.tsx` — division/department/group tiers, left accent stripe, node marker (keep `.node`, `.dn`, `.dept` hooks); wire branch color from `branchColor.ts` via inline CSS var, not a hardcoded class
- [x] 5.2 `OrgTree.tsx` / `RosterLines.tsx` — roster lines and connector rails that terminate at the last child (keep `.tree`, `.line`, `.pos`, `.p`, `.kenmu`, `.kenmu-mark`, `.kenmu-src` hooks)
- [x] 5.3 `NetworkView.tsx` (keep `.network` hook) and `networkLayout.ts` styling (pure layout math — no CSS)
- [x] 5.4 `Legend.tsx`, `DataIssuesStrip.tsx`, and `ChartPage.tsx` (Tree/Network toggle, roster truncation affordance, `print:` full-roster expansion)

## 6. Remove legacy CSS

- [x] 6.1 Delete `src/design/tokens.css`, `src/design/shell.css`, `src/design/components.css`, `src/design/chart.css`
- [x] 6.2 Delete `src/design/fonts.css` and `src/design/print.css` once their content is confirmed to live in `tailwind.css`
- [x] 6.3 Grep `apps/web/src` for any remaining semantic style class that is neither a Tailwind utility nor a retained E2E hook, and migrate it

## 7. Verify (visual, print, tests)

- [x] 7.1 `npm run typecheck` and `npm run lint` clean for `@org-chart/web`; `vite build` succeeds (repo-wide lint has 5 pre-existing errors in `apps/api`, outside this change's scope)
- [x] 7.2 Visual spot-check: shell, admin tables, and chart match the pre-migration Organo Admin look (screenshots of chart + employees confirm branded shell, cards, badges, avatars, branch-colored tiers, connector rails, and the dashed 兼 chip)
- [x] 7.3 Run the full Playwright E2E suite (`test:e2e`) — all three journeys pass, including the PDF export (green serially against the seeded fixtures)
- [x] 7.4 Manual PDF check: A3 landscape, app chrome hidden, every roster expanded in full, Japanese glyphs render from bundled fonts (no network) — exported PDF is 314 KB, A3 landscape, full chart with Japanese names/departments/titles and 兼務 chips
- [x] 7.5 Confirm `docker compose up` still brings the app up and the chart loads end-to-end (stack healthy; `/api/chart` 200 and chart renders)

## 8. Pre-existing blockers fixed to make the documented `docker compose up` / E2E actually run

<!-- These were uncovered by being the first to run the full stack (it never started before because of 8.1); none are caused by the Tailwind migration. -->

- [x] 8.1 Copy `tsconfig.base.json` into the `apps/api` and `apps/web` Docker images (both `tsconfig.json` extend it; without it both containers crash-looped)
- [x] 8.2 Allow the `web` service host on the Vite preview server (`allowedHosts`) so the api's Puppeteer PDF renderer (`Host: web`) isn't blocked — the PDF was rendering Vite's block page
- [x] 8.3 Make the Playwright journeys deterministic: target the page title by heading `level: 1` (immune to the loading-state card header), identify the new 兼務 posting row by person **and** department, loosen the A3 width assertion to ±2pt (Chromium A3 rounding), and run the mutating journeys serially (`workers: 1`)
