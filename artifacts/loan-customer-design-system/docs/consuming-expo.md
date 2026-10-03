# Using Loan Customer Experience tokens in Expo

This extraction currently supports the source app's web interface. It does not
ship React Native components, Expo hooks, font binaries, or native styles. Do not
import the web stylesheet or DOM components into a native screen.

The generated token object is portable:

```tsx
import { tokens } from "@workspace/loan-customer-design-system/tokens";
```

Use its colors, radius, spacing, and font-family names as inputs to an Expo
theme. The source typography is DM Sans for interface and body text, Newsreader
for editorial headings, and Manrope for the sample wordmark. These are CSS
family names only; the source web app loads them from Google Fonts. An Expo app
must supply and load compatible font files before using those typefaces.

If native support is needed, create platform-specific counterparts in the Expo
app, map the five documented web families to native primitives, and verify
their focus, accessibility, and interaction behavior on device. Add those
families to this package only after a native implementation and its behavior
have been documented and tested.