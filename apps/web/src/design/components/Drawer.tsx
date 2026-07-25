import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Card } from './Card';

export interface DrawerProps {
  /** Accessible name for the dialog (e.g. "Edit 営業本部"). */
  'aria-label': string;
  /** Invoked on Escape or a backdrop click - the caller decides what closing means. */
  onClose: () => void;
  children: ReactNode;
}

function DrawerBase({ 'aria-label': ariaLabel, onClose, children }: DrawerProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function onBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  // The panel anchors to the bottom by default and flips to the right edge at md; the
  // matching slide-in keyframes (`.drawer-panel`) live in tailwind.css on the same 768px
  // boundary as these `md:` utilities.
  return createPortal(
    <div
      className="drawer-backdrop no-print fixed inset-0 z-50 flex items-end justify-center bg-[rgba(26,26,26,0.45)] md:items-stretch md:justify-end"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="drawer-panel w-full max-h-[85vh] overflow-y-auto rounded-t-xl bg-surface shadow-pop md:h-full md:max-h-none md:w-[520px] md:rounded-none md:rounded-l-xl"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Slide-over panel: in from the right on wide screens (md+), up from the bottom on small
 * ones. Same portal + Escape / backdrop-close / scroll-lock behavior as `Modal`, and it
 * reuses Card's header/section/footer styling so its contents read like any other card.
 */
export const Drawer = Object.assign(DrawerBase, {
  Header: Card.Header,
  Body: Card.Body,
  Section: Card.Section,
  Footer: Card.Footer,
});
