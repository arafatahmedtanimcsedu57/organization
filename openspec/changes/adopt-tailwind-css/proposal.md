## Why

The web app's styling is ~1,300 lines of hand-authored CSS across six files in `apps/web/src/design/`, consumed through bespoke semantic class names (`.btn`, `.dept`, `.rail`, `.savebar`…) spread over ~23 components. Every visual tweak means round-tripping between a `.tsx` file and a distant stylesheet, class names drift from the markup they style, and there is no shared utility vocabulary. Adopting **Tailwind CSS** puts styling inline with the markup, turns the existing design tokens into first-class theme utilities, and lets any maintainer restyle a component without hunting through custom CSS - while keeping the current Organo Admin look pixel-for-pixel.

## What Changes

- **Add Tailwind CSS v4** and the `@tailwindcss/vite` plugin to `apps/web` (CSS-first config, no `tailwind.config.js` needed).
- **Map the existing design tokens into Tailwind's `@theme`** so they become utilities (`bg-surface`, `text-sub`, `border`, `rounded-lg`, `shadow-1`, the brand green, the `--sidebar-w`/`--topbar-h` layout vars, etc.). Token names carry over, so the visual language is preserved by construction.
- **Migrate all styled components/pages from semantic classNames to Tailwind utilities** - the app shell, sidebar, topbar, cards, badges, banners, buttons, save bar, index table, and the entire chart (division/department/group cards, color-coded branch rails, sourced 兼務 chips, roster lines, and the Network view).
- **BREAKING (internal):** remove the hand-written stylesheets `shell.css`, `components.css`, and `chart.css` once their rules are expressed as utilities; fold `tokens.css` into the Tailwind `@theme` entry.
- **Keep base-layer concerns in the Tailwind CSS entry, not as utilities:** the `fonts.css` `@fontsource` imports and the `@page { size: A3 landscape }` rule stay in the entry stylesheet, and the print hide/flatten rules are re-expressed with Tailwind's `print:` variant plus a small `@layer` block - preserving the Puppeteer PDF export and full-roster print expansion.
- **Preserve accessibility and motion behavior** (visible focus rings, `prefers-reduced-motion`) via Tailwind variants.

## Capabilities

### New Capabilities
<!-- None. This change alters how the existing design-system capability is implemented and adds a styling-authoring requirement to it; it introduces no new capability. -->

### Modified Capabilities

- `design-system`: Styling is now authored with **Tailwind CSS utility classes**, and the centralized design tokens are exposed through Tailwind's **`@theme`** rather than a hand-written `tokens.css` + per-screen stylesheets. The design-system's outcomes are unchanged (consistent app shell, centralized tokens, indented tree of cards, color-coded branch rails, sourced 兼務 markers, full-roster print, Tree/Network views, accessible + print-ready styling); only the authoring mechanism changes.

## Impact

- **Affected code:** `apps/web` only. The API (`apps/api`) and `packages/domain` carry no CSS and are untouched.
- **New dependencies:** `tailwindcss@^4` and `@tailwindcss/vite` as devDependencies of `@org-chart/web`; `apps/web/vite.config.ts` gains the Tailwind plugin.
- **Removed:** `src/design/shell.css`, `src/design/components.css`, `src/design/chart.css`; `src/design/tokens.css` replaced by an `@theme` block in a new Tailwind entry stylesheet; the CSS imports in `main.tsx` collapse to that single entry (plus fonts).
- **Risk areas to verify after migration:** print/PDF fidelity (Puppeteer A3 landscape, full rosters), offline Japanese font loading (`@fontsource`, no CDN), and Playwright E2E selectors that may key on class names.
- **Preserved:** identical visual output (Organo Admin design language), UTF-8 + bundled CJK fonts, and the single `docker compose up` setup.
