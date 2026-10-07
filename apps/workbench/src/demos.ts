/** A playground at /demo/<path>. */
export interface Demo {
  path: string;
  /** Other paths that open the same playground. */
  aliases?: readonly string[];
  /** Link text in the gallery. */
  label: string;
  /** Module in src/pages and the component it exports (same name). */
  page: string;
}

/**
 * Every playground: the router, the gallery's links and the console spec read this table (plain data,
 * so the Playwright specs can import it).
 */
export const demos: readonly Demo[] = [
  { path: 'button', label: 'button', page: 'ButtonPlayground' },
  { path: 'badge', label: 'badge', page: 'BadgePlayground' },
  { path: 'card', label: 'card', page: 'CardPlayground' },
  { path: 'chips', label: 'chips', page: 'ChipsPlayground' },
  { path: 'overlays', aliases: ['tooltip'], label: 'overlays', page: 'OverlaysPlayground' },
  { path: 'checkbox', aliases: ['radio', 'switch'], label: 'selection controls', page: 'CheckboxPlayground' },
  { path: 'progress', aliases: ['loading'], label: 'progress', page: 'ProgressPlayground' },
  { path: 'slider', label: 'slider', page: 'SliderPlayground' },
  { path: 'textfield', aliases: ['text-field'], label: 'text field', page: 'TextFieldPlayground' },
  { path: 'list', aliases: ['lists'], label: 'lists', page: 'ListPlayground' },
  { path: 'menu', aliases: ['menus'], label: 'menus', page: 'MenuPlayground' },
  { path: 'tabs', label: 'tabs', page: 'TabsPlayground' },
  { path: 'navigation', aliases: ['nav'], label: 'navigation', page: 'NavigationPlayground' },
  { path: 'app-bar', aliases: ['appbar'], label: 'app bars', page: 'AppBarPlayground' },
  { path: 'search', label: 'search', page: 'SearchPlayground' },
  { path: 'toolbar', aliases: ['toolbars'], label: 'toolbars', page: 'ToolbarPlayground' },
  { path: 'sheets', aliases: ['sheet'], label: 'sheets', page: 'SheetsPlayground' },
  { path: 'dialogs', aliases: ['dialog'], label: 'dialogs', page: 'DialogsPlayground' },
  { path: 'carousel', label: 'carousel', page: 'CarouselPlayground' },
  { path: 'date-picker', aliases: ['date-pickers'], label: 'date pickers', page: 'DatePickerPlayground' },
  { path: 'time-picker', aliases: ['time-pickers'], label: 'time pickers', page: 'TimePickerPlayground' },
  { path: 'shapes', label: 'shape morphing', page: 'ShapesDemo' },
  { path: 'theme', aliases: ['dynamic-color'], label: 'dynamic colour', page: 'ThemePlayground' },
];

/** The playground a /demo/<path> URL opens. */
export const findDemo = (path: string) => demos.find((d) => d.path === path || d.aliases?.includes(path));
