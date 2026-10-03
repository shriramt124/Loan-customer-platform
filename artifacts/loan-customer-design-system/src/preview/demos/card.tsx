import { Card } from '../../components/ui/card';

export function CardDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card as="article" className="p-6">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">
          For a timely need
        </p>
        <h2 className="mt-3 font-serif text-3xl text-primary">Personal loan</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          A warm paper surface with a restrained border keeps product details
          easy to scan.
        </p>
      </Card>
      <Card as="section" className="bg-secondary p-6">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-secondary-foreground">
          Estimate only
        </p>
        <p className="mt-3 font-serif text-4xl text-primary">₹18,742</p>
        <p className="mt-2 text-sm text-muted-foreground">Illustrative monthly amount</p>
      </Card>
    </div>
  );
}