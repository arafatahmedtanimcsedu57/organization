## ADDED Requirements

### Requirement: Adopt the Organo Admin design language

The web application SHALL present every screen using the **Organo Admin (Shopify / Polaris-style)** design language: a neutral canvas, white rounded cards with soft shadows, Shopify green (`#008060`) reserved for brand accents / links / 兼務, dark primary actions, the **Figtree** (UI) + **Noto Sans JP** (Japanese) type pairing, and a shared component set (app shell with left navigation + top bar, cards, status badges, banners, and an index table). Design tokens (color, type, spacing, radius, shadow) SHALL be defined once and referenced, not hardcoded per component.

#### Scenario: A consistent shell wraps every screen

- **WHEN** a maintainer navigates between the chart, employees, departments, concurrent-duties, and history screens
- **THEN** each screen renders inside the same app shell (left nav + top bar) with the same tokens, cards, and badges

#### Scenario: Tokens are centralized

- **WHEN** a maintainer changes a core token (e.g. the brand green or the card radius)
- **THEN** the change propagates to every component that uses that token, with no per-component overrides required

### Requirement: Render the org chart as an indented tree of department cards

The chart SHALL render as a **vertically indented tree of department cards** — each department is a card containing its rank-ordered roster, and child departments are indented beneath their parent — rather than a manager-line top-down diagram. Top-level divisions SHALL be separated by clear vertical spacing.

#### Scenario: Nesting reflects hierarchy

- **WHEN** a department has child departments
- **THEN** the children are rendered indented beneath the parent card, connected by a rail

#### Scenario: Sibling divisions do not touch

- **WHEN** two top-level divisions are rendered one after another
- **THEN** a clear vertical gap separates them and neither card's border touches the other

### Requirement: Color-code each division branch for traceability

Each top-level division and its entire subtree SHALL share one branch color, applied to the connector rail, the card's left accent stripe, and the node marker, so any card can be traced back to its division at a glance. The connector rail SHALL terminate at the last child rather than overshooting past it.

#### Scenario: A subtree inherits its division color

- **WHEN** a nested department several levels below a division is rendered
- **THEN** its rail, accent stripe, and marker use that division's branch color

#### Scenario: The rail stops at the last child

- **WHEN** a group of sibling departments hangs off a parent's rail
- **THEN** the vertical rail ends at the last sibling's connector and does not extend below it

### Requirement: Distinguish division, department, and group tiers

Top-level division cards SHALL be visually elevated above nested department and group cards (tinted header, larger department name) so the org tier is readable without reading the labels.

#### Scenario: A division card reads as a higher tier than a group card

- **WHEN** a division card and a nested group card are shown together
- **THEN** the division card has a tinted header and larger name that visually outrank the group card

### Requirement: Render 兼務 as a sourced concurrent-duty marker

A concurrent (兼務) posting SHALL render in its target department as a distinct marker that also names its **source** posting — a dashed connector into a chip such as `兼 佐藤(悠) ← 営業本部 本部長` — enriching the reference chart's bare `(兼)` prefix with provenance. The marker SHALL be visually distinct from primary (home-department) members.

#### Scenario: A concurrent posting shows its origin

- **WHEN** a person holds a concurrent posting in a department other than their home department
- **THEN** the target department shows a 兼務 chip naming the person and their source department + title

#### Scenario: Concurrent is distinct from primary

- **WHEN** a department roster contains both primary members and a concurrent posting
- **THEN** the concurrent entry is styled distinctly (dashed chip / accent) from the primary members

### Requirement: Preserve complete rosters when printing

The interactive view MAY truncate an oversized roster with an expand affordance (e.g. `＋32 課員`), but the print / PDF output SHALL expand every roster in full so that **no employee is omitted** from the printed chart.

#### Scenario: The interactive view truncates a large roster

- **WHEN** a department roster exceeds the display threshold in the interactive view
- **THEN** the surplus members are collapsed behind an expand affordance showing the hidden count

#### Scenario: The printed chart shows every member

- **WHEN** the same chart is exported to PDF or printed
- **THEN** every roster is rendered in full with no truncation affordance and no omitted member

### Requirement: Offer Tree and Network chart views

The chart screen SHALL offer a **Tree** view (default indented tree) and a **Network** view (nodes with reporting lines and 兼務 arrows), switchable in place without navigating away.

#### Scenario: Switching between views

- **WHEN** a maintainer toggles from Tree to Network on the chart screen
- **THEN** the network graph (nodes, reporting lines, dashed 兼務 arrows) replaces the tree without a page reload, and toggling back restores the tree

### Requirement: Accessible, motion-safe, print-ready styling

The UI SHALL provide visible keyboard focus indicators, honor `prefers-reduced-motion`, use UTF-8 with bundled CJK fonts, and include an A3-landscape print stylesheet.

#### Scenario: Reduced motion is honored

- **WHEN** the viewer has `prefers-reduced-motion: reduce` set
- **THEN** entry/reveal animations are disabled and content is shown in its final state

#### Scenario: Keyboard focus is visible

- **WHEN** a maintainer navigates the UI by keyboard
- **THEN** the focused control shows a visible focus ring
