import { useCallback, useState } from 'react';

export interface ExpandedNodes {
  /** Node ids whose roster the user expanded (`＋N` / `×N` affordances). */
  expandedIds: ReadonlySet<string>;
  toggleExpand: (id: string) => void;
}

/**
 * Which cards show their full roster. Expanding is a deliberate view action, so it also
 * runs `onExpand` — the canvas passes `takeControl`, taking the view out of auto-fit.
 */
export function useExpandedNodes(onExpand?: () => void): ExpandedNodes {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());

  const toggleExpand = useCallback(
    (id: string) => {
      onExpand?.();
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [onExpand],
  );

  return { expandedIds, toggleExpand };
}
