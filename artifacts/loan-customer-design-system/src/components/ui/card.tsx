import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'article' | 'section';
};

export function Card({ as: Element = 'div', className, ...props }: CardProps) {
  return (
    <Element
      {...props}
      className={cn(
        'rounded-[20px] border border-border bg-card text-card-foreground',
        className,
      )}
    />
  );
}