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
export const BRANCH_PALETTE: readonly BranchColor[] = [
  { rail: 'var(--branch-blue-rail)', tint: 'var(--branch-blue-tint)' },
  { rail: 'var(--branch-gold-rail)', tint: 'var(--branch-gold-tint)' },
  { rail: 'var(--branch-green-rail)', tint: 'var(--branch-green-tint)' },
  { rail: 'var(--branch-purple-rail)', tint: 'var(--branch-purple-tint)' },
  { rail: 'var(--branch-orange-rail)', tint: 'var(--branch-orange-tint)' },
  { rail: 'var(--branch-magenta-rail)', tint: 'var(--branch-magenta-tint)' },
];
