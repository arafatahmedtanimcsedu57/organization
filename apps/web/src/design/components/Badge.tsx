import type { CSSProperties, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'info' | 'warn' | 'crit' | 'brand' | 'kenmu';

export interface BadgeProps {
  tone?: BadgeTone;
  /** Drop the leading status dot (kept for a plain label pill). */
  plain?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

const BASE =
  'inline-flex items-center gap-[5px] h-[20px] px-2 rounded-full text-[12px] font-semibold whitespace-nowrap';

/** Leading status dot (`::before`) - shown for every tone except `kenmu`, and suppressed when `plain`. */
const DOT =
  "before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:opacity-90";

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-neutral text-neutral-ink',
  success: 'bg-success text-success-ink',
  info: 'bg-info text-info-ink',
  warn: 'bg-warn text-warn-ink',
  crit: 'bg-crit text-crit-ink',
  brand: 'bg-brand-tint text-brand-dark',
  kenmu: 'bg-brand text-white font-jp font-bold',
};

/** Badge status pill - success/info/warn/crit/brand + `kenmu` (兼務). */
export function Badge({ tone = 'neutral', plain = false, className, style, children }: BadgeProps) {
  const showDot = !plain && tone !== 'kenmu';
  const classes = [BASE, TONES[tone], showDot ? DOT : '', className].filter(Boolean).join(' ');

  return (
    <span className={classes} style={style}>
      {children}
    </span>
  );
}
