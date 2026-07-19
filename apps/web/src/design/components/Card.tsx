import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Lift on hover — for cards that act as a click target (e.g. a dashboard tile). */
  interactive?: boolean;
  children: ReactNode;
}

function CardBase({ interactive = false, className, children, ...rest }: CardProps) {
  const classes = ['card'];
  if (interactive) classes.push('interactive');
  if (className) classes.push(className);

  return (
    <section className={classes.join(' ')} {...rest}>
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
    <div className="card-head">
      <h2>{title}</h2>
      {actions ? <div className="ch-actions">{actions}</div> : null}
    </div>
  );
}

function CardBody({ children }: { children: ReactNode }) {
  return <div className="card-body">{children}</div>;
}

/** A bordered sub-section within a card (`.card-sec`) — stacks for multi-part cards. */
function CardSection({ children }: { children: ReactNode }) {
  return <div className="card-sec">{children}</div>;
}

function CardFooter({ children }: { children: ReactNode }) {
  return <div className="card-foot">{children}</div>;
}

/** `.card` — white rounded surface with soft shadow, ported from `ui_design/shopify/styles.css`. */
export const Card = Object.assign(CardBase, {
  Header: CardHeader,
  Body: CardBody,
  Section: CardSection,
  Footer: CardFooter,
});
