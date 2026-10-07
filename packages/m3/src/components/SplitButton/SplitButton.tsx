import { createContext, useContext, useMemo, type ComponentPropsWithRef, type ReactNode, type Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { focusRing } from '../../primitives/focusRing.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import type { SxProps } from '../../primitives/types.ts';
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

/** The root is a `role="group"` `<div>`: name it with `aria-label` / `aria-labelledby`. */
export interface SplitButtonProps extends SxProps<ComponentPropsWithRef<'div'>> {
  variant?: SplitButtonVariant;
  size?: ButtonSize;
  /** Disables both buttons. */
  disabled?: boolean;
  /** <SplitButtonLeading/> then <SplitButtonTrailing/>. */
  children: ReactNode;
}

export function SplitButton({
  variant = 'filled',
  size = 'small',
  disabled = false,
  children,
  sx,
  ...rest
}: SplitButtonProps) {
  const ctx = useMemo(() => ({ variant, size, disabled }), [variant, size, disabled]);
  return (
    <SplitContext value={ctx}>
      <div role="group" {...rest} {...stylex.props(s.group, sx)}>
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

/** `disabled` comes from the `SplitButton`. */
export interface SplitButtonLeadingProps extends SxProps<Omit<BaseButton.Props, 'render' | 'children' | 'disabled'>> {
  ref?: Ref<HTMLButtonElement>;
  /** Leading icon (use currentColor), sized 20/20/24/32/40px. */
  icon?: ReactNode;
  children?: ReactNode;
}

export function SplitButtonLeading({ icon, children, sx, ...rest }: SplitButtonLeadingProps) {
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
}

/** `disabled` comes from the `SplitButton`. */
export interface SplitButtonTrailingProps extends SxProps<
  Omit<BaseButton.Props, 'render' | 'children' | 'disabled' | 'aria-label'>
> {
  ref?: Ref<HTMLButtonElement>;
  /** Accessible name — required (e.g. "More options"). */
  'aria-label': string;
  /**
   * Menu open ("Selected" in the kit). As the trigger of a `<Menu>` (or a Base UI menu) the button
   * follows the menu's own state and announces it (aria-haspopup / aria-expanded); standalone it
   * toggles on click and announces only aria-expanded.
   */
  open?: boolean;
  defaultOpen?: boolean;
  /** Standalone toggling (a menu trigger reports through the menu's `onOpenChange`). */
  onOpenChange?: (open: boolean) => void;
  /** Replaces the chevron. */
  icon?: ReactNode;
}

export function SplitButtonTrailing({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  icon,
  onClick,
  sx,
  ...rest
}: SplitButtonTrailingProps) {
  const { variant, size, disabled, forced } = usePart();
  const [ownOpen, setOwnOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  // A menu trigger (Base UI passes aria-haspopup / aria-expanded with the popup's state) shows the
  // menu's real state; standalone, the button keeps its own.
  const popupExpanded = rest['aria-expanded'];
  const isTrigger = rest['aria-haspopup'] != null && popupExpanded != null;
  const expanded = openProp === undefined && isTrigger ? popupExpanded === true || popupExpanded === 'true' : ownOpen;
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
      disabled={disabled}
      aria-expanded={expanded}
      data-ripple-host=""
      onClick={(e) => {
        onClick?.(e);
        if (isTrigger) return;
        setOwnOpen(!expanded);
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
}
