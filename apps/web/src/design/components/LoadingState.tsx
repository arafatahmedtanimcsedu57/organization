import type { ReactNode } from 'react';

export interface LoadingStateProps {
  message?: ReactNode;
}

const STATE_BLOCK = 'flex flex-col items-center text-center gap-1.5 py-12 px-6 text-sub';

/** Centered spinner for a page/card/table mid-fetch. */
export function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <div className={STATE_BLOCK} role="status" aria-live="polite">
      <span
        className="w-[26px] h-[26px] rounded-full border-[2.5px] border-line-2 border-t-brand animate-spin [animation-duration:700ms]"
        aria-hidden="true"
      />
      <p className="text-[13px] max-w-[360px]">{message}</p>
    </div>
  );
}
