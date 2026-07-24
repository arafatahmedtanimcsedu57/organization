## MODIFIED Requirements

### Requirement: Render the org chart as an indented tree of department cards

The **Horizontal** chart view SHALL render as a **vertically indented tree of department cards** —
each department is a card containing its rank-ordered roster, and child departments are indented
beneath their parent — restyled to the organogram card aesthetic (avatar-style department header,
soft shadow, dotted-grid canvas, orthogonal elbow connectors). It is the **secondary** view; the
default is the compact Top-down tree (see the `chart-canvas` capability). Top-level divisions SHALL
be separated by clear vertical spacing.

#### Scenario: Nesting reflects hierarchy

- **WHEN** a department has child departments in the Horizontal view
- **THEN** the children are rendered indented beneath the parent card, connected by an elbow rail

#### Scenario: Sibling divisions do not touch

- **WHEN** two top-level divisions are rendered one after another in the Horizontal view
- **THEN** a clear vertical gap separates them and neither card's border touches the other

### Requirement: Accessible, motion-safe, print-ready styling

The UI SHALL provide visible keyboard focus indicators, honor `prefers-reduced-motion`, use UTF-8
with bundled CJK fonts, and include an **A4-portrait, fit-to-width** print stylesheet.

#### Scenario: Reduced motion is honored

- **WHEN** the viewer has `prefers-reduced-motion: reduce` set
- **THEN** entry/reveal animations and canvas zoom/pan transitions are disabled and content is shown in its final state

#### Scenario: Keyboard focus is visible

- **WHEN** a maintainer navigates the UI by keyboard
- **THEN** the focused control shows a visible focus ring

## ADDED Requirements

### Requirement: Offer Top-down and Horizontal chart views

The chart screen SHALL offer a **Top-down** view (the compact interactive canvas) and a
**Horizontal** view (the re-themed indented tree), switchable in place without navigating away.
The Top-down view SHALL be the default.

#### Scenario: Switching between views

- **WHEN** a maintainer toggles from Top-down to Horizontal on the chart screen
- **THEN** the indented tree replaces the canvas without a page reload, and toggling back restores the Top-down canvas

#### Scenario: Top-down is the default

- **WHEN** the chart screen is opened fresh
- **THEN** the Top-down canvas is shown by default

## REMOVED Requirements

### Requirement: Offer Tree and Network chart views

**Reason**: The Network (dendrogram) view is retired, and the default "Tree" is replaced by the
compact Top-down canvas; the view set is now Top-down + Horizontal.
**Migration**: Use the new "Offer Top-down and Horizontal chart views" requirement (design-system)
together with the `chart-canvas` capability. 兼務, previously drawn as Network arrows, renders as
dashed cross-links on the Top-down canvas.
