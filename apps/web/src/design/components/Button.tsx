import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'secondary' | 'primary' | 'brand' | 'plain' | 'critical';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

/** `.btn` — primary/secondary/plain/brand/critical, ported from `ui_design/shopify/styles.css`. */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = ['btn'];
  if (variant !== 'secondary') classes.push(variant);
  if (size === 'sm') classes.push('sm');
  if (className) classes.push(className);

  return (
    <button type={type} className={classes.join(' ')} {...rest}>
      {icon}
      {children}
    </button>
  );
}
