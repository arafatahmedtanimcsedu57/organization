/**
 * Geometry of the top-down organogram: card metrics, gaps, and the knobs that drive the
 * compaction/row-wrapping rules in `topdownLayout.ts`.
 *
 * These live outside the algorithm because two very different consumers must agree on them:
 * the layout computes card heights from them, and `TopdownNode` renders rows sized by them.
 * If the two drift apart, cards overflow or leave dead space, so there is exactly one copy.
 */

/** Card width (all cards share one width so columns align). */
export const CARD_WIDTH = 236;
/** Header block: department name + head + count badge. */
export const HEADER_HEIGHT = 52;
/** One roster line (a title group, the staff line, or the expander). */
export const ROSTER_LINE_HEIGHT = 22;
/** Vertical padding inside a card. */
export const CARD_PAD_Y = 10;
/** Vertical gap between a card and its children row (the connector run). */
export const TIER_GAP = 44;
/** Horizontal gap between adjacent sibling subtrees. */
export const SIBLING_GAP = 24;
/** Horizontal gap between division blocks sharing a wrapped row. */
export const ROOT_GAP = 48;
/** Vertical gap between wrapped rows of divisions. */
export const ROW_GAP = 64;
/** Outer padding around the whole diagram. */
export const PADDING = 40;

/* --- compaction knobs --- */

/** A fanned subtree may take at most this fraction of the viewport before it stacks. */
export const STACK_VIEWPORT_FRACTION = 0.85;
/** Indent per depth level inside a vertical stack. */
export const STACK_INDENT = 22;
/** Vertical gap between cards inside a stack. */
export const STACK_GAP = 12;

/* --- roster display model (the layout's height model and TopdownNode's rows share these) --- */

/** Manager title-groups shown before the surplus collapses behind the `＋N` expander. */
export const MAX_MANAGER_ROWS = 4;
/** Staff names per wrapped line when a roster renders in full. */
export const STAFF_NAMES_PER_LINE = 3;

/* --- zoom-adaptive stacking budget (consumed by `useAdaptiveLayout`) --- */

/** Effective-width buckets for the stacking budget (avoids relayout churn). */
export const BUDGET_QUANTUM = 80;
/** Floor for the effective width, so extreme zoom-in never stacks the whole chart. */
export const MIN_BUDGET_WIDTH = 560;
/** Candidate widths probed when searching for the overview budget (layout is cheap). */
export const OVERVIEW_PROBES = 4;
/** Widening factor applied between overview probes when the diagram comes out too tall. */
export const OVERVIEW_PROBE_GROWTH = 1.3;
