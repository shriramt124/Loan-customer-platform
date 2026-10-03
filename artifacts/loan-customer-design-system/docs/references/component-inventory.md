# Component inventory

Source: the active customer experience in `artifacts/loan-customer`. The active
routes use a small, custom visual vocabulary rather than the unmodified starter
UI kit in `src/components/ui/`. The inventory captures the app's reusable
patterns and shared helpers, not route-level compositions such as the header,
footer, account shell, or full loan product cards.

| Family | Reference | Dependencies / blockers | Usage evidence | Chunk | Status |
| --- | --- | --- | --- | --- | --- |
| ButtonLink | `components/button-link.md` | `lucide-react` arrow icon | Shared CTA helper and primary/outline classes used across journey routes | 1 | implemented |
| Card | `components/card.md` | None | Repeated `.card` surface on loan, calculator, eligibility, application, contact, and profile routes | 1 | implemented |
| Field | `components/field.md` | None | Repeated `.field` and `.field-label` styles for application, eligibility, and profile inputs | 1 | implemented |
| PageIntro | `components/page-intro.md` | None | Shared route introduction on loans, calculator, eligibility, application, contact, and legal pages | 1 | implemented |
| Slider | `components/range-slider.md` | Native range input | Shared controlled range input for calculator amount, rate, and term | 1 | implemented |

The first chunk contains all five inventoried families, so there are no later
chunks. The source app's standalone `Button`, `Card`, and other UI-library files
are generated starter scaffolding and are not imported by its active routes;
the extracted Card and Field patterns instead come from the app's repeated CSS
classes and live call sites.