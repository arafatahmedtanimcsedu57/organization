import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

/** `.state-block.empty-state` — no-rows placeholder for index tables, lists, and chart panels. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="state-block empty-state">
      {icon ? <span className="state-ico">{icon}</span> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="state-actions">{action}</div> : null}
    </div>
  );
}
