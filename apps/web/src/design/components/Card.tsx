import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Lift on hover - for cards that act as a click target (e.g. a dashboard tile). */
  interactive?: boolean;
  children: ReactNode;
}

/** `.card` is kept as a hook so the print stylesheet can flatten it; all visual styling is utilities. */
const CARD_BASE = 'card bg-surface rounded-lg shadow-1 mb-4';
const CARD_INTERACTIVE =
  'transition-[box-shadow,transform] duration-150 ease-brand hover:shadow-2 hover:-translate-y-px';

function CardBase({ interactive = false, className, children, ...rest }: CardProps) {
  const classes = [CARD_BASE, interactive ? CARD_INTERACTIVE : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes} {...rest}>
      {children}
    </section>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
}

function CardHeader({ title, actions }: CardHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-[14px] flex-wrap justify-between">
      <h2 className="text-[14px] font-semibold text-strong">{title}</h2>
      {actions ? <div className="ch-actions  flex gap-1.5">{actions}</div> : null}
    </div>
  );
}

function CardBody({ children }: { children: ReactNode }) {
  return <div className="px-4 pb-4">{children}</div>;
}

/** A bordered sub-section within a card - stacks for multi-part cards. */
function CardSection({ children }: { children: ReactNode }) {
  return <div className="p-4 border-t border-line-2">{children}</div>;
}

function CardFooter({ children }: { children: ReactNode }) {
  return <div className="px-4 py-3 border-t border-line-2 flex gap-2 justify-end">{children}</div>;
}

/** `.card` - white rounded surface with soft shadow. */
export const Card = Object.assign(CardBase, {
  Header: CardHeader,
  Body: CardBody,
  Section: CardSection,
  Footer: CardFooter,
});
