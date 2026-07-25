/** Shape constants for the SVG connectors drawn under (tree) and over (兼務) the cards. */

/** Corner radius for the rounded bends on tree connectors. */
export const BEND_RADIUS = 9;
/** Below this radius a bend is not worth drawing - fall back to square corners. */
export const MIN_BEND_RADIUS = 0.5;
/** Horizontal offset of the indent line a stacked child's └ connector runs down. */
export const STACK_RAIL_OFFSET = 11;
/** How far down a stacked child's left edge its connector enters (capped at half its height). */
export const STACK_ENTRY_OFFSET = 18;

/** 兼務 bow: control-point offset as a fraction of the horizontal span, clamped to the pair below. */
export const KENMU_BOW_RATIO = 0.35;
export const KENMU_BOW_MIN = 36;
export const KENMU_BOW_MAX = 130;
