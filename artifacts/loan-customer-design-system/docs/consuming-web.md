# Consuming Loan Customer Experience Design System in web apps

Read `artifacts/loan-customer-design-system/docs/AGENTS.md` first. This guide covers
React/Vite and other shadcn/Tailwind web consumers. If the app already contains
a local theme or component library, also read
`artifacts/loan-customer-design-system/docs/migrating-web.md` before writing UI.

## Theme

Import this package's theme once from the app's main CSS:

```css
@import "@workspace/loan-customer-design-system/styles.css";
```

`styles.css` already imports Tailwind, its plugins, and this package's token
theme. It also registers this package's component sources. Do not add a separate
Tailwind import or a `node_modules` source path in a Tailwind v4 consumer.
Tailwind v3 consumers keep their existing `@tailwind` directives and add
`node_modules/@workspace/loan-customer-design-system/src/components` to `content`.

## Components and helpers

Import the extracted customer-experience components directly from this package:

```tsx
import { ButtonLink } from "@workspace/loan-customer-design-system/components/ui/button-link";
import { Card } from "@workspace/loan-customer-design-system/components/ui/card";
import {
  Field,
  FieldInput,
  FieldSelect,
} from "@workspace/loan-customer-design-system/components/ui/field";
import { PageIntro } from "@workspace/loan-customer-design-system/components/ui/page-intro";
import { Slider } from "@workspace/loan-customer-design-system/components/ui/slider";
import { cn } from "@workspace/loan-customer-design-system/lib/utils";
```

These families preserve the source app's CTA, card, field, route-intro, and
calculator-slider patterns. Keep product-specific compositions in the app.
`ButtonLink` uses a normal `href`; adapt it to the consuming app's router if
client-side navigation is required.

## Verify

After wiring the workspace dependency, import and render
`@workspace/loan-customer-design-system/components/ui/button-link`. Run the
app's typecheck and dev server. The import must resolve and the component must
use this package's theme before broader UI work begins.

## Ongoing rules

- Keep one source of theme variables.
- Import the five source-backed component families and helpers from the package path.
- Add reusable product-agnostic components to this package first.
- For a non-shadcn app, use the tokens as the source of truth and adapt existing
  components to the token CSS variables without copying token values.
