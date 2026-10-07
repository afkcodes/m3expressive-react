import { forwardRef, useContext, useRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { typescale } from '../../tokens/typescale.ts';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import { focusRing } from '../../primitives/focusRing.ts';
import { forcedStateLayer, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { textBox } from '../../primitives/textBox.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { FabMenuContext, FabMenuIndexContext } from './context.ts';
import { fabMenuStyles as s, itemColors, type FabMenuColor } from './fabMenuStyles.ts';
import { useItemReveal } from './useItemReveal.ts';

export interface FabMenuItemProps extends Omit<BaseButton.Props, 'className' | 'style' | 'render' | 'children'> {
  /** Leading icon (use currentColor), 24px. */
  icon?: ReactNode;
  children: ReactNode;
  /** Overrides the menu's colour (standalone use). */
  color?: FabMenuColor;
  /** Keep the menu open after this item is chosen. */
  keepOpen?: boolean;
  sx?: StyleXStyles;
}

export const FabMenuItem = forwardRef<HTMLButtonElement, FabMenuItemProps>(function FabMenuItem(
  { icon, children, color, keepOpen = false, onClick, onFocus, sx, ...rest },
  ref,
) {
  const menu = useContext(FabMenuContext);
  const index = useContext(FabMenuIndexContext);
  const forced = useForcedState();
  const el = useRef<HTMLButtonElement | null>(null);
  const setRef = useMergedRefs(el, ref);
  const visible = !menu.animated || index >= menu.total - menu.visibleCount;
  const tabStop = index === Math.min(menu.tabStop, menu.total - 1);
  useItemReveal(el, { animated: menu.animated, visible, index, onShown: menu.onShown });
  return (
    <BaseButton
      ref={setRef}
      role="menuitem"
      data-ripple-host=""
      // Inside a menu only the roving tab stop is tabbable (arrow keys move between items).
      tabIndex={menu.animated ? (tabStop ? 0 : -1) : undefined}
      onClick={(e) => {
        onClick?.(e);
        if (!keepOpen && !e.defaultPrevented) menu.close();
      }}
      onFocus={(e) => {
        menu.onItemFocus(index);
        onFocus?.(e);
      }}
      {...rest}
      {...stylex.props(
        s.button,
        focusRing.host,
        s.item,
        itemColors[color ?? menu.color],
        stateLayerHost.host,
        forcedStateLayer(forced.state, 'hover'),
        forced.focusRing && focusRing.forced,
        sx,
      )}
    >
      <StateLayer />
      <Ripple />
      {icon != null && <span {...stylex.props(s.icon, s.icon24)}>{icon}</span>}
      <span {...stylex.props(typescale.titleMedium, textBox.hug, s.label)}>{children}</span>
    </BaseButton>
  );
});
