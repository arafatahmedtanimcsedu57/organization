import type { ReactNode } from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}

const STATE_BLOCK = 'flex flex-col items-center text-center gap-1.5 py-12 px-6 text-sub';

/** Failed-fetch placeholder with an optional retry action. */
export function ErrorState({
  icon,
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Retry',
}: ErrorStateProps) {
  return (
    <div className={STATE_BLOCK} role="alert">
      {icon ? (
        <span className="w-10 h-10 grid place-items-center rounded-full bg-crit text-crit-ink mb-1 [&_svg]:w-5 [&_svg]:h-5">
          {icon}
        </span>
      ) : null}
      <h3 className="text-[14px] font-semibold text-strong">{title}</h3>
      {description ? <p className="text-[13px] max-w-[360px]">{description}</p> : null}
      {onRetry ? (
        <div className="mt-1.5 flex gap-2">
          <Button size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
