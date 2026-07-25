import { Fragment } from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  /** Route to link to. Omit for the current (last) page - it renders as plain text. */
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const NAV = 'breadcrumb mb-1 text-[12px] font-medium text-sub';
const LIST = 'flex items-center flex-wrap gap-1.5';
const LINK = 'text-sub hover:text-ink hover:underline transition-[color] duration-[120ms] ease-brand';
const CURRENT = 'text-strong';
const SEP = 'text-muted select-none';

/** Page breadcrumb trail. Every item but the last links to its route; the last is the
 * current page (`aria-current="page"`). `.breadcrumb` is kept as a hook for the print stylesheet. */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={[NAV, className].filter(Boolean).join(' ')}>
      <ol className={LIST}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={item.to ?? item.label}>
              <li>
                {item.to && !isLast ? (
                  <Link to={item.to} className={LINK}>
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? CURRENT : undefined} aria-current={isLast ? 'page' : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast ? (
                <li aria-hidden="true" className={SEP}>
                  ·
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
