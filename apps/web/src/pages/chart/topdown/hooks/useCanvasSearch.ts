import { useCallback, useMemo, useState } from 'react';
import { buildSearchIndex, findMatches } from '../searchIndex';
import type { TopdownLayout } from '../topdownLayout';

export interface CanvasSearch {
  query: string;
  setQuery: (query: string) => void;
  /** Matching node ids, in layout order. */
  matches: string[];
  /** The same ids as a set, for per-card highlight lookups. */
  matchSet: ReadonlySet<string>;
  /** Zero-based position of the focused hit within `matches`. */
  activeMatch: number;
  activeMatchId: string | null;
  /** Advance to the next hit (wrapping) and frame it. */
  cycleMatch: () => void;
}

export interface UseCanvasSearchOptions {
  layout: TopdownLayout;
  fitToNode: (id: string) => void;
}

/**
 * Chart search: builds the haystack from the current layout, tracks the focused hit, and
 * frames hits as the user moves between them.
 *
 * Framing is driven by the two events that mean "show me this hit" — typing and cycling —
 * rather than by an effect watching the results. An effect would also fire when a relayout
 * rebuilds the result set, yanking the viewport around while the user is reading.
 *
 * The cursor is stored together with the result set it belongs to, so a new set of hits
 * reads as "back to the first" by derivation rather than by resetting state.
 */
export function useCanvasSearch({ layout, fitToNode }: UseCanvasSearchOptions): CanvasSearch {
  const [query, setQueryState] = useState('');
  const [cursor, setCursor] = useState<{ key: string; index: number }>({ key: '', index: 0 });

  const index = useMemo(() => buildSearchIndex(layout), [layout]);
  const matches = useMemo(() => findMatches(index, query), [index, query]);
  /** Identifies the result set by content: a relayout rebuilds an equal set, not a new one. */
  const matchKey = useMemo(() => matches.join('|'), [matches]);
  const matchSet = useMemo(() => new Set(matches), [matches]);

  const activeMatch = cursor.key === matchKey ? cursor.index : 0;
  const activeMatchId = matches[activeMatch] ?? null;

  const setQuery = useCallback(
    (next: string) => {
      setQueryState(next);
      // Resolve against the index this keystroke saw — the same one the render will use.
      const found = findMatches(index, next);
      setCursor({ key: found.join('|'), index: 0 });
      const first = found[0];
      if (first) fitToNode(first);
    },
    [index, fitToNode],
  );

  const cycleMatch = useCallback(() => {
    if (matches.length === 0) return;
    const next = (activeMatch + 1) % matches.length;
    setCursor({ key: matchKey, index: next });
    const id = matches[next];
    if (id) fitToNode(id);
  }, [matches, matchKey, activeMatch, fitToNode]);

  return { query, setQuery, matches, matchSet, activeMatch, activeMatchId, cycleMatch };
}
