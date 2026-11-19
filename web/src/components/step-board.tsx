import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Mark } from './mark';

/** Board band for task screens: back link or mark, optional 3-step progress, title and one line under it. */
export function StepBoard({
  back,
  step,
  title,
  sub,
  children,
}: {
  back?: { href: string; label: string };
  step?: 1 | 2 | 3;
  title: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="board" aria-labelledby="screen-title">
      <div className="top">
        {back ? (
          <Link className="back" href={back.href}>
            <ChevronLeft size={20} aria-hidden="true" />
            {back.label}
          </Link>
        ) : (
          <Mark />
        )}
        {step ? (
          <div className="prog" role="img" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((n) => (
              <i key={n} className={n < step ? 'on' : n === step ? 'now' : ''} />
            ))}
          </div>
        ) : null}
      </div>
      <h1 id="screen-title" className="board-title">
        {title}
      </h1>
      {sub ? <p className="board-sub">{sub}</p> : null}
      {children}
    </section>
  );
}
