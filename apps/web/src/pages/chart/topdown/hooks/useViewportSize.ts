import { useEffect, useState, type RefObject } from 'react';

export interface ViewportSize {
  width: number;
  height: number;
}

const INITIAL: ViewportSize = { width: 0, height: 0 };

/**
 * Tracks an element's content box (window resize, fullscreen, sidebar toggles) via
 * `ResizeObserver`. Sub-pixel jitter is ignored so a scrollbar animation cannot trigger
 * a chain of relayouts.
 */
export function useViewportSize(ref: RefObject<HTMLElement | null>): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(INITIAL);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1
          ? { width, height }
          : prev,
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
