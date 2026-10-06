import { Children, createContext, forwardRef, isValidElement, useContext, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { color } from '../../tokens/color.stylex';
import { elevation } from '../../tokens/elevation.stylex';
import { motion } from '../../tokens/motion.stylex';
import { state } from '../../tokens/state.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { textBox } from '../../primitives/textBox.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { Fab } from '../Fab/Fab.tsx';

export type FabMenuColor = 'primary' | 'secondary' | 'tertiary';

/*
 * Figma kit, Buttons page, "FAB menu" + building blocks (per colour: Segment, FAB).
 *   Item: 56px pill, padding 16/24, gap 8, 24px icon, title-medium label, {colour}-container fill,
 *         on-{colour}-container content, no elevation. Hover 8% / focus 10% / press 8% + ripple.
 *   Close: 56px circle, {colour} fill, 20px "close" icon, level 3 (hover 4; focused: no spread).
 *   Layout: items right-aligned 4px apart, 8px above the close button.
 * Closed, the menu is a regular FAB in the {colour}-container colour.
 */
const CLOSE = 'M6.4 19L5 17.6L10.6 12L5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19Z';

const enter = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(12px) scale(0.92)' },
  to: { opacity: 1, transform: 'none' },
});

const s = stylex.create({
  root: { display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', rowGap: 8, verticalAlign: 'bottom' },
  list: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', rowGap: 4, margin: 0, padding: 0 },
  button: {
    appearance: 'none',
    borderWidth: 0,
    margin: 0,
    backgroundImage: 'none',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
  },
  item: {
    height: 56,
    paddingBlock: 16,
    paddingInline: 24,
    columnGap: 8,
    borderRadius: 28,
    // Reduced motion: no entrance (and no stagger delay).
    animationName: { default: 'none', '@media (prefers-reduced-motion: no-preference)': enter },
    animationDuration: motion.fastSpatialDuration,
    animationTimingFunction: motion.fastSpatialEasing,
    animationFillMode: 'both',
  },
  close: {
    width: 56,
    height: 56,
    padding: 0,
    borderRadius: 28,
    boxShadow: {
      default: elevation.level3,
      ':hover': { default: null, '@media (hover: hover)': elevation.level4 },
      ':focus-visible': { default: elevation.level3NoSpread, '@media (hover: hover)': elevation.level3NoSpread },
      ':active': { default: elevation.level3, '@media (hover: hover)': elevation.level3 },
    },
    transitionProperty: 'box-shadow',
    transitionDuration: motion.fastEffectsDuration,
    transitionTimingFunction: motion.fastEffectsEasing,
  },
  closeHovered: { boxShadow: elevation.level4 },
  closeFocused: { boxShadow: elevation.level3NoSpread },
  ringForced: { outlineStyle: 'solid' },
  icon: { position: 'relative', display: 'inline-flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  icon24: { width: 24, height: 24 },
  icon20: { width: 20, height: 20 },
  label: { position: 'relative', color: 'inherit' },
});

const delay = stylex.create({
  index: (ms: string) => ({ animationDelay: { default: '0ms', '@media (prefers-reduced-motion: no-preference)': ms } }),
});

const itemColors = stylex.create({
  primary: { backgroundColor: color.primaryContainer, color: color.onPrimaryContainer },
  secondary: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  tertiary: { backgroundColor: color.tertiaryContainer, color: color.onTertiaryContainer },
});
const closeColors = stylex.create({
  primary: { backgroundColor: color.primary, color: color.onPrimary },
  secondary: { backgroundColor: color.secondary, color: color.onSecondary },
  tertiary: { backgroundColor: color.tertiary, color: color.onTertiary },
});

const FabMenuContext = createContext<{ color: FabMenuColor; close: () => void; index: number }>({ color: 'primary', close: () => {}, index: 0 });

function forcedStyles(forced: ReturnType<typeof useForcedState>) {
  return [
    forced.state === 'hovered' && stateLayerHost.forceHover,
    forced.state === 'focused' && stateLayerHost.forceFocus,
    forced.state === 'pressed' && stateLayerHost.forceHover,
    forced.focusRing && s.ringForced,
  ];
}

export interface FabMenuProps {
  color?: FabMenuColor;
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Icon of the closed FAB (use currentColor). */
  icon?: ReactNode;
  /** Accessible name of the closed FAB. */
  'aria-label': string;
  /** Accessible name of the close button. */
  closeLabel?: string;
  /** <FabMenuItem/>s, top to bottom. */
  children?: ReactNode;
  sx?: StyleXStyles;
}

export function FabMenu({
  color: menuColor = 'primary',
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  icon,
  'aria-label': label,
  closeLabel = 'Close menu',
  children,
  sx,
}: FabMenuProps) {
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInner(next);
    onOpenChange?.(next);
  };
  const listRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => fabRef.current?.focus());
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return close();
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    // From the close button: Up enters at the nearest (last) item, Down at the first.
    const next = i === -1 ? items[e.key === 'ArrowUp' ? items.length - 1 : 0] : items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
    next?.focus();
    e.preventDefault();
  };
  const items = Children.toArray(children).filter(isValidElement);

  if (!open)
    return (
      <span {...stylex.props(s.root, sx)}>
        <Fab
          ref={fabRef}
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={false}
          color={`${menuColor}-container`}
          onClick={() => {
            setOpen(true);
            // The FAB becomes the close button: keep focus on the same spot.
            requestAnimationFrame(() => fabRef.current?.focus());
          }}
        >
          {icon}
        </Fab>
      </span>
    );

  return (
    <span {...stylex.props(s.root, sx)} onKeyDown={onKeyDown}>
      {items.length > 0 && (
        <div ref={listRef} role="menu" aria-label={label} {...stylex.props(s.list)}>
          {items.map((child, index) => (
            <FabMenuContext key={child.key ?? index} value={{ color: menuColor, close, index: items.length - 1 - index }}>
              {child}
            </FabMenuContext>
          ))}
        </div>
      )}
      <FabMenuClose ref={fabRef} color={menuColor} aria-label={closeLabel} aria-expanded onClick={close} />
    </span>
  );
}

const FabMenuClose = forwardRef<HTMLButtonElement, Omit<BaseButton.Props, 'className' | 'style' | 'render' | 'children'> & { color: FabMenuColor }>(
  function FabMenuClose({ color: c, ...rest }, ref) {
    const forced = useForcedState();
    return (
      <BaseButton
        ref={ref}
        data-ripple-host=""
        {...rest}
        {...stylex.props(
          s.button,
          s.close,
          closeColors[c],
          stateLayerHost.host,
          ...forcedStyles(forced),
          forced.state === 'hovered' && s.closeHovered,
          forced.state === 'focused' && s.closeFocused,
        )}
      >
        <StateLayer />
        <Ripple />
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...stylex.props(s.icon, s.icon20)}>
          <path d={CLOSE} />
        </svg>
      </BaseButton>
    );
  },
);

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
  { icon, children, color: colorProp, keepOpen = false, onClick, sx, ...rest },
  ref,
) {
  const ctx = useContext(FabMenuContext);
  const forced = useForcedState();
  return (
    <BaseButton
      ref={ref}
      role="menuitem"
      data-ripple-host=""
      onClick={(e) => {
        onClick?.(e);
        if (!keepOpen && !e.defaultPrevented) ctx.close();
      }}
      {...rest}
      {...stylex.props(
        s.button,
        s.item,
        delay.index(`${ctx.index * 30}ms`),
        itemColors[colorProp ?? ctx.color],
        stateLayerHost.host,
        ...forcedStyles(forced),
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
