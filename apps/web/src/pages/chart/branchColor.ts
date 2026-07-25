import { BRANCH_PALETTE, type BranchColor } from '../../constants/branchPalette';

export type { BranchColor };

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Deterministic branch color for a top-level division id, stable across renders and reloads. */
export function branchColorFor(branchId: string): BranchColor {
  const color = BRANCH_PALETTE[hashString(branchId) % BRANCH_PALETTE.length];
  return color ?? BRANCH_PALETTE[0]!;
}
