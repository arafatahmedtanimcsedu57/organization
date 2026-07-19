import type { ReactNode } from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}

/** `.state-block.error-state` — failed-fetch placeholder with an optional retry action. */
export function ErrorState({
  icon,
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Retry',
}: ErrorStateProps) {
  return (
    <div className="state-block error-state" role="alert">
      {icon ? <span className="state-ico">{icon}</span> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {onRetry ? (
        <div className="state-actions">
          <Button size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
