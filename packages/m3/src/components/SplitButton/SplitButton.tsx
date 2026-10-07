import { createContext, forwardRef, useContext, useMemo, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { focusRing } from '../../primitives/focusRing.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { useForcedState, type ForceStateValue } from '../../testing/ForceState.tsx';
import { ButtonContent } from '../Button/ButtonContent.tsx';
import { buttonBase, buttonDisabled, sizes, type ButtonSize } from '../Button/buttonStyles.ts';
import {
  centred,
  CHEVRON_SHIFT,
  CHEVRON_SIZE,
  containerStyles,
  splitDyn as dyn,
  flip,
  HEIGHT,
  INNER_RADII,
  KEYBOARD_ARROW_DOWN,
  LEADING_PAD,
  splitStyles as s,
  shadowInset,
  TRAILING_WIDTH,
  type SplitButtonVariant,
} from './splitButtonStyles.ts';

export type { SplitButtonVariant };

interface SplitContextValue {
  variant: SplitButtonVariant;
  size: ButtonSize;
  disabled: boolean;
}
const SplitContext = createContext<SplitContextValue>({ variant: 'filled', size: 'small', disabled: false });

export interface SplitButtonProps {
  variant?: SplitButtonVariant;
  size?: ButtonSize;
  /** Disables both buttons. */
  disabled?: boolean;
  /** <SplitButtonLeading/> then <SplitButtonTrailing/>. */
  children: ReactNode;
  sx?: StyleXStyles;
}

export function SplitButton({ variant = 'filled', size = 'small', disabled = false, children, sx }: SplitButtonProps) {
  const ctx = useMemo(() => ({ variant, size, disabled }), [variant, size, disabled]);
  return (
    <SplitContext value={ctx}>
      <div role="group" {...stylex.props(s.group, sx)}>
        {children}
      </div>
    </SplitContext>
  );
}

function usePart() {
  const ctx = useContext(SplitContext);
  const forced = useForcedState();
  return { ...ctx, forced };
}

function rootStyles(size: ButtonSize, disabled: boolean, forced: ForceStateValue, sx?: StyleXStyles) {
  return [
    buttonBase.root,
    sizes[size],
    stateLayerHost.host,
    s.part,
    disabled && stateLayerHost.disabled,
    // Hover and press show the hover layer under the ripple; focus draws the ring alone (kit).
    (forced.state === 'hovered' || forced.state === 'pressed') && stateLayerHost.forceHover,
    stylex.defaultMarker(),
    sx,
  ];
}

export interface SplitButtonLeadingProps extends Omit<
  BaseButton.Props,
  'className' | 'style' | 'render' | 'children' | 'disabled'
> {
  /** Leading icon (use currentColor), sized 20/20/24/32/40px. */
  icon?: ReactNode;
  children?: ReactNode;
  sx?: StyleXStyles;
}

export const SplitButtonLeading = forwardRef<HTMLButtonElement, SplitButtonLeadingProps>(function SplitButtonLeading(
  { icon, children, sx, ...rest },
  ref,
) {
  const { variant, size, disabled, forced } = usePart();
  const outer = `${HEIGHT[size] / 2}px`;
  const [restRadius, activeRadius] = INNER_RADII[size].map((radius) => `${radius}px`) as [string, string];
  const staticInner =
    disabled || forced.state
      ? forced.state === 'hovered' || forced.state === 'pressed'
        ? activeRadius
        : restRadius
      : null;
  const radii = staticInner
    ? dyn.radii(outer, staticInner, outer, staticInner)
    : dyn.leadingRadii(outer, restRadius, activeRadius);
  const [padStart, padEnd] = LEADING_PAD[size];
  return (
    <BaseButton
      ref={ref}
      disabled={disabled}
      data-ripple-host=""
      {...rest}
      {...stylex.props(...rootStyles(size, disabled, forced, sx))}
    >
      {variant === 'elevated' && !disabled && (
        <span aria-hidden {...stylex.props(s.shadow, radii, dyn.inset(shadowInset(size)))} />
      )}
      <span
        {...stylex.props(
          buttonBase.container,
          focusRing.part,
          s.container,
          dyn.box(null, HEIGHT[size]),
          dyn.pad(padStart, padEnd),
          radii,
          ...containerStyles(variant, disabled),
          forced.focusRing && focusRing.forced,
        )}
      >
        <StateLayer />
        <Ripple disabled={disabled} />
        <ButtonContent size={size} disabled={disabled} icon={icon}>
          {children}
        </ButtonContent>
      </span>
    </BaseButton>
  );
});

export interface SplitButtonTrailingProps extends Omit<
  BaseButton.Props,
  'className' | 'style' | 'render' | 'children' | 'disabled' | 'aria-label'
> {
  /** Accessible name — required (e.g. "More options"). */
  'aria-label': string;
  /**
   * Menu open ("Selected" in the kit). Controlled. As the trigger of a `<Menu>` (or a Base UI menu)
   * the button follows the menu's own state and announces it (aria-haspopup / aria-expanded);
   * standalone it toggles on click and announces only aria-expanded.
   */
  expanded?: boolean;
  defaultExpanded?: boolean;
  /** Standalone toggling (a menu trigger reports through the menu's `onOpenChange`). */
  onExpandedChange?: (expanded: boolean) => void;
  /** Replaces the chevron. */
  icon?: ReactNode;
  sx?: StyleXStyles;
}

export const SplitButtonTrailing = forwardRef<HTMLButtonElement, SplitButtonTrailingProps>(function SplitButtonTrailing(
  { expanded: expandedProp, defaultExpanded = false, onExpandedChange, icon, onClick, sx, ...rest },
  ref,
) {
  const { variant, size, disabled, forced } = usePart();
  const [ownExpanded, setOwnExpanded] = useControllableState(expandedProp, defaultExpanded, onExpandedChange);
  // A menu trigger (Base UI passes aria-haspopup / aria-expanded with the popup's state) shows the
  // menu's real state; standalone, the button keeps its own.
  const popupExpanded = rest['aria-expanded'];
  const isTrigger = rest['aria-haspopup'] != null && popupExpanded != null;
  const expanded =
    expandedProp === undefined && isTrigger ? popupExpanded === true || popupExpanded === 'true' : ownExpanded;
  const outer = `${HEIGHT[size] / 2}px`;
  const [restRadius, activeRadius] = INNER_RADII[size].map((radius) => `${radius}px`) as [string, string];
  const pressedForced = forced.state === 'pressed';
  const inner = forced.state === 'hovered' || pressedForced ? activeRadius : restRadius;
  const radii = expanded
    ? dyn.radii(outer, outer, outer, outer)
    : disabled || forced.state
      ? dyn.radii(inner, outer, inner, outer)
      : dyn.trailingRadii(outer, restRadius, activeRadius);
  const centre = expanded || pressedForced;
  return (
    <BaseButton
      ref={ref}
      disabled={disabled}
      aria-expanded={expanded}
      data-ripple-host=""
      onClick={(e) => {
        onClick?.(e);
        if (isTrigger) return;
        setOwnExpanded(!expanded);
      }}
      {...rest}
      {...stylex.props(...rootStyles(size, disabled, forced, sx), expanded && !disabled && stateLayerHost.forceFocus)}
    >
      {variant === 'elevated' && !disabled && (
        <span aria-hidden {...stylex.props(s.shadow, radii, dyn.inset(shadowInset(size)))} />
      )}
      <span
        {...stylex.props(
          buttonBase.container,
          focusRing.part,
          s.container,
          dyn.box(TRAILING_WIDTH[size], HEIGHT[size]),
          radii,
          ...containerStyles(variant, disabled),
          forced.focusRing && focusRing.forced,
        )}
      >
        <StateLayer />
        <Ripple disabled={disabled} />
        {icon ?? (
          <svg
            viewBox="0 0 24 24"
            width={CHEVRON_SIZE[size]}
            height={CHEVRON_SIZE[size]}
            fill="currentColor"
            aria-hidden
            {...stylex.props(
              s.chevron,
              dyn.chevronShift(`${CHEVRON_SHIFT[size]}px`),
              centre && centred.chevron,
              disabled && buttonDisabled.content,
            )}
          >
            <path d={KEYBOARD_ARROW_DOWN} {...stylex.props(s.chevronPath, flip.live, centre && centred.path)} />
          </svg>
        )}
      </span>
    </BaseButton>
  );
});
