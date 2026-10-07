import { useMemo, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { color } from '../../tokens/color.stylex.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { TabsContext, type TabsVariant } from './context.ts';
import { TabList } from './TabList.tsx';

export { Tab, TabScope } from './Tab.tsx';
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

export interface TabsProps {
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: (value: unknown) => void;
  variant?: TabsVariant;
  /** Scrollable row (52px edge padding, tabs hug their content, ≥ 90px). Default: fixed. */
  scrollable?: boolean;
  /** The `<Tab>`s. */
  children: ReactNode;
  /** Tab panels (`<TabPanel>`), rendered under the row. */
  panels?: ReactNode;
  'aria-label'?: string;
  sx?: StyleXStyles;
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
  sx,
}: TabsProps) {
  // Tracks the active value (Base UI owns it when uncontrolled) to re-place the indicator.
  const [current, setCurrent] = useControllableState<unknown>(value, defaultValue, onValueChange);
  const ctx = useMemo(() => ({ variant, scrollable, live: true }), [variant, scrollable]);
  return (
    <BaseTabs.Root
      {...(value !== undefined ? { value } : { defaultValue })}
      onValueChange={(next) => setCurrent(next)}
      {...stylex.props(s.row, sx)}
    >
      <TabsContext value={ctx}>
        <TabList variant={variant} scrollable={scrollable} current={current} ariaLabel={ariaLabel}>
          {children}
        </TabList>
      </TabsContext>
      <span aria-hidden {...stylex.props(s.divider)} />
      {panels}
    </BaseTabs.Root>
  );
}

export function TabPanel({ value, children, sx }: { value: unknown; children: ReactNode; sx?: StyleXStyles }) {
  return (
    <BaseTabs.Panel value={value} {...stylex.props(sx)}>
      {children}
    </BaseTabs.Panel>
  );
}
