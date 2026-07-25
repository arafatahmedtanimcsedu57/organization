import { useCallback, useEffect, useState, type RefObject } from 'react';

export interface Fullscreen {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

/**
 * Fullscreen state for one element. The flag follows `fullscreenchange` rather than the
 * toggle call, so leaving fullscreen with Esc (which fires no click) still updates the UI.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>): Fullscreen {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current?.requestFullscreen();
  }, [ref]);

  return { isFullscreen, toggleFullscreen };
}
