import type { ReactNode } from 'react';

export function PageIntro({
  eyebrow,
  title,
  desc,
  titleAs = 'h1',
}: {
  eyebrow: string;
  title: ReactNode;
  desc: string;
  titleAs?: 'h1' | 'h2';
}) {
  const Heading = titleAs;

  return (
    <section className="bg-secondary py-14 md:py-[72px]">
      <div className="mx-auto w-[min(1180px,calc(100%-32px))] md:w-[min(1180px,calc(100%-48px))]">
        <p className="text-[.69rem] font-bold uppercase tracking-[.15em] text-muted-foreground">
          {eyebrow}
        </p>
        <Heading className="mt-3 max-w-3xl font-serif text-5xl leading-[1.02] tracking-[-.035em] text-primary md:text-[4.4rem]">
          {title}
        </Heading>
        <p className="mt-5 max-w-2xl text-lg leading-7 text-muted-foreground">
          {desc}
        </p>
      </div>
    </section>
  );
}