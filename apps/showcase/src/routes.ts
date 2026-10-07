import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export const GROUPS = [
  'Foundations',
  'Actions',
  'Communication',
  'Containment',
  'Navigation',
  'Selection',
  'Text inputs',
] as const;
export type Group = (typeof GROUPS)[number];

export interface PageInfo {
  /** Route (`#/<id>`) and module name (`pages/<id>.tsx`, default export). */
  id: string;
  title: string;
  group: Group;
  /** Material Symbols name for the navigation. */
  icon: string;
  summary: string;
}

export const PAGES: readonly PageInfo[] = [
  {
    id: 'color',
    title: 'Color',
    group: 'Foundations',
    icon: 'palette',
    summary: 'Colour roles, light and dark, baseline or dynamic.',
  },
  {
    id: 'typography',
    title: 'Typography',
    group: 'Foundations',
    icon: 'match_case',
    summary: 'The type scale: 15 roles, baseline and emphasized.',
  },
  {
    id: 'shape',
    title: 'Shape',
    group: 'Foundations',
    icon: 'interests',
    summary: 'Corner scale and the 35 expressive shapes, morphing on springs.',
  },
  {
    id: 'motion',
    title: 'Motion',
    group: 'Foundations',
    icon: 'animation',
    summary: 'Spring tokens: spatial and effects, expressive and standard.',
  },
  {
    id: 'buttons',
    title: 'Buttons',
    group: 'Actions',
    icon: 'smart_button',
    summary: 'Filled, tonal, outlined, elevated and text; five sizes, round or square.',
  },
  {
    id: 'icon-buttons',
    title: 'Icon buttons',
    group: 'Actions',
    icon: 'favorite',
    summary: 'Standard, filled, tonal and outlined icon buttons, with toggles.',
  },
  {
    id: 'toggle-buttons',
    title: 'Toggle buttons',
    group: 'Actions',
    icon: 'toggle_on',
    summary: 'Buttons and icon buttons that stay selected, with a shape morph.',
  },
  {
    id: 'fab',
    title: 'FAB',
    group: 'Actions',
    icon: 'add_circle',
    summary: 'Floating action buttons and extended FABs in three sizes.',
  },
  {
    id: 'fab-menu',
    title: 'FAB menu',
    group: 'Actions',
    icon: 'menu_open',
    summary: 'A FAB that opens a menu of related actions.',
  },
  {
    id: 'split-button',
    title: 'Split button',
    group: 'Actions',
    icon: 'call_split',
    summary: 'A primary action with a menu of alternatives.',
  },
  {
    id: 'button-groups',
    title: 'Button groups',
    group: 'Actions',
    icon: 'view_week',
    summary: 'Standard groups that enlarge on press, and connected groups.',
  },
  {
    id: 'segmented-buttons',
    title: 'Segmented buttons',
    group: 'Actions',
    icon: 'view_column',
    summary: 'Single and multiple selection between a few options.',
  },
  {
    id: 'badges',
    title: 'Badges',
    group: 'Communication',
    icon: 'notifications',
    summary: 'Small dots and counts on icons and navigation items.',
  },
  {
    id: 'progress',
    title: 'Progress indicators',
    group: 'Communication',
    icon: 'progress_activity',
    summary: 'Linear, circular and wavy indicators, plus the loading indicator.',
  },
  {
    id: 'snackbar',
    title: 'Snackbar',
    group: 'Communication',
    icon: 'chat_info',
    summary: 'Brief messages about app processes, with an optional action.',
  },
  { id: 'tooltips', title: 'Tooltips', group: 'Communication', icon: 'info', summary: 'Plain and rich tooltips.' },
  {
    id: 'cards',
    title: 'Cards',
    group: 'Containment',
    icon: 'dashboard',
    summary: 'Elevated, filled and outlined cards.',
  },
  {
    id: 'carousel',
    title: 'Carousel',
    group: 'Containment',
    icon: 'view_carousel',
    summary: 'Multi-browse, hero, centred hero, uncontained and full-screen layouts.',
  },
  {
    id: 'dialogs',
    title: 'Dialogs',
    group: 'Containment',
    icon: 'web_asset',
    summary: 'Basic and list dialogs, with and without an icon.',
  },
  {
    id: 'sheets',
    title: 'Sheets',
    group: 'Containment',
    icon: 'vertical_split',
    summary: 'Bottom and side sheets, standard and modal, with drag to dismiss.',
  },
  {
    id: 'lists',
    title: 'Lists',
    group: 'Containment',
    icon: 'list',
    summary: 'Standard, segmented, expandable and swipeable lists.',
  },
  {
    id: 'dividers',
    title: 'Dividers',
    group: 'Containment',
    icon: 'horizontal_rule',
    summary: 'Full-width, inset and middle dividers.',
  },
  {
    id: 'app-bars',
    title: 'App bars',
    group: 'Navigation',
    icon: 'web',
    summary: 'Top app bars (small, medium, large) with scroll behaviour, and the bottom app bar.',
  },
  {
    id: 'navigation',
    title: 'Navigation bar & rail',
    group: 'Navigation',
    icon: 'side_navigation',
    summary: 'Navigation bars and rails, collapsed and expanded.',
  },
  {
    id: 'tabs',
    title: 'Tabs',
    group: 'Navigation',
    icon: 'tab',
    summary: 'Primary and secondary tabs, fixed and scrollable.',
  },
  {
    id: 'toolbars',
    title: 'Toolbars',
    group: 'Navigation',
    icon: 'construction',
    summary: 'Floating and docked toolbars, standard and vibrant.',
  },
  {
    id: 'search',
    title: 'Search',
    group: 'Navigation',
    icon: 'search',
    summary: 'Search bar with docked and full-screen views.',
  },
  {
    id: 'checkbox',
    title: 'Checkbox',
    group: 'Selection',
    icon: 'check_box',
    summary: 'Checked, unchecked and indeterminate.',
  },
  {
    id: 'radio',
    title: 'Radio button',
    group: 'Selection',
    icon: 'radio_button_checked',
    summary: 'One option from a set.',
  },
  {
    id: 'switch',
    title: 'Switch',
    group: 'Selection',
    icon: 'toggle_on',
    summary: 'On / off, with and without icons.',
  },
  {
    id: 'chips',
    title: 'Chips',
    group: 'Selection',
    icon: 'label',
    summary: 'Assist, filter, input and suggestion chips.',
  },
  {
    id: 'menus',
    title: 'Menus',
    group: 'Selection',
    icon: 'menu',
    summary: 'Standard and vibrant menus with groups, selection and submenus.',
  },
  {
    id: 'sliders',
    title: 'Sliders',
    group: 'Selection',
    icon: 'tune',
    summary: 'Standard, centred and range sliders in five sizes.',
  },
  {
    id: 'date-pickers',
    title: 'Date pickers',
    group: 'Selection',
    icon: 'calendar_month',
    summary: 'Modal, docked, input and range date pickers.',
  },
  {
    id: 'time-pickers',
    title: 'Time pickers',
    group: 'Selection',
    icon: 'schedule',
    summary: 'Dial and keyboard time pickers, 12 and 24 hour.',
  },
  {
    id: 'text-fields',
    title: 'Text fields',
    group: 'Text inputs',
    icon: 'text_fields',
    summary: 'Filled and outlined text fields.',
  },
];

export const pageById = (id: string) => PAGES.find((p) => p.id === id);

const modules = import.meta.glob<{ default: ComponentType }>('./pages/*.tsx');

/** Each page module as a lazy component, keyed by page id (loaded on first visit). */
export const PAGE_COMPONENTS: ReadonlyMap<string, LazyExoticComponent<ComponentType>> = new Map(
  Object.entries(modules).map(([path, load]) => [path.replace(/^\.\/pages\/(.*)\.tsx$/, '$1'), lazy(load)]),
);
