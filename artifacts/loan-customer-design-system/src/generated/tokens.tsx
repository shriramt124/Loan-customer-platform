/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#f9f7f0",
      "foreground": "#1d3a34",
      "border": "#e2dbcf",
      "card": "#fbf9f3",
      "cardForeground": "#1d3a34",
      "popover": "#fcfbf8",
      "popoverForeground": "#1d3a34",
      "primary": "#1d4039",
      "primaryForeground": "#f5f1e7",
      "secondary": "#e9eee5",
      "secondaryForeground": "#22443d",
      "muted": "#eeeae2",
      "mutedForeground": "#526a61",
      "accent": "#d7774b",
      "accentForeground": "#2f1c16",
      "destructive": "#c43631",
      "destructiveForeground": "#162724",
      "input": "#d8d8ce",
      "ring": "#356656",
      "chart1": "#1d4039",
      "chart2": "#5f8c73",
      "chart3": "#d7774b",
      "chart4": "#b89a6c",
      "chart5": "#718b7d",
      "sidebar": "#fbf9f3",
      "sidebarForeground": "#294a41",
      "sidebarBorder": "#e2dbcf",
      "sidebarPrimary": "#1d4039",
      "sidebarPrimaryForeground": "#f5f1e7",
      "sidebarAccent": "#e9eee5",
      "sidebarAccentForeground": "#22443d",
      "sidebarRing": "#356656"
    },
    "dark": {
      "background": "#162724",
      "foreground": "#f1ede4",
      "border": "#3b544e",
      "card": "#1f332f",
      "cardForeground": "#f1ede4",
      "popover": "#1f332f",
      "popoverForeground": "#f1ede4",
      "primary": "#dfc290",
      "primaryForeground": "#182f2a",
      "secondary": "#2f4641",
      "secondaryForeground": "#f1ede4",
      "muted": "#2e423e",
      "mutedForeground": "#b9b2a2",
      "accent": "#de8a59",
      "accentForeground": "#2b1c14",
      "destructive": "#e07c74",
      "destructiveForeground": "#ffffff",
      "input": "#3b544e",
      "ring": "#dfc290",
      "chart1": "#dfc290",
      "chart2": "#8fb39c",
      "chart3": "#de8a59",
      "chart4": "#d8c7a6",
      "chart5": "#779b8b",
      "sidebar": "#13211e",
      "sidebarForeground": "#f1ede4",
      "sidebarBorder": "#344a45",
      "sidebarPrimary": "#dfc290",
      "sidebarPrimaryForeground": "#182f2a",
      "sidebarAccent": "#2f4641",
      "sidebarAccentForeground": "#f1ede4",
      "sidebarRing": "#dfc290"
    }
  },
  "fontFamily": {
    "sans": [
      "DM Sans",
      "sans-serif"
    ],
    "serif": [
      "Newsreader",
      "Georgia",
      "serif"
    ],
    "mono": [
      "ui-monospace",
      "monospace"
    ]
  },
  "radius": "0.8rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
