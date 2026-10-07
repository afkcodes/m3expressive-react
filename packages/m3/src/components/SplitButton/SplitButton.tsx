import { createContext, forwardRef, useContext, useMemo, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { textBox } from '../../primitives/textBox.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import {
  base,
  containerMotion,
  disabled,
  gaps,
  iconSizes,
  labelRole,
  sizes,
  type ButtonSize,
} from '../Button/buttonStyles.ts';

export type SplitButtonVariant = 'filled' | 'tonal' | 'outlined' | 'elevated';

/*
 * Figma kit, Buttons page, set "Split button" (5 sizes × 4 colours × 9 leading/trailing states).
 * A leading button (icon + label) and a trailing menu button (chevron), 2px apart.
 *            height  leading pad (start/end)  trailing w  chevron box  inner r  inner r (hover/press)
 *   xsmall   32      12 / 10                  48          22           4        8
 *   small    40      16 / 12                  48          22           4        12
 *   medium   56      24 / 24                  56          26           4        12
 *   large    96      48 / 48                  96          38           8        20
 *   xlarge   136     64 / 64                  136         50           12       20
 * Outer corners are fully round. The chevron sits off-centre towards the leading button
 * (-1/-1/-2/-3/-6px); pressed or expanded ("Selected") centres it and flips it up, and expanded
 * makes the trailing button fully round with the 10% layer. Focus draws only the focus ring (the
 * kit's Focused variants have no state layer). Outline: 1px at every size. Elevated: level 3 cast
 * by the fill-less group frame, so no spread; disabled drops it.
 */
const H: Record<ButtonSize, number> = { xsmall: 32, small: 40, medium: 56, large: 96, xlarge: 136 };
const TRAILING_W: Record<ButtonSize, number> = { xsmall: 48, small: 48, medium: 56, large: 96, xlarge: 136 };
const CHEVRON: Record<ButtonSize, number> = { xsmall: 22, small: 22, medium: 26, large: 38, xlarge: 50 };
const CHEVRON_SHIFT: Record<ButtonSize, number> = { xsmall: -1, small: -1, medium: -2, large: -3, xlarge: -6 };
const INNER: Record<ButtonSize, [rest: number, active: number]> = {
  xsmall: [4, 8],
  small: [4, 12],
  medium: [4, 12],
  large: [8, 20],
  xlarge: [12, 20],
};
const LEADING_PAD: Record<ButtonSize, [start: number, end: number]> = {
  xsmall: [12, 10],
  small: [16, 12],
  medium: [24, 24],
  large: [48, 48],
  xlarge: [64, 64],
};
const KEYBOARD_ARROW_DOWN = 'M12 15.4L6 9.4L7.4 8L12 12.6L16.6 8L18 9.4L12 15.4Z';

