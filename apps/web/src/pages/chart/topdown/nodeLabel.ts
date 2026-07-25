/**
 * Card labels for the interactive canvas. A department card should not repeat the ancestry the
 * tree already shows above it, and sibling cards must be distinguishable at a glance even when
 * their names share a long common stem. Two reductions, applied per parent group:
 *
 *  1. **Parent strip** - drop the parent's name from the front of a child.
 *     "Software Development Section – Group 1" under it becomes "Group 1"; "SW開発課 1G" → "1G".
 *  2. **Sibling strip** - when the parent isn't the shared stem (an invented grouping level),
 *     drop the prefix a child shares with a sibling, keeping the last shared word so a bare
 *     number never stands alone. "Solution Sales Dept. – Section 1/2" (siblings under a division)
 *     become "Section 1" / "Section 2", not "Solution Sales Dept. –…" twice.
 *
 * The full name stays the card's tooltip and accessible name, so nothing is lost for recovery or
 * screen readers. The print report deliberately does NOT use these - it spells names out in full.
 */

/** One node of any tree shaped like the chart tree; keeps this module free of the chart types. */
export interface LabelTreeNode {
  id: string;
  name: string;
  children: LabelTreeNode[];
}

/** Separators that join a stem to its distinguishing tail: spaces (`\s` covers the full-width
 * ideographic space U+3000 too), dashes, middle dots, slashes, pipes, and colons. */
const SEPARATOR = /[\s・･/／|｜–—―\-:：]/u;

/**
 * A node's label with its parent's name stripped from the front. Falls back to the full name when
 * the parent name is not a leading prefix, or when stripping would leave nothing.
 */
export function departmentLabel(name: string, parentName?: string | null): string {
  if (!parentName || !name.startsWith(parentName)) return name;
  const tail = name.slice(parentName.length).replace(/^[\s・･/／|｜–—―\-:：]+/u, '').trim();
  return tail.length > 0 ? tail : name;
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

/** Character indices where a token (a run of non-separator characters) begins. */
function tokenStarts(value: string): number[] {
  const starts: number[] = [];
  let inSeparator = true;
  for (let i = 0; i < value.length; i++) {
    const isSeparator = SEPARATOR.test(value[i]!);
    if (!isSeparator && inSeparator) starts.push(i);
    inSeparator = isSeparator;
  }
  return starts;
}

/**
 * Drop the leading tokens `base` shares with a sibling (up to `sharedLength` characters), but stop
 * before the remainder would begin with a bare number or become too short - so "Section 1"
 * survives rather than collapsing to "1", and "Group 1" is left intact (its siblings differ only
 * by the number).
 */
function distinguishingTail(base: string, sharedLength: number): string {
  if (sharedLength <= 0) return base;
  let cut = 0;
  for (const start of tokenStarts(base)) {
    if (start === 0 || start > sharedLength) continue;
    const remainder = base.slice(start);
    const firstToken = remainder.split(SEPARATOR)[0] ?? '';
    if (remainder.length >= 3 && !/^\d+$/.test(firstToken)) cut = start; // keep the largest valid cut
  }
  return cut > 0 ? base.slice(cut) : base;
}

/**
 * Build the display label for every node in the tree (keyed by id), applying the parent strip and
 * then the sibling strip within each parent's children. Top-level nodes keep their full name.
 */
export function buildDepartmentLabels(roots: readonly LabelTreeNode[]): Map<string, string> {
  const labels = new Map<string, string>();

  const processGroup = (children: readonly LabelTreeNode[], parentName: string | null) => {
    const bases = children.map((child) => departmentLabel(child.name, parentName));
    children.forEach((child, i) => {
      let shared = 0;
      for (let j = 0; j < children.length; j++) {
        if (j !== i) shared = Math.max(shared, commonPrefixLength(bases[i]!, bases[j]!));
      }
      labels.set(child.id, distinguishingTail(bases[i]!, shared));
    });
    for (const child of children) processGroup(child.children, child.name);
  };

  processGroup(roots, null);
  return labels;
}
