import type { TopdownLayout } from './topdownLayout';

/** One searchable entry: a department node id plus its pre-lowercased haystack text. */
export interface SearchEntry {
  id: string;
  text: string;
}

/** Flattens every card's department name, English name, head and roster into one haystack each. */
export function buildSearchIndex(layout: TopdownLayout): SearchEntry[] {
  return layout.nodes.map(({ id, node }) => ({
    id,
    text: [
      node.name,
      node.nameEn ?? '',
      node.head,
      ...node.managers.map((m) => `${m.displayName} ${m.title}`),
      ...node.staff.map((m) => `${m.displayName} ${m.title}`),
    ]
      .join(' ')
      .toLowerCase(),
  }));
}

/** Node ids whose haystack contains `query`, in layout order. Empty for a blank query. */
export function findMatches(index: SearchEntry[], query: string): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const ids: string[] = [];
  for (const entry of index) {
    if (entry.text.includes(needle)) ids.push(entry.id);
  }
  return ids;
}
