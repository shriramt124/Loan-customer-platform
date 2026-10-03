import { useState } from 'react';
import { ButtonLink } from '../components/ui/button-link';
import { Card } from '../components/ui/card';
import {
  Field,
  FieldInput,
  FieldSelect,
} from '../components/ui/field';
import { PageIntro } from '../components/ui/page-intro';
import { Slider } from '../components/ui/slider';
import { Guidelines } from './parts';

function Swatch({
  name,
  variable,
  colorClass,
}: {
  name: string;
  variable: string;
  colorClass: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className={`h-20 rounded-lg border border-border/70 ${colorClass}`} />
      <p className="mt-3 text-sm font-bold text-foreground">{name}</p>
      <code className="mt-1 block text-[.68rem] text-muted-foreground">
        {variable}
      </code>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-3xl text-primary">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function OverviewPage() {
  const [amount, setAmount] = useState(1250000);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <Card className="bg-primary p-6 text-primary-foreground md:p-8">
          <p className="text-xs font-bold uppercase tracking-[.15em] text-primary-foreground/75">
            Source-backed visual direction
          </p>
          <h2 className="mt-4 font-serif text-4xl leading-tight">
            Clear beats clever.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-primary-foreground/80">
            Evergreen actions, warm paper surfaces, a soft sage backdrop, and
            editorial titles help customers focus on the decision in front of
            them.
          </p>
          <div className="mt-6 flex flex-wrap gap-2" aria-label="Core colors">
            <span className="h-8 w-8 rounded-full border border-white/30 bg-primary" />
            <span className="h-8 w-8 rounded-full border border-white/30 bg-secondary" />
            <span className="h-8 w-8 rounded-full border border-white/30 bg-accent" />
            <span className="h-8 w-8 rounded-full border border-white/30 bg-background" />
          </div>
        </Card>
        <Card className="flex flex-col justify-between gap-6 p-6 md:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">
              Extraction scope
            </p>
            <h2 className="mt-3 font-serif text-3xl text-primary">
              Five families from the active customer journey
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The source app&apos;s repeated classes and shared helpers—not its
              unused starter UI library—inform this catalog.
            </p>
          </div>
          <ol className="grid gap-2 text-sm font-semibold text-secondary-foreground sm:grid-cols-2">
            <li className="rounded-lg bg-secondary px-3 py-2">01 · ButtonLink</li>
            <li className="rounded-lg bg-secondary px-3 py-2">02 · Card</li>
            <li className="rounded-lg bg-secondary px-3 py-2">03 · Field</li>
            <li className="rounded-lg bg-secondary px-3 py-2">04 · PageIntro</li>
            <li className="rounded-lg bg-secondary px-3 py-2 sm:col-span-2">
              05 · Slider
            </li>
          </ol>
        </Card>
      </section>

      <section>
        <SectionTitle
          title="Reusable patterns"
          description="The controls below are functional examples of the extracted component families."
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="flex flex-wrap items-center gap-3 p-5">
            <ButtonLink href="#overview-actions">Check eligibility</ButtonLink>
            <ButtonLink href="#overview-actions" secondary>
              Explore options
            </ButtonLink>
          </Card>
          <Card as="article" className="p-5">
            <p className="text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">
              Warm paper card
            </p>
            <p className="mt-2 font-serif text-2xl text-primary">
              One decision at a time.
            </p>
          </Card>
          <Card className="p-5">
            <Field label="Loan purpose" htmlFor="overview-purpose">
              <FieldSelect id="overview-purpose" defaultValue="personal">
                <option value="personal">Personal need</option>
                <option value="home">Home improvement</option>
                <option value="business">Business need</option>
              </FieldSelect>
            </Field>
          </Card>
          <Card className="p-5">
            <Slider
              label="Loan amount"
              value={amount}
              min={50000}
              max={5000000}
              step={25000}
              display={`₹${new Intl.NumberFormat('en-IN').format(amount)}`}
              onChange={setAmount}
              testid="overview-loan-amount"
            />
          </Card>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border">
        <PageIntro
          eyebrow="A clearer picture"
          titleAs="h2"
          title={
            <>
              Make the monthly math <em className="font-normal">make sense.</em>
            </>
          }
          desc="A short introduction establishes context before a customer reaches the calculator or application."
        />
      </section>

      <Card className="p-6 md:p-8">
        <SectionTitle
          title="Guidance"
          description="Keep the customer journey calm, explicit, and easy to verify."
        />
        <Guidelines
          items={[
            { kind: 'do', text: 'Keep illustrative amounts and eligibility checks clearly labeled.' },
            { kind: 'do', text: 'Name the partner lender as the decision-maker.' },
            { kind: 'dont', text: 'Do not promise approval, disbursement timing, or a final rate.' },
            { kind: 'dont', text: 'Do not hide terms, forms, or disclosures behind animation or stacked cards.' },
          ]}
        />
      </Card>
    </div>
  );
}

