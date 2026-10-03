---
name: PageIntro
description: Editorial title block reused across customer journey pages.
---

# PageIntro

- **Source:** `artifacts/loan-customer/src/App.tsx`, lines 71–73. Props are
  `eyebrow`, `title`, and `desc`.
- **Style:** The source uses a sage background, uppercase tracked eyebrow,
  Newsreader title, evergreen heading color, and a restrained body measure.
- **Usage:** Active on the loans, calculator, eligibility, application, contact,
  and legal routes.
- **Implementation:** `src/components/ui/page-intro.tsx` retains the source
  props and typography pattern, with colors mapped to design tokens. Optional
  `titleAs` selects `h1` or `h2` when the block is embedded in another page.