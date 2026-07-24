/** Rail/tint pair for one top-level division's branch color. */
export interface BranchColor {
  rail: string;
  tint: string;
}

/** Polaris-adjacent hues, distinct from the brand green (reserved for 兼務/links). Order doesn't
 * matter — `branchColorFor` picks a stable entry per branch id, so this only needs to cover
 * however many top-level divisions exist without repeating for the known four.
 *
 * Each entry is a pair of CSS custom-property references (not literal hex) so the palette follows
 * the light/dark theme: the actual rail/tint values are defined per theme in design/tailwind.css
 * (`--branch-*`). Consumers must apply these as CSS *values* (inline `style`, `--rail`/`--tint`
 * custom props, or `bg-[var(--rail)]`), never as a raw SVG presentation attribute — `var()` only
 * resolves in the CSS cascade. */
const BRANCH_PALETTE: BranchColor[] = [
  { rail: 'var(--branch-blue-rail)', tint: 'var(--branch-blue-tint)' },
  { rail: 'var(--branch-gold-rail)', tint: 'var(--branch-gold-tint)' },
  { rail: 'var(--branch-green-rail)', tint: 'var(--branch-green-tint)' },
  { rail: 'var(--branch-purple-rail)', tint: 'var(--branch-purple-tint)' },
  { rail: 'var(--branch-orange-rail)', tint: 'var(--branch-orange-tint)' },
  { rail: 'var(--branch-magenta-rail)', tint: 'var(--branch-magenta-tint)' },
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
