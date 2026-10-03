import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export function ButtonLink({
  href,
  children,
  secondary = false,
  testid,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  testid?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 ${
        secondary
          ? 'border border-secondary-foreground/25 bg-transparent text-primary hover:bg-secondary'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'
      }`}
      data-testid={testid}
    >
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </a>
  );
}