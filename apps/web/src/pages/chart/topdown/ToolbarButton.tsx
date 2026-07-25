import type { ReactNode } from 'react';

export interface ToolbarButtonProps {
  /** Used as both the tooltip and the accessible name - the face is a bare glyph. */
  label: string;
  onClick: () => void;
  children: ReactNode;
}

/** One square icon button in the canvas toolbar. */
export function ToolbarButton({ label, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="w-[30px] h-[30px] grid place-items-center rounded-md text-[14px] text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {children}
    </button>
  );
}
