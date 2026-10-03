import { lazy, type ComponentType } from 'react';
import {
  ContentGuidelinesPage,
  FontsPage,
  LayoutPage,
  MotionGuidelinesPage,
  OverviewPage,
  SemanticColorsPage,
  SurfaceColorsPage,
  BrandColorsPage,
} from './foundations';

type Page = ComponentType;

export type PageEntry = {
  id: string;
  name: string;
  description: string;
  Page: Page;
};

export type NavGroup = {
  name: string;
  entries: PageEntry[];
};

const ButtonLinkDemo = lazy(async () => ({
  default: (await import('./demos/button-link')).ButtonLinkDemo,
}));
const CardDemo = lazy(async () => ({
  default: (await import('./demos/card')).CardDemo,
}));
const FieldDemo = lazy(async () => ({
  default: (await import('./demos/field')).FieldDemo,
}));
const PageIntroDemo = lazy(async () => ({
  default: (await import('./demos/page-intro')).PageIntroDemo,
}));
const SliderDemo = lazy(async () => ({
  default: (await import('./demos/slider')).SliderDemo,
}));

export const DESIGN_SYSTEM = {
  title: 'Loan Customer Experience Design System',
  description:
    'A source-backed visual language for a calm, clear loan journey: warm paper, evergreen ink, editorial type, and reusable customer-facing patterns.',
};

export const OVERVIEW_ENTRY: PageEntry = {
  id: 'overview',
  name: 'Overview',
  description: 'Source, principles, and the five extracted component families.',
  Page: OverviewPage,
};

export const NAV_GROUPS: NavGroup[] = [
  {
    name: 'Foundations',
    entries: [
      {
        id: 'colors-brand',
        name: 'Brand palette',
        description: 'Evergreen, soft sage, and warm rust.',
        Page: BrandColorsPage,
      },
      {
        id: 'colors-surfaces',
        name: 'Surfaces and text',
        description: 'Paper, cards, borders, and readable type colors.',
        Page: SurfaceColorsPage,
      },
      {
        id: 'colors-semantic',
        name: 'Semantic colors',
        description: 'Status and chart roles in light and dark themes.',
        Page: SemanticColorsPage,
      },
      {
        id: 'typography',
        name: 'Typography',
        description: 'Newsreader, DM Sans, and the supplementary wordmark face.',
        Page: FontsPage,
      },
      {
        id: 'layout',
        name: 'Layout and shape',
        description: 'Spacing, content widths, surface corners, and motion.',
        Page: LayoutPage,
      },
    ],
  },
  {
    name: 'Components',
    entries: [
      {
        id: 'button-link',
        name: 'ButtonLink',
        description: 'Primary and outlined navigation calls to action.',
        Page: ButtonLinkDemo,
      },
      {
        id: 'card',
        name: 'Card',
        description: 'The warm-paper surface repeated across the experience.',
        Page: CardDemo,
      },
      {
        id: 'field',
        name: 'Field',
        description: 'Labeled text and select controls with nearby guidance.',
        Page: FieldDemo,
      },
      {
        id: 'page-intro',
        name: 'PageIntro',
        description: 'Eyebrow, editorial title, and concise page context.',
        Page: PageIntroDemo,
      },
      {
        id: 'slider',
        name: 'Slider',
        description: 'Controlled range input for illustrative loan estimates.',
        Page: SliderDemo,
      },
    ],
  },
  {
    name: 'Guidance',
    entries: [
      {
        id: 'content',
        name: 'Customer-facing language',
        description: 'Keep estimates clear and the lender relationship explicit.',
        Page: ContentGuidelinesPage,
      },
      {
        id: 'motion',
        name: 'Motion',
        description: 'Use brief entrance motion, with reduced-motion support.',
        Page: MotionGuidelinesPage,
      },
    ],
  },
];

export const ALL_ENTRIES: PageEntry[] = [
  OVERVIEW_ENTRY,
  ...NAV_GROUPS.flatMap((group) => group.entries),
];

const entryIds = ALL_ENTRIES.map((entry) => entry.id);
if (new Set(entryIds).size !== entryIds.length) {
  throw new Error('Design-system navigation contains duplicate page IDs.');
}