export function BrandColorsPage() {
  return (
    <div>
      <SectionTitle
        title="Evergreen, sage, rust"
        description="These three source colors carry the visual identity: evergreen for actions, soft sage for section separation, and rust for restrained emphasis."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Swatch name="Evergreen ink" variable="color.primary" colorClass="bg-primary" />
        <Swatch name="Soft sage" variable="color.secondary" colorClass="bg-secondary" />
        <Swatch name="Warm rust" variable="color.accent" colorClass="bg-accent" />
      </div>
      <Card className="mt-5 p-5">
        <Guidelines
          items={[
            { kind: 'do', text: 'Use evergreen as the strongest brand color.' },
            { kind: 'do', text: 'Reserve rust for small accents and emphasis.' },
            { kind: 'dont', text: 'Do not use rust for long text on a light sage background.' },
          ]}
        />
      </Card>
    </div>
  );
}

export function SurfaceColorsPage() {
  return (
    <div>
      <SectionTitle
        title="Warm paper and readable text"
        description="Every sample follows the active light/dark theme. Switch themes in the preview header to inspect both role sets."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Swatch name="Page background" variable="color.background" colorClass="bg-background" />
        <Swatch name="Primary text" variable="color.foreground" colorClass="bg-foreground" />
        <Swatch name="Card surface" variable="color.card" colorClass="bg-card" />
        <Swatch name="Muted surface" variable="color.muted" colorClass="bg-muted" />
        <Swatch name="Border" variable="color.border" colorClass="bg-border" />
        <Swatch name="Input border" variable="color.input" colorClass="bg-input" />
        <Swatch name="Sidebar surface" variable="color.sidebar" colorClass="bg-sidebar" />
      </div>
    </div>
  );
}

export function SemanticColorsPage() {
  return (
    <div className="space-y-7">
      <section>
        <SectionTitle
          title="Status and feedback"
          description="Error styling is intentionally distinct from the warm brand accent."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Swatch
            name="Destructive"
            variable="color.destructive"
            colorClass="bg-destructive"
          />
          <Swatch
            name="Destructive text"
            variable="color.destructiveForeground"
            colorClass="bg-destructive-foreground"
          />
          <Swatch name="Focus ring" variable="color.ring" colorClass="bg-ring" />
        </div>
      </section>
      <section>
        <SectionTitle
          title="Chart roles"
          description="The token set provides five coordinated series for future charts; the source app does not currently contain a chart palette."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Swatch name="Series 1" variable="color.chart1" colorClass="bg-chart-1" />
          <Swatch name="Series 2" variable="color.chart2" colorClass="bg-chart-2" />
          <Swatch name="Series 3" variable="color.chart3" colorClass="bg-chart-3" />
          <Swatch name="Series 4" variable="color.chart4" colorClass="bg-chart-4" />
          <Swatch name="Series 5" variable="color.chart5" colorClass="bg-chart-5" />
        </div>
      </section>
    </div>
  );
}

export function FontsPage() {
  return (
    <div className="space-y-4">
      <Card className="p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">
          Editorial heading · Newsreader
        </p>
        <p className="mt-4 max-w-3xl font-serif text-5xl leading-[1.04] tracking-[-.035em] text-primary md:text-6xl">
          A loan should fit your life.
        </p>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Use the serif face for page titles and a small number of prominent
          figures, not for dense forms or supporting details.
        </p>
      </Card>
      <Card className="p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">
          Interface and body · DM Sans
        </p>
        <p className="mt-4 max-w-3xl text-base leading-7 text-foreground">
          Plain-language labels and concise explanations help customers
          understand loan options, example repayments, required documents, and
          the role of the partner lender.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Body 16px · Supporting 14px · Eyebrow 11px with tracked capitals
        </p>
      </Card>
      <Card className="p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">
          Supplementary wordmark face · Manrope
        </p>
        <p
          className="mt-3 text-4xl font-extrabold tracking-[-.055em] text-primary"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Saanjh
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          The source renders its sample name as text; no standalone logo asset is
          included or recreated here.
        </p>
      </Card>
    </div>
  );
}

