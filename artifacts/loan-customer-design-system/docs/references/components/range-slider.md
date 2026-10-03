---
name: Slider
description: Controlled range input used by the loan estimate calculator.
---

# Slider

- **Source:** `artifacts/loan-customer/src/App.tsx`, lines 114–116. Props are
  `label`, `value`, `min`, `max`, `step`, `display`, `onChange`, and `testid`.
- **Usage:** The calculator uses three instances for amount, annual rate, and
  repayment period at line 108.
- **Implementation:** `src/components/ui/slider.tsx` preserves the controlled
  value and numeric callback, and associates the visible label with the range
  input for keyboard and assistive-technology use.

The source provides a native range control; no multi-thumb or disabled variant
is defined.