import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'secondary' | 'primary' | 'brand' | 'plain' | 'critical' | 'ghostdark';
export type ButtonSize = 'md' | 'sm' | 'icon-sm' | 'icon-md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

const BASE = 
  'inline-flex items-center gap-1.5 h-[34px] px-[13px] rounded-md font-semibold border transition-[background,box-shadow,transform] duration-[120ms] ease-brand active:translate-y-[0.5px] disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:w-[15px] [&_svg]:h-[15px]';

const VARIANTS: Record<ButtonVariant, string> = {
  secondary:
    'bg-surface text-strong border-line-strong shadow-[0_1px_0_rgba(26,26,26,0.05)] hover:bg-surface-hover',
  primary:
    'bg-action text-white border-action shadow-[0_1px_0_rgba(0,0,0,0.25)] hover:bg-action-hover',
  brand: 'bg-brand text-white border-brand hover:bg-brand-dark',
  plain: 'bg-transparent text-brand-dark border-transparent shadow-none hover:bg-surface-hover',
  critical:
    'bg-surface text-crit-ink border-line-strong shadow-[0_1px_0_rgba(26,26,26,0.05)] hover:bg-surface-hover',
  ghostdark: 'bg-transparent text-white border-white/25 shadow-none hover:bg-white/10',
};

const SIZES: Record<ButtonSize, string> = {
  md: '',
  sm: 'h-[28px] px-[10px] text-[12px]',
  'icon-sm': 'h-6 w-6 p-0 rounded-full',
  'icon-md': 'h-8 w-8 p-0 rounded-full',
};

/** Button - secondary/primary/brand/plain/critical/ghostdark (for dark surfaces like the save
 * bar) × md/sm, expressed as Tailwind utilities composed in TS. */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [BASE, VARIANTS[variant], SIZES[size], className].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
}