const s = stylex.create({
  group: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: 2,
    verticalAlign: 'middle',
    // Own stacking context: the parts' shadow casters (z -1) paint under both buttons.
    isolation: 'isolate',
  },
  // Parts don't isolate, so their shadow casters join the group's stacking context.
  // Hover layer only: focus is shown by the ring alone (kit).
  part: {
    isolation: 'auto',
    [interaction.layerOpacity]: {
      default: '0',
      ':hover': { default: '0', '@media (hover: hover)': state.hoverOpacity },
    },
  },
  stroke: { '::after': { borderWidth: 1 } },
  container: { flexShrink: 0 },
  shadow: {
    position: 'absolute',
    insetInline: 0,
    zIndex: -1,
    pointerEvents: 'none',
    boxShadow: elevation.level3NoSpread,
    // Follows the container's corners (same spring).
    transitionProperty: 'border-radius',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  // The chevron's optical offset follows the morphing shape (Compose horizontalCenterOptically
  // reads the animated corners), so it shares the DefaultEffects spring.
  chevron: {
    display: 'block',
    flexShrink: 0,
    transitionProperty: 'translate',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  // Compose sample (SplitButtonSamples.kt): rotation via animateFloatAsState's default spring —
  // no bounce (ζ 1, stiffness 1500); DefaultEffects (ζ 1, 1600) is the matching scheme token.
  chevronPath: {
    transformBox: 'fill-box',
    transformOrigin: 'center',
    transitionProperty: 'rotate',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
});

const dyn = stylex.create({
  box: (w: number | null, h: number) => ({ width: w, height: h }),
  inset: (block: number) => ({ insetBlock: block }),
  pad: (start: number, end: number) => ({ paddingInlineStart: start, paddingInlineEnd: end }),
  // Leading: outer corners at the start; trailing: at the end. Inner corners grow on hover / press.
  leadingRadii: (outer: string, rest: string, active: string) => ({
    borderStartStartRadius: outer,
    borderEndStartRadius: outer,
    borderStartEndRadius: {
      default: rest,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': active },
      [stylex.when.ancestor(':active')]: { default: active, '@media (hover: hover)': active },
    },
    borderEndEndRadius: {
      default: rest,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': active },
      [stylex.when.ancestor(':active')]: { default: active, '@media (hover: hover)': active },
    },
  }),
  trailingRadii: (outer: string, rest: string, active: string) => ({
    borderStartEndRadius: outer,
    borderEndEndRadius: outer,
    borderStartStartRadius: {
      default: rest,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': active },
      [stylex.when.ancestor(':active')]: { default: active, '@media (hover: hover)': active },
    },
    borderEndStartRadius: {
      default: rest,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': active },
      [stylex.when.ancestor(':active')]: { default: active, '@media (hover: hover)': active },
    },
  }),
  // Static radii (disabled, forced states, expanded).
  radii: (ss: string, se: string, es: string, ee: string) => ({
    borderStartStartRadius: ss,
    borderStartEndRadius: se,
    borderEndStartRadius: es,
    borderEndEndRadius: ee,
  }),
  chevronShift: (px: string) => ({
    translate: { default: `${px} 0`, [stylex.when.ancestor(':active')]: '0 0' },
  }),
});

const flip = stylex.create({
  // Pressed previews the expanded chevron (kit "Trailing state=Pressed").
  live: { rotate: { default: '0deg', [stylex.when.ancestor(':active')]: '180deg' } },
});

const centred = stylex.create({
  chevron: { translate: '0 0' },
  path: { rotate: '180deg' },
});

const variants = stylex.create({
  filled: { backgroundColor: color.primary, color: color.onPrimary },
  tonal: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  outlined: { backgroundColor: 'transparent', color: color.onSurfaceVariant },
  elevated: { backgroundColor: color.surfaceContainerLow, color: color.primary },
});

const disabledOutlined = stylex.create({
  // Kit: outlined keeps no fill; its stroke turns on-surface 10%.
  container: {
    backgroundColor: 'transparent',
    color: color.onSurface,
    '::after': { borderColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)` },
  },
});

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

function containerStyles(variant: SplitButtonVariant, isDisabled: boolean) {
  return [
    // Inner-corner / checked morph on DefaultEffects (Compose SplitButtonDefaults Leading / TrailingButton).
    containerMotion.effects,
    variants[variant],
    variant === 'outlined' && base.stroke,
    variant === 'outlined' && s.stroke,
    isDisabled && (variant === 'outlined' ? disabledOutlined.container : disabled.container),
  ];
}

function rootStyles(
  size: ButtonSize,
  isDisabled: boolean,
  forced: ReturnType<typeof useForcedState>,
  sx?: StyleXStyles,
) {
  return [
    base.root,
    sizes[size],
    stateLayerHost.host,
    s.part,
    isDisabled && stateLayerHost.disabled,
    forced.state === 'hovered' && stateLayerHost.forceHover,
    forced.state === 'pressed' && stateLayerHost.forceHover,
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
  const { variant, size, disabled: isDisabled, forced } = usePart();
  const outer = `${H[size] / 2}px`;
  const [restR, activeR] = INNER[size].map((r) => `${r}px`) as [string, string];
  const staticInner =
    isDisabled || forced.state ? (forced.state === 'hovered' || forced.state === 'pressed' ? activeR : restR) : null;
  const radii = staticInner
    ? dyn.radii(outer, staticInner, outer, staticInner)
    : dyn.leadingRadii(outer, restR, activeR);
  const [padStart, padEnd] = LEADING_PAD[size];
  const insetBlock = (48 - H[size]) / 2;
  return (
    <BaseButton
      ref={ref}
      disabled={isDisabled}
      data-ripple-host=""
      {...rest}
      {...stylex.props(...rootStyles(size, isDisabled, forced, sx))}
    >
      {variant === 'elevated' && !isDisabled && (
        <span aria-hidden {...stylex.props(s.shadow, radii, dyn.inset(insetBlock > 0 ? insetBlock : 0))} />
      )}
      <span
        {...stylex.props(
          base.container,
          s.container,
          dyn.box(null, H[size]),
          dyn.pad(padStart, padEnd),
          radii,
          ...containerStyles(variant, isDisabled),
          forced.focusRing && base.ringForced,
        )}
      >
        <StateLayer />
        <Ripple disabled={isDisabled} />
        <span {...stylex.props(base.content, gaps[size], isDisabled && disabled.content)}>
          {icon != null && <span {...stylex.props(base.icon, iconSizes[size])}>{icon}</span>}
          {children != null && <span {...stylex.props(labelRole[size], textBox.hug, base.label)}>{children}</span>}
        </span>
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
  const { variant, size, disabled: isDisabled, forced } = usePart();
  const [inner, setInner] = useState(defaultExpanded);
  // A menu trigger (Base UI passes aria-haspopup / aria-expanded with the popup's state) shows the
  // menu's real state; standalone, the button keeps its own.
  const popupExpanded = rest['aria-expanded'];
  const isTrigger = rest['aria-haspopup'] != null && popupExpanded != null;
  const expanded = expandedProp ?? (isTrigger ? popupExpanded === true || popupExpanded === 'true' : inner);
  const outer = `${H[size] / 2}px`;
  const [restR, activeR] = INNER[size].map((r) => `${r}px`) as [string, string];
  const pressedForced = forced.state === 'pressed';
  const radii = expanded
    ? dyn.radii(outer, outer, outer, outer)
    : isDisabled || forced.state
      ? dyn.radii(
          forced.state === 'hovered' || pressedForced ? activeR : restR,
          outer,
          forced.state === 'hovered' || pressedForced ? activeR : restR,
          outer,
        )
      : dyn.trailingRadii(outer, restR, activeR);
  const insetBlock = (48 - H[size]) / 2;
  const centre = expanded || pressedForced;
  return (
    <BaseButton
      ref={ref}
      disabled={isDisabled}
      aria-expanded={expanded}
      data-ripple-host=""
      onClick={(e) => {
        onClick?.(e);
        if (isTrigger) return;
        if (expandedProp === undefined) setInner(!expanded);
        onExpandedChange?.(!expanded);
      }}
      {...rest}
      {...stylex.props(
        ...rootStyles(size, isDisabled, forced, sx),
        expanded && !isDisabled && stateLayerHost.forceFocus,
      )}
    >
      {variant === 'elevated' && !isDisabled && (
        <span aria-hidden {...stylex.props(s.shadow, radii, dyn.inset(insetBlock > 0 ? insetBlock : 0))} />
      )}
      <span
        {...stylex.props(
          base.container,
          s.container,
          dyn.box(TRAILING_W[size], H[size]),
          radii,
          ...containerStyles(variant, isDisabled),
          forced.focusRing && base.ringForced,
        )}
      >
        <StateLayer />
        <Ripple disabled={isDisabled} />
        {icon ?? (
          <svg
            viewBox="0 0 24 24"
            width={CHEVRON[size]}
            height={CHEVRON[size]}
            fill="currentColor"
            aria-hidden
            {...stylex.props(
              s.chevron,
              dyn.chevronShift(`${CHEVRON_SHIFT[size]}px`),
              centre && centred.chevron,
              isDisabled && disabled.content,
            )}
          >
            <path d={KEYBOARD_ARROW_DOWN} {...stylex.props(s.chevronPath, flip.live, centre && centred.path)} />
          </svg>
        )}
      </span>
    </BaseButton>
  );
});
