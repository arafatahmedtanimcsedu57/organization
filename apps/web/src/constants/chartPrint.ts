/** Page geometry for the print/PDF rendering of the chart (`TopdownPrint`). */

/** Printable width of an A4 portrait page at CSS 96dpi (210mm − 2×8mm margins ≈ 194mm). */
export const PRINT_WIDTH_PX = 736;
/** Floor below which text stops being readable; rather than shrinking further, the stacking
 * budget compacts the tree until it fits at ≥ this scale. */
export const MIN_PRINT_SCALE = 0.45;
