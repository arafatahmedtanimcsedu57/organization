/** Rail/tint pair for one top-level division's branch color. */
export interface BranchColor {
  rail: string;
  tint: string;
}

/** Polaris-adjacent hues, distinct from the brand green (reserved for 兼務/links). Order doesn't
 * matter — `branchColorFor` picks a stable entry per branch id, so this only needs to cover
 * however many top-level divisions exist without repeating for the known four. */
const BRANCH_PALETTE: BranchColor[] = [
  { rail: '#2c6ecb', tint: '#eef4fc' }, // blue
  { rail: '#b98900', tint: '#fbf4e4' }, // gold
  { rail: '#2a845a', tint: '#e9f4ee' }, // green
  { rail: '#8a5cc4', tint: '#f3edfb' }, // purple
  { rail: '#c2410c', tint: '#fdf1ea' }, // burnt orange
  { rail: '#be185d', tint: '#fce9f1' }, // magenta
];

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
