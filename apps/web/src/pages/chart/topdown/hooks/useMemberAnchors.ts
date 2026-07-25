import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TopdownLayout } from '../topdownLayout';

const EMPTY: ReadonlyMap<string, number> = new Map();

export interface MemberAnchors {
  /** Attach to the element that wraps the cards. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** `"<nodeId>:<sysId>"` → the y of that name's row, in diagram coordinates. */
  anchorY: ReadonlyMap<string, number>;
}

/**
 * Measures the within-card y of every rendered name so 兼務 links can be drawn name-to-name
 * instead of card-to-card.
 *
 * `offsetTop` is a layout coordinate, so the measurements survive the CSS `zoom` bake and
 * the card glide untouched. Re-measuring is keyed to the layout - highlight styling is
 * deliberately layout-neutral (color/underline only), so hover can never move a row - plus
 * one pass when webfonts land, since fallback metrics change row heights.
 */
export function useMemberAnchors(layout: TopdownLayout): MemberAnchors {
  const containerRef = useRef<HTMLDivElement>(null);
  const [anchorY, setAnchorY] = useState<ReadonlyMap<string, number>>(EMPTY);
  const signatureRef = useRef('');

  const measure = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    const next = new Map<string, number>();
    root.querySelectorAll<HTMLElement>('[data-member-anchor]').forEach((element) => {
      const key = element.dataset.memberAnchor;
      if (key && !next.has(key)) next.set(key, element.offsetTop + element.offsetHeight / 2);
    });
    let signature = '';
    for (const [key, value] of next) signature += `${key}=${Math.round(value)};`;
    if (signature === signatureRef.current) return;
    signatureRef.current = signature;
    setAnchorY(next);
  }, []);

  useLayoutEffect(measure, [layout, measure]);

  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts) return;
    let cancelled = false;
    void fonts.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [measure]);

  return { containerRef, anchorY };
}
