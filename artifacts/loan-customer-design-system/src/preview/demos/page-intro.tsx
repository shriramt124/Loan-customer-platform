import { PageIntro } from '../../components/ui/page-intro';

export function PageIntroDemo() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <PageIntro
        eyebrow="A clearer picture"
        titleAs="h2"
        title={
          <>
            Make the monthly math <em className="font-normal">make sense.</em>
          </>
        }
        desc="A short introduction establishes context before the customer reaches the calculator or application."
      />
    </div>
  );
}