export function LayoutPage() {
  const spacing = [
    { label: '4px', width: 'w-4' },
    { label: '8px', width: 'w-8' },
    { label: '12px', width: 'w-12' },
    { label: '16px', width: 'w-16' },
    { label: '24px', width: 'w-24' },
    { label: '32px', width: 'w-32' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8">
        <SectionTitle
          title="A 4px spacing base"
          description="The source uses compact control spacing and larger section gaps so terms and form details stay easy to scan."
        />
        <div className="space-y-3">
          {spacing.map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              <span className="w-12 text-xs font-semibold text-muted-foreground">
                {item.label}
              </span>
              <span className={`h-3 rounded-sm bg-primary ${item.width}`} />
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6 md:p-8">
        <SectionTitle
          title="Surface corners"
          description="Keep the shape hierarchy consistent: controls are compact, cards are rounded, and hero art may use a larger radius."
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Field · 10px', 'rounded-[10px]'],
            ['Card · 20px', 'rounded-[20px]'],
            ['Hero art · 30px', 'rounded-[30px]'],
            ['CTA · pill', 'rounded-full'],
          ].map(([label, radius]) => (
            <div key={label} className="text-center">
              <div
                className={`mx-auto h-16 w-24 border border-input bg-secondary ${radius}`}
              />
              <p className="mt-2 text-xs font-semibold text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function ContentGuidelinesPage() {
  return (
    <div className="space-y-5">
      <Card className="p-6 md:p-8">
        <SectionTitle
          title="Clarity before persuasion"
          description="The source experience frames rates, amounts, and eligibility as examples. Keep that context near the number or decision it qualifies."
        />
        <Guidelines
          items={[
            { kind: 'do', text: 'Call repayment figures illustrative and state the assumptions that affect them.' },
            { kind: 'do', text: 'Explain that partner NBFCs make the final lending and approval decision.' },
            { kind: 'do', text: 'Keep required documents, repayment terms, and fees visible and easy to compare.' },
            { kind: 'do', text: 'If profile photos are added later, keep them optional with an initials fallback and separate from KYC documents.' },
            { kind: 'dont', text: 'Do not imply that an eligibility estimate is an approval.' },
            { kind: 'dont', text: 'Do not describe the LSP as the lender.' },
          ]}
        />
      </Card>
      <Card className="bg-secondary p-6">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">
          Example
        </p>
        <p className="mt-2 font-serif text-2xl text-primary">
          “An illustrative estimate, not a lender offer.”
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Use direct, specific caveats beside calculators and eligibility
          checks—not only in a footer or separate legal page.
        </p>
      </Card>
    </div>
  );
}

export function MotionGuidelinesPage() {
  return (
    <div className="space-y-5">
      <Card className="p-6 md:p-8">
        <SectionTitle
          title="Motion should not delay a decision"
          description="The source uses a brief upward reveal on explanatory content and honors reduced-motion preferences."
        />
        <div className="rounded-xl border border-border bg-secondary p-5">
          <p className="text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">
            Source pattern
          </p>
          <p className="mt-3 font-serif text-3xl text-primary">Rise in, then stop.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The original reveal lasts about 650ms, moves 14px, and is removed
            when the visitor requests reduced motion.
          </p>
        </div>
        <div className="mt-5">
          <Guidelines
            items={[
              { kind: 'do', text: 'Use short entrance motion to clarify hierarchy, not to add suspense.' },
              { kind: 'do', text: 'Reserve scroll storytelling and subtle parallax for non-essential explanatory content.' },
              { kind: 'do', text: 'Use stacked cards only when comparisons and status details remain easy to scan.' },
              { kind: 'do', text: 'Keep forms, rates, terms, statuses, and disclosures immediately readable.' },
              { kind: 'dont', text: 'Do not make terms or primary actions depend on scrolling choreography.' },
              { kind: 'dont', text: 'Do not use parallax on loan terms or essential forms.' },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}