---
name: Field
description: Label, input, select, and helper-text pattern from customer forms.
---

# Field

- **Source:** `artifacts/loan-customer/src/index.css`, lines 97–99 define the
  input border, 10px corners, focus ring, and bold field label.
- **Usage:** `artifacts/loan-customer/src/App.tsx`, lines 125–126, 140–142,
  153–155, and 185–186 use the pattern for eligibility, application, contact,
  and profile information.
- **Implementation:** `src/components/ui/field.tsx` packages the label and
  helper text with matching native input and select controls.

The source has no separate error-state component or custom validation visual;
those states are intentionally not claimed here.