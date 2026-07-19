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

/** `.badge` status pill — success/info/warn/crit/brand + `kenmu` (兼務), ported from `ui_design/shopify/styles.css`. */
export function Badge({ tone = 'neutral', plain = false, className, style, children }: BadgeProps) {
  const classes = ['badge'];
  if (tone !== 'neutral') classes.push(tone);
  if (plain) classes.push('plain');
  if (className) classes.push(className);

  return (
    <span className={classes.join(' ')} style={style}>
      {children}
    </span>
  );
}
