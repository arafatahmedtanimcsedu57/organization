## ADDED Requirements

### Requirement: Render a compact, window-aware top-down tree

The Top-down view SHALL lay out the department hierarchy as a top-down tree using a tidy-tree
algorithm with **variable node sizes**, packing sibling subtrees so unused horizontal gaps are
reused, and SHALL stack deep or narrow subtrees vertically so the chart's horizontal footprint —
and horizontal scrolling — is minimized for the current viewport width. The layout SHALL re-pack
when the available width changes.

#### Scenario: Subtrees pack to minimize width

- **WHEN** the full department hierarchy is rendered in the Top-down view
- **THEN** sibling subtrees are positioned so their bounding boxes interlock without overlap, and the total width is minimized rather than allotting one fixed column per node

#### Scenario: Deep or narrow subtrees stack vertically

- **WHEN** a subtree is deeper than it is wide, or would exceed the viewport width if fanned out horizontally
- **THEN** its nodes are stacked vertically with elbow connectors instead of fanning horizontally

#### Scenario: Re-pack on resize

- **WHEN** the viewport (or fullscreen) width changes
- **THEN** the layout recomputes so that horizontal scrolling stays minimal at the new width

### Requirement: Navigate the canvas by pan, zoom, and fullscreen

The Top-down view SHALL be an interactive canvas supporting pointer-drag **panning**, **zooming**
(mouse wheel, on-screen zoom-out / zoom-in controls, and a fit-to-screen control) with a visible
zoom-percentage readout, and a **fullscreen** toggle. Panning and zooming SHALL NOT trigger a
relayout of the tree.

#### Scenario: Pan by dragging

- **WHEN** the maintainer drags an empty area of the canvas
- **THEN** the chart translates with the pointer and no node positions are recomputed

#### Scenario: Zoom and fit

- **WHEN** the maintainer zooms with the wheel or the zoom controls, or clicks fit-to-screen
- **THEN** the chart scales (about the cursor, or to fit the whole chart to the viewport for fit-to-screen) and the zoom-percentage readout updates

#### Scenario: Fullscreen

- **WHEN** the maintainer toggles fullscreen
- **THEN** the canvas fills the screen, and exiting returns to the normal layout

### Requirement: Locate a person or department by search

The canvas SHALL provide a search field that matches departments and roster people by name; a
match SHALL be highlighted and the viewport SHALL ease to fit the matching node.

#### Scenario: Search focuses a match

- **WHEN** the maintainer types text that matches a department or a person
- **THEN** the matching node is highlighted and the viewport pans/zooms to bring it into view

#### Scenario: No match

- **WHEN** the search text matches nothing
- **THEN** no node is highlighted and the maintainer is shown that there are no matches

### Requirement: Create and edit master data from the canvas

The canvas SHALL let a maintainer **create, edit, and deactivate** departments and people, and
**add concurrent (兼務) postings**, directly from a node — reusing the existing master-data edit
panel and APIs rather than a separate implementation. Successful changes SHALL be reflected on the
canvas without a manual refresh.

#### Scenario: Edit a department from its node

- **WHEN** the maintainer invokes edit on a department node and saves a change
- **THEN** the change is persisted via the existing department API and the canvas reflects it after the chart refetches

#### Scenario: Add a concurrent posting from a node

- **WHEN** the maintainer adds a 兼務 posting from a person or department on the canvas
- **THEN** the posting is created via the existing assignments API and appears on the canvas

#### Scenario: Deactivate from a node

- **WHEN** the maintainer deactivates a person or department from the canvas
- **THEN** the record is deactivated non-destructively and removed from the chart, consistent with the admin pages

### Requirement: Show concurrent duties as cross-links on the canvas

The Top-down canvas SHALL render each 兼務 posting as a **dashed connector** from the source
department to the target department, labeled with the person and their source title, so
provenance is visible without leaving the view.

#### Scenario: A concurrent posting is drawn as a cross-link

- **WHEN** a person holds a concurrent posting sourced from another department
- **THEN** a dashed connector is drawn from the source department node to the target department node, labeled with the person's name and source title

### Requirement: Print renders the top-down layout at fit-to-width

For print / PDF (`?print=1`), the chart SHALL render the **Top-down** layout scaled to fit the A4
page width with every roster expanded, regardless of which view was active interactively.

#### Scenario: Print uses top-down regardless of active view

- **WHEN** the chart is printed or exported to PDF while the Horizontal view is active interactively
- **THEN** the printed output renders the Top-down layout scaled fit-to-width with all rosters expanded and no member omitted
