# Loan Customer Experience design notes

## Source and scope

This system was extracted from the active UI in `artifacts/loan-customer`.
The source calls its sample concept “Saanjh” and labels it as a demo, so the
system preserves its visual language without treating that concept as an
approved production brand.

There is no standalone logo asset or separate design-system usage guide in the
source. The app renders a text wordmark in code; this package does not invent or
redraw a logo. The active routes use five reusable UI families recorded in
`docs/references/component-inventory.md`. The old standalone UI-library files
are unmodified starter scaffolding, not the source app's active visual language.

## Source-derived usage rules

- Use evergreen for primary actions and important headings; use the rust accent
  sparingly rather than as a large background.
- Use warm paper for cards and fields, sage to distinguish explanatory
  sections, and thin warm borders to separate surfaces.
- Keep one clear primary action. Use the outlined treatment for secondary
  actions, and preserve visible focus indication.
- Use Newsreader for editorial page titles and DM Sans for body and interface
  text. Manrope is a supplementary wordmark face in the source.
- Keep route introductions concise: eyebrow, title, short explanation.
- Use plain, non-pressuring language. Keep illustrative estimates labeled as
  estimates, distinguish the LSP from the partner lender, and do not imply
  approval or a guaranteed offer.
- If a customer profile photo is introduced, make it optional, provide an
  initials fallback, and keep it separate from identity-verification documents.
- The source uses brief upward entrance reveals and disables them under
  `prefers-reduced-motion`; do not turn the explanatory experience into motion
  that delays or hides loan terms, forms, statuses, or disclosures.
- Scroll storytelling and subtle parallax may support non-essential
  explanatory content, but never make terms or actions depend on scrolling
  choreography. Stacked cards are appropriate only when all essential
  comparisons and status details remain easy to scan.

The source documents no separate component guidelines; the rules above are
derived from its repeated classes, helpers, and active route examples.