import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Card } from './Card';

export interface ModalProps {
  /** Accessible name for the dialog (e.g. "Edit employee"). */
  'aria-label': string;
  /** Invoked on Escape or a backdrop click - the caller decides what closing means. */
  onClose: () => void;
  children: ReactNode;
}

function ModalBase({ 'aria-label': ariaLabel, onClose, children }: ModalProps) {
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

  return createPortal(
    <div
      className="modal fixed inset-0 z-50 grid place-items-center p-4 bg-[rgba(26,26,26,0.45)]"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto bg-surface rounded-lg shadow-pop"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Centered dialog over a dimmed backdrop; reuses Card's header/section/footer styling. */
export const Modal = Object.assign(ModalBase, {
  Header: Card.Header,
  Section: Card.Section,
  Footer: Card.Footer,
});
