import type { ReactNode } from 'react';

export interface LoadingStateProps {
  message?: ReactNode;
}

/** `.state-block.loading-state` — centered spinner for a page/card/table mid-fetch. */
export function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="state-block loading-state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
