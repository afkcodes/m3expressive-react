import { useMemo, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { color } from '../../tokens/color.stylex.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import type { SxProps } from '../../primitives/types.ts';
import { TabsContext, type TabsVariant } from './context.ts';
import { TabList } from './TabList.tsx';

export { Tab } from './Tab.tsx';
export type { TabProps } from './Tab.tsx';
export type { TabsVariant } from './context.ts';

/*
 * Figma kit, "Tabs" page (Tabs 54563:40023; Primary / Secondary tab sets; Compose PrimaryTabRow /
 * SecondaryTabRow + Tab, PrimaryNavigationTabTokens).
 *   Tab: Surface, 16px inline padding, 48px (64px with icon + label, the icon stacked 2px above a
 *   title-small label). Inactive content On Surface Variant (On Surface while hovered, focused or
 *   pressed); active Primary (secondary tabs keep On Surface). Layers 8 / 10%.
 *   Indicator: primary — 3px, 3px top corners, the content's width less 2px each side;
 *   secondary — 2px across the tab. Both sit on the row's bottom edge, above a 1px divider.
 *   Fixed rows share the width; scrollable rows start 52px in, with 90px-minimum tabs.
 * Motion (Compose): the indicator's offset and width spring on the default spatial spring;
 * content colour fades in on default effects and out on fast effects. A scrollable row scrolls the
 * selected tab to its centre (clamped to the ends) on the default spatial spring — also on first
 * layout — and a new selection restarts that scroll from where it is (TabRow.kt ScrollableTabData).
 * Parts: ./Tab.tsx (the tab), ./TabList.tsx (the row's indicator and scroll).
 */
const s = stylex.create({
  // minWidth 0: as a grid / flex item the row must not grow to its tabs (scrollable rows scroll).
  row: { display: 'flex', flexDirection: 'column', boxSizing: 'border-box', width: '100%', minWidth: 0 },
  divider: { display: 'block', height: 1, flexShrink: 0, backgroundColor: color.outlineVariant },
});

/**
 * The root is Base UI's Tabs `<div>` (`ref`, native props, `sx`); `aria-label` / `aria-labelledby`
 * name the tab list.
 */
export interface TabsProps extends SxProps<
  Omit<BaseTabs.Root.Props, 'render' | 'children' | 'value' | 'defaultValue' | 'onValueChange' | 'orientation'>
> {
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: (value: unknown, details: BaseTabs.Root.ChangeEventDetails) => void;
  variant?: TabsVariant;
  /** Scrollable row (52px edge padding, tabs hug their content, ≥ 90px). Default: fixed. */
  scrollable?: boolean;
  /** The `<Tab>`s. */
  children: ReactNode;
  /** Tab panels (`<TabPanel>`), rendered under the row. */
  panels?: ReactNode;
}

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  variant = 'primary',
  scrollable = false,
  children,
  panels,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  sx,
  ...rest
}: TabsProps) {
  // Tracks the active value (Base UI owns it when uncontrolled) to re-place the indicator.
  const [current, setCurrent] = useControllableState<unknown, [BaseTabs.Root.ChangeEventDetails]>(
    value,
    defaultValue,
    onValueChange,
  );
  const ctx = useMemo(() => ({ variant, scrollable, live: true }), [variant, scrollable]);
  return (
    <BaseTabs.Root
      {...(value !== undefined ? { value } : { defaultValue })}
      onValueChange={setCurrent}
      {...rest}
      {...stylex.props(s.row, sx)}
    >
      <TabsContext value={ctx}>
        <TabList
          variant={variant}
          scrollable={scrollable}
          current={current}
          ariaLabel={ariaLabel}
          ariaLabelledBy={ariaLabelledBy}
        >
          {children}
        </TabList>
      </TabsContext>
      <span aria-hidden {...stylex.props(s.divider)} />
      {panels}
    </BaseTabs.Root>
  );
}

export interface TabPanelProps extends SxProps<Omit<BaseTabs.Panel.Props, 'render' | 'value'>> {
  /** The value of the `<Tab>` this panel belongs to. */
  value: unknown;
  children?: ReactNode;
}

export function TabPanel({ value, children, sx, ...rest }: TabPanelProps) {
  return (
    <BaseTabs.Panel value={value} {...rest} {...stylex.props(sx)}>
      {children}
    </BaseTabs.Panel>
  );
}
