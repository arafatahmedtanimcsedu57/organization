/** Pan/zoom limits and timings for the interactive canvas (`useCanvasZoom`). */

export const MIN_SCALE = 0.15;
export const MAX_SCALE = 2.5;
/** Multiplier applied by the toolbar's ＋ / − buttons and the +/- keys. */
export const ZOOM_STEP = 1.25;
/** Pixels panned per arrow-key press. */
export const PAN_STEP = 48;
/** Duration of an eased programmatic transform (fit, search jump). */
export const TRANSITION_MS = 350;
/** Idle delay before the settled scale is baked as CSS `zoom` (crisp re-layout). */
export const BAKE_DELAY_MS = 180;
/** Scale delta below which a settled gesture does not re-trigger the adaptive layout. */
export const SETTLED_SCALE_EPSILON = 0.02;
/** Minimum zoom used when framing a single node, so a search jump always lands readable. */
export const NODE_FOCUS_MIN_SCALE = 0.9;
/** Inset used when the fitted diagram is larger than the viewport (anchor top-left). */
export const FIT_INSET = 12;

/** CSS `zoom` is standard in Chrome/Edge/Safari and Firefox 126+; guard for older engines. */
export const SUPPORTS_CSS_ZOOM =
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('zoom', '0.5');
