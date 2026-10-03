import { ButtonLink } from '../../components/ui/button-link';
import { Card } from '../../components/ui/card';
import { Guidelines } from '../parts';

export function ButtonLinkDemo() {
  return (
    <div className="space-y-6">
      <Card className="space-y-5 p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">
            Primary and secondary
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The primary action is evergreen with a trailing arrow. The secondary
            action is outlined and quieter.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="#button-link-demo">Check eligibility</ButtonLink>
          <ButtonLink href="#button-link-demo" secondary>
            Explore options
          </ButtonLink>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="font-serif text-2xl text-primary">ButtonLink</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Use for navigation-style calls to action. It preserves a native link
          destination, adds the source app&apos;s arrow cue, and exposes
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5">secondary</code>
          for the outlined treatment.
        </p>
      </Card>
      <Guidelines
        items={[
          { kind: 'do', text: 'Use one filled primary action for the main next step.' },
          { kind: 'do', text: 'Keep the outlined action visually secondary.' },
          { kind: 'dont', text: 'Do not use button styling to imply loan approval or a guaranteed offer.' },
        ]}
      />
    </div>
  );
}