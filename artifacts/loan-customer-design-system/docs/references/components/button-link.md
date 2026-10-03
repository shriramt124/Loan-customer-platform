---
name: ButtonLink
description: Source-backed CTA link with primary and outlined treatments.
---

# ButtonLink

- **Source:** `artifacts/loan-customer/src/App.tsx`, lines 28–30. The helper
  accepts `href`, `children`, `secondary`, and `testid`, then renders a link with
  a trailing arrow.
- **Style:** `artifacts/loan-customer/src/index.css`, lines 90–95. The two
  source treatments are a pill-shaped evergreen primary and a transparent
  outlined secondary with a subtle hover lift.
- **Usage:** The header, hero, calculator, eligibility, and loan journeys use
  this CTA pattern.
- **Implementation:** `src/components/ui/button-link.tsx` keeps those props and
  appearance. It uses a native anchor so consumers supply a normal `href`.

No disabled or loading variant is defined in the source.