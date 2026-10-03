---
name: Card
description: Reusable warm-paper surface extracted from the app's repeated card class.
---

# Card

- **Source:** `artifacts/loan-customer/src/index.css`, line 96: `.card` uses a
  paper surface, a fine warm border, and a 20px radius.
- **Usage:** `artifacts/loan-customer/src/App.tsx`, lines 84–85, 96, 107,
  125, 140, 155, 168, 176, 182, and 186 show the same surface supporting
  product options, estimates, forms, documents, and profile details.
- **Implementation:** `src/components/ui/card.tsx` promotes that repeated class
  to a semantic wrapper with `div`, `article`, or `section` elements.

Layout and content remain the consumer's responsibility; this family defines
only the surface.