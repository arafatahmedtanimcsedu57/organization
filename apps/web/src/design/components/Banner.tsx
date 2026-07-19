import type { ReactNode } from 'react';

export type BannerTone = 'info' | 'success' | 'warn' | 'crit';

export interface BannerProps {
  tone?: BannerTone;
  icon?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

/** `.banner` — info/success/warn/crit, ported from `ui_design/shopify/styles.css`. */
export function Banner({ tone = 'info', icon, title, actions, children }: BannerProps) {
  return (
    <div className={`banner ${tone}`} role={tone === 'crit' || tone === 'warn' ? 'alert' : 'status'}>
      {icon ? <span className="b-ico">{icon}</span> : null}
      <div>
        {title ? <h3>{title}</h3> : null}
        {children ? <p>{children}</p> : null}
        {actions ? <div className="b-actions">{actions}</div> : null}
      </div>
    </div>
  );
}
