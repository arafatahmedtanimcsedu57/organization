import { createContext, useContext } from 'react';
import { BRANCH_PALETTE, type BranchColor } from '../../constants/branchPalette';

export type { BranchColor };

/** Resolves a top-level division id to its branch color. Built once from the ordered divisions. */
export type BranchColorResolver = (branchId: string) => BranchColor;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Build a resolver that assigns each top-level division a branch color by its **ordinal position**
 * among the divisions (de-duplicated, in `divisionIds` order) rather than by hashing the id.
 *
 * Ordinal assignment guarantees the first `BRANCH_PALETTE.length` divisions are all distinct - a
 * hash could (and did) map two different divisions onto the same hue, so the legend could not tell
 * them apart. Beyond the palette length the index wraps; the division name shown beside every
 * swatch and rail carries the disambiguation there.
 *
 * `divisionIds` is the ordered list of top-level division ids (`roots.map((r) => r.branchId)`).
 * An id not present at build time (which should not happen) falls back to a stable hashed slot so
 * a color is always returned.
 */
export function createBranchColorResolver(divisionIds: readonly string[]): BranchColorResolver {
  const indexById = new Map<string, number>();
  for (const id of divisionIds) {
    if (!indexById.has(id)) indexById.set(id, indexById.size);
  }
  return (branchId) => {
    const ordinal = indexById.get(branchId) ?? hashString(branchId);
    return BRANCH_PALETTE[ordinal % BRANCH_PALETTE.length] ?? BRANCH_PALETTE[0]!;
  };
}

/**
 * A darkened, text-safe variant of a branch rail, for the few places a branch color is used as
 * small label text on light paper (the report role labels, division eyebrow, and headline pill).
 * The rails are tuned as graphical marks (dots, edges, rules), which only need 3:1; as text the
 * lighter hues - gold, green, purple - miss the 4.5:1 body-text floor. This keeps the hue but
 * drops the luminance so the label passes AA. Rails stay bright for the graphical uses.
 */
export function branchTextInk(rail: string): string {
  return `color-mix(in srgb, ${rail} 60%, #1a1a1a)`;
}

/**
 * Resolver context. Provided by the interactive canvas and the print report - both hold the
 * ordered `roots` - and consumed by the nested nodes, edges, and report cards so none of them need
 * to know the division order or hash an id themselves.
 */
const BranchColorContext = createContext<BranchColorResolver | null>(null);

export const BranchColorProvider = BranchColorContext.Provider;

export function useBranchColor(): BranchColorResolver {
  const resolver = useContext(BranchColorContext);
  if (!resolver) {
    throw new Error('useBranchColor must be used within a BranchColorProvider');
  }
  return resolver;
}
