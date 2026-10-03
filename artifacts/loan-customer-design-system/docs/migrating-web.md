# Migrating web UI to Loan Customer Experience Design System

Read `artifacts/loan-customer-design-system/docs/AGENTS.md` and
`artifacts/loan-customer-design-system/docs/consuming-web.md` first. Use this guide
when a web app, including a fresh scaffold, already has local theme or component
copies.

## Replace the local theme

Replace the app's Tailwind/theme setup with the package import from the web
consumption guide.

- Remove the app's own `@import "tailwindcss"`, plugin imports, and generated
  `:root` / `.dark` token definitions.
- Keep app-specific CSS that is not a theme or package-provided primitive.
- Keep Tailwind v3 directives and configure its package component source as
  described in the web consumption guide.

## Rewrite imports

Rewrite every local import for a module this package provides:

- `@/components/ui/button` → `@workspace/loan-customer-design-system/components/ui/button-link`
- `@/components/ui/card` → `@workspace/loan-customer-design-system/components/ui/card`
- `@/components/ui/field` → `@workspace/loan-customer-design-system/components/ui/field`
- `@/components/ui/page-intro` → `@workspace/loan-customer-design-system/components/ui/page-intro`
- `@/components/ui/slider` → `@workspace/loan-customer-design-system/components/ui/slider`
- `@/lib/utils` (`cn`) → `@workspace/loan-customer-design-system/lib/utils`

Judge component ownership by the imported module, not by the file doing the
import. The package supplies only the five source-backed families listed
above; other UI components and route-level compositions remain app-owned.

## Delete superseded files

- Delete only the local copies of the five package-provided families from the
  app's `src/components/ui/`.
- Delete local `src/lib/utils.ts` when it only provided `cn`.
- Remove dependencies used only by the deleted local component library when the
  design-system package already supplies them transitively.

## Verify migration

Grep for the five migrated component imports and `@/lib/utils`. Every remaining
match must refer to an app-specific module or a component this package does not
provide. Run typecheck and the dev server after deleting local copies.

Migration is complete when no migrated component, `cn`, or theme token block
remains duplicated locally.
