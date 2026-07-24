import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

const STATE_BLOCK = 'flex flex-col items-center text-center gap-1.5 py-12 px-6 text-sub';

/** No-rows placeholder for index tables, lists, and chart panels. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={STATE_BLOCK}>
      {icon ? (
        <span className="w-10 h-10 grid place-items-center rounded-full bg-neutral text-sub mb-1 [&_svg]:w-5 [&_svg]:h-5">
          {icon}
        </span>
      ) : null}
      <h3 className="text-[14px] font-semibold text-strong">{title}</h3>
      {description ? <p className="text-[13px] max-w-[360px]">{description}</p> : null}
      {action ? <div className="mt-1.5 flex gap-2">{action}</div> : null}
    </div>
  );
}
