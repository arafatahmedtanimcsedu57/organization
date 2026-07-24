import type { ReactNode } from 'react';

export type BannerTone = 'info' | 'success' | 'warn' | 'crit';

export interface BannerProps {
  tone?: BannerTone;
  icon?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

const BASE = 'flex gap-3 px-[15px] py-[13px] rounded-lg mb-4 items-start';

const TONES: Record<BannerTone, string> = {
  info: 'bg-info text-info-ink shadow-[inset_0_0_0_1px_var(--color-info-line)]',
  success: 'bg-success text-success-ink shadow-[inset_0_0_0_1px_var(--color-success-line)]',
  warn: 'bg-warn text-warn-ink shadow-[inset_0_0_0_1px_var(--color-warn-line)]',
  crit: 'bg-crit text-crit-ink shadow-[inset_0_0_0_1px_var(--color-crit-line)]',
};

/** Banner — info/success/warn/crit callout. */
export function Banner({ tone = 'info', icon, title, actions, children }: BannerProps) {
  return (
    <div
      className={`${BASE} ${TONES[tone]}`}
      role={tone === 'crit' || tone === 'warn' ? 'alert' : 'status'}
    >
      {icon ? <span className="w-5 h-5 shrink-0 mt-px [&_svg]:w-5 [&_svg]:h-5">{icon}</span> : null}
      <div>
        {title ? <h3 className="text-[13px] font-bold mb-0.5">{title}</h3> : null}
        {children ? <p className="text-[13px]">{children}</p> : null}
        {actions ? <div className="mt-[9px] flex gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
