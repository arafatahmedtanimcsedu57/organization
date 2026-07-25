## ADDED Requirements

### Requirement: Author all styling with Tailwind CSS utilities

The web application SHALL author all visual styling using **Tailwind CSS utility classes** applied in component markup, rather than hand-written per-screen stylesheets. Bespoke component/screen stylesheets (the former `shell.css`, `components.css`, and `chart.css`) SHALL NOT remain; only a single Tailwind entry stylesheet - carrying the Tailwind import, the theme, a base layer, the bundled fonts, and the print rules - is permitted as authored CSS.

#### Scenario: A styled component uses utilities in its markup

- **WHEN** a maintainer inspects a styled component (card, badge, button, department node)
- **THEN** its visual styling is expressed as Tailwind utility classes in the component's JSX, not as rules in a separate hand-written stylesheet

#### Scenario: No per-screen stylesheet remains

- **WHEN** the web app is built
- **THEN** styling resolves through Tailwind (the entry stylesheet plus utilities) and the former `shell.css`, `components.css`, and `chart.css` files are absent

### Requirement: Expose design tokens through the Tailwind theme

The centralized design tokens (color, type, radius, shadow, and layout dimensions) SHALL be defined once in Tailwind's `@theme` and consumed as Tailwind utilities, preserving the existing token names and values so the Organo Admin visual language is unchanged.

#### Scenario: Changing a token propagates everywhere

- **WHEN** a maintainer changes a token value in the Tailwind `@theme` (for example the brand green or the card radius)
- **THEN** every utility derived from that token updates across all screens, with no per-component override required

#### Scenario: The visual language is preserved after migration

- **WHEN** the migrated app is rendered
- **THEN** its colors, type, radius, shadow, and layout match the pre-migration Organo Admin design

### Requirement: Preserve print/PDF and offline fonts under Tailwind

Adopting Tailwind SHALL preserve the A3-landscape print/PDF output and the offline (CDN-free) Japanese font loading. The `@page` A3-landscape rule and the bundled `@fontsource` CJK fonts SHALL remain in the Tailwind entry stylesheet, app chrome SHALL be hidden in print via Tailwind's `print:` variant, and every roster SHALL still expand in full when printed.

#### Scenario: PDF export still renders A3 with full rosters

- **WHEN** the chart is exported to PDF
- **THEN** the output is A3 landscape, the app chrome (sidebar, top bar, save bar) is hidden, and every roster is rendered in full with no truncation affordance

#### Scenario: Japanese renders offline from bundled fonts

- **WHEN** the chart is rendered for PDF export by the headless renderer with no network access
- **THEN** Japanese text renders correctly from the bundled `@fontsource` fonts, with no external font request
