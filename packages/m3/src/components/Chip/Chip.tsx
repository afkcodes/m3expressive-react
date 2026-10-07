import { forwardRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { color } from '../../tokens/color.stylex';
import { elevation } from '../../tokens/elevation.stylex';
import { motion } from '../../tokens/motion.stylex';
import { state } from '../../tokens/state.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { interaction } from '../../primitives/state.stylex';
import { tween } from '../../primitives/tweens.stylex';
import { elevationMotion } from '../../primitives/elevationMotion.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { textBox } from '../../primitives/textBox.ts';
import { useForcedState, type ForcedState } from '../../testing/ForceState.tsx';

type Kind = 'assist' | 'filter' | 'input' | 'suggestion';
type Level = 0 | 1 | 2 | 3 | 4;
type StateKey = 'enabled' | 'hovered' | 'focused' | 'pressed' | 'dragged';

/*
 * Figma kit, "Chips" page: Assistive, Filter, Input and Suggestion chips (+ chip groups).
 *   32px tall, 8px corners (input chip with avatar: fully round), label-large, 18px icons, gap 8.
 *   Padding: 8 next to an icon / check / trailing icon (4 next to an avatar), 16 next to the label
 *   (input chips: 12).
 *   Outlined: 1px outline-variant inside stroke; the kit adds a surface fill while hovered,
 *   focused, pressed or dragged. Elevated: surface-container-low. Selected: secondary-container,
 *   no stroke. State layer on-surface-variant (selected: on-secondary-container) at 8 / 10 / 10%,
 *   dragged on-surface 16%; press is a flat layer (no ripple in the kit).
 *   Disabled: outlined keeps an on-surface 10% stroke; filled ones get on-surface-variant 10%;
 *   content on-surface at 38%.
 *   Elevation differs per chip type in the kit (tables below); focused variants don't clip, so
 *   their shadow has no spread and their outline sits under the state layer.
 *
 * Motion — Compose material3 Chip.kt:
 *   elevation: ChipElevation.animateElevation → internal/Elevation.kt tweens (`elevationMotion`),
 *   snapping when disabled; the container colour is not animated (Surface `color` changes as is).
 *   Filter chip without an icon (expressive SelectableChip → AnimatingChipContent): the leading
 *   check enters with expandHorizontally(from Start) on FastSpatial + fadeIn DefaultEffects and
 *   leaves with shrinkHorizontally(towards Start) FastSpatial + fadeOut DefaultEffects. Compose
 *   keeps the 8dp padding and 8dp spacing around an empty (0-wide) leading slot, so the label sits
 *   16 from the edge unselected and 34 selected — here the slot is always present and its width
 *   springs 0 ⇄ 18px (overshoot included, like the IntSize spring).
 */
const ELEVATION: Record<string, Record<StateKey, Level>> = {
  'assist-elevated': { enabled: 1, hovered: 1, focused: 1, pressed: 2, dragged: 2 },
  'assist-outlined': { enabled: 0, hovered: 0, focused: 0, pressed: 0, dragged: 0 },
  'suggestion-elevated': { enabled: 1, hovered: 1, focused: 1, pressed: 2, dragged: 3 },
  'suggestion-outlined': { enabled: 0, hovered: 0, focused: 0, pressed: 0, dragged: 3 },
  'suggestion-outlined-selected': { enabled: 0, hovered: 1, focused: 0, pressed: 2, dragged: 3 },
  'filter-elevated': { enabled: 1, hovered: 2, focused: 1, pressed: 1, dragged: 4 },
  'filter-outlined': { enabled: 0, hovered: 0, focused: 0, pressed: 0, dragged: 4 },
  'filter-outlined-selected': { enabled: 0, hovered: 1, focused: 0, pressed: 0, dragged: 4 },
  'input-outlined': { enabled: 0, hovered: 0, focused: 0, pressed: 0, dragged: 3 },
};
const SHADOW = [elevation.level0, elevation.level1, elevation.level2, elevation.level3, elevation.level4] as const;
const SHADOW_NO_SPREAD = [elevation.level0, elevation.level1NoSpread, elevation.level2NoSpread, elevation.level3NoSpread, elevation.level4NoSpread] as const;

const s = stylex.create({
  root: {
    appearance: 'none',
    borderWidth: 0,
    margin: 0,
    backgroundImage: 'none',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'inherit',
    position: 'relative',
    isolation: 'isolate',
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    boxSizing: 'border-box',
    height: 32,
    columnGap: 8,
    borderRadius: 8,
    cursor: { default: 'pointer', ':disabled': 'default' },
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    verticalAlign: 'middle',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
  },
  // Raised by the `dragged` prop: Compose enters a drag with the incoming elevation tween.
  draggedIn: { transitionDuration: tween.elevationInDuration, transitionTimingFunction: tween.elevationInEasing },
  pill: { borderRadius: 16 },
  ringForced: { outlineStyle: 'solid' },
  stroke: {
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: color.outlineVariant,
      pointerEvents: 'none',
    },
  },
  strokeDisabled: { '::after': { borderColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)` } },
  // Focused variants don't clip, and Figma paints a non-clipping frame's state layer over its
  // outline (as for cards): the stroke drops under the layer while focused.
  strokeFocus: { '::after': { zIndex: { default: 'auto', ':focus-visible': -2 } } },
  strokeUnder: { '::after': { zIndex: -2 } },
  // Outlined chips get a surface fill while interacted with (kit).
  outlined: {
    backgroundColor: {
      default: 'transparent',
      ':hover': { default: null, '@media (hover: hover)': color.surface },
      ':focus-visible': { default: color.surface, '@media (hover: hover)': color.surface },
      ':active': { default: color.surface, '@media (hover: hover)': color.surface },
    },
  },
  outlinedInteracting: { backgroundColor: color.surface },
  elevatedFill: { backgroundColor: color.surfaceContainerLow },
  selectedFill: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  disabledFill: { backgroundColor: `color-mix(in srgb, ${color.onSurfaceVariant} 10%, transparent)` },
  disabledClear: { backgroundColor: 'transparent' },
  layerUnselected: {
    [interaction.layerColor]: color.onSurfaceVariant,
  },
  layerSelected: { [interaction.layerColor]: color.onSecondaryContainer },
  layerDragged: { [interaction.layerColor]: color.onSurface },
  content: { position: 'relative', display: 'inline-flex', alignItems: 'center', columnGap: 8 },
  contentDisabled: { opacity: state.disabledContentOpacity, color: color.onSurface },
  icon: { width: 18, height: 18, flexShrink: 0, fill: 'currentColor', display: 'block' },
  // Leading check slot of an icon-less filter chip (kept mounted; clips the check from the start).
  checkSlot: {
    display: 'block',
    flexShrink: 0,
    height: 18,
    overflow: 'hidden',
    transitionProperty: 'width, opacity',
    transitionDuration: `${motion.fastSpatialDuration}, ${motion.defaultEffectsDuration}`,
    transitionTimingFunction: `${motion.fastSpatialEasing}, ${motion.defaultEffectsEasing}`,
  },
  checkSlotIn: { width: 18, opacity: 1 },
  checkSlotOut: { width: 0, opacity: 0 },
  label: { color: 'inherit' },
  avatar: { position: 'relative', width: 24, height: 24, borderRadius: 12, flexShrink: 0, overflow: 'hidden' },
  inputWrap: { position: 'relative', display: 'inline-flex', verticalAlign: 'middle', flexShrink: 0 },
  remove: {
    appearance: 'none',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    position: 'absolute',
    insetInlineEnd: 8,
    top: 7,
    width: 18,
    height: 18,
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    borderRadius: 9,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    // 48px touch area without changing layout.
    '::before': { content: '""', position: 'absolute', inset: -15 },
  },
});

const dyn = stylex.create({
  pad: (start: number, end: number) => ({ paddingInlineStart: start, paddingInlineEnd: end }),
  shadow: (rest: string, hover: string, focus: string, press: string) => ({
    boxShadow: {
      default: rest,
      ':hover': { default: null, '@media (hover: hover)': hover },
      ':focus-visible': { default: focus, '@media (hover: hover)': focus },
      ':active': { default: press, '@media (hover: hover)': press },
    },
  }),
  fixedShadow: (v: string) => ({ boxShadow: v }),
  color: (label: string) => ({ color: label }),
  fill: (c: string) => ({ fill: c }),
});

const ICONS = {
  check: 'M7.16 13.5L2.89 9.225L3.96 8.156L7.16 11.362L14.04 4.481L15.11 5.55L7.16 13.5Z',
  arrowDropDown: 'M9 11.25L5.25 7.5H12.75L9 11.25Z',
  close: 'M4.8 14.25L3.75 13.2L7.95 9L3.75 4.8L4.8 3.75L9 7.95L13.2 3.75L14.25 4.8L10.05 9L14.25 13.2L13.2 14.25L9 10.05L4.8 14.25Z',
  avatarCheck: 'M9.078 16.311L4.872 12.104L3.44 13.527L9.078 19.165L21.182 7.061L19.76 5.639L9.078 16.311Z',
} as const;

function Glyph({ d, tone }: { d: string; tone?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden {...stylex.props(s.icon, tone ? dyn.fill(tone) : null)}>
      <path d={d} />
    </svg>
  );
}

interface FrameOptions {
  kind: Kind;
  elevated: boolean;
  selected: boolean;
  disabled: boolean;
  dragged: boolean;
  forced: { state?: ForcedState; focusRing?: boolean };
  /** `slot`: an icon-less filter chip's animated check slot (8 + slot + 8 before the label). */
  leading: 'none' | 'icon' | 'avatar' | 'slot';
  trailing: boolean;
  pill?: boolean;
}

function frameStyles({ kind, elevated, selected, disabled, dragged, forced, leading, trailing, pill }: FrameOptions) {
  const style = elevated ? 'elevated' : 'outlined';
  const table = ELEVATION[`${kind}-${style}${selected && !elevated && (kind === 'filter' || kind === 'suggestion') ? '-selected' : ''}`] ?? ELEVATION['input-outlined']!;
  const fs = forced.state;
  const stateKey: StateKey | null = dragged ? 'dragged' : fs === 'hovered' || fs === 'focused' || fs === 'pressed' ? fs : fs === 'dragged' ? 'dragged' : null;
  const lvl = (k: StateKey) => table[k];
  const shadow = disabled
    ? null
    : stateKey
      ? dyn.fixedShadow(stateKey === 'focused' ? SHADOW_NO_SPREAD[lvl('focused')] : SHADOW[lvl(stateKey)])
      : dyn.shadow(SHADOW[lvl('enabled')], SHADOW[lvl('hovered')], SHADOW_NO_SPREAD[lvl('focused')], SHADOW[lvl('pressed')]);
  const start = leading === 'avatar' ? 4 : leading === 'icon' || leading === 'slot' ? 8 : kind === 'input' ? 12 : 16;
  const end = trailing ? 8 : kind === 'input' ? 12 : 16;
  const outlinedUnselected = !elevated && !selected;
  return [
    s.root,
    pill && s.pill,
    dyn.pad(start, end),
    stateLayerHost.hostPressLayer,
    disabled && stateLayerHost.disabled,
    fs === 'hovered' && stateLayerHost.forceHover,
    fs === 'focused' && stateLayerHost.forceFocus,
    fs === 'pressed' && stateLayerHost.forcePressed,
    (dragged || fs === 'dragged') && stateLayerHost.forceDragged,
    selected ? s.layerSelected : s.layerUnselected,
    (dragged || fs === 'dragged') && !selected && s.layerDragged,
    // container
    disabled
      ? selected || elevated
        ? s.disabledFill
        : s.disabledClear
      : selected
        ? s.selectedFill
        : elevated
          ? s.elevatedFill
          : s.outlined,
    !disabled && outlinedUnselected && stateKey && s.outlinedInteracting,
    outlinedUnselected && s.stroke,
    outlinedUnselected && s.strokeFocus,
    outlinedUnselected && fs === 'focused' && s.strokeUnder,
    outlinedUnselected && disabled && s.strokeDisabled,
    shadow,
    disabled ? elevationMotion.none : elevationMotion.host,
    !disabled && dragged && s.draggedIn,
    forced.focusRing && s.ringForced,
  ];
}

interface ContentProps {
  kind: Kind;
  selected: boolean;
  disabled: boolean;
  icon?: ReactNode;
  avatar?: ReactNode;
  showCheck: boolean;
  /** Icon-less filter chip: the check lives in an always-mounted slot that springs open. */
  checkSlot?: boolean;
  trailingIcon?: ReactNode;
  label: ReactNode;
}

function ChipContent({ kind, selected, disabled, icon, avatar, showCheck, checkSlot = false, trailingIcon, label }: ContentProps) {
  // Colours (kit): label on-surface (assist) / on-surface-variant; icons primary; trailing
  // on-surface-variant; selected → on-secondary-container (suggestion / input keep a primary icon).
  const labelTone = selected ? color.onSecondaryContainer : kind === 'assist' ? color.onSurface : color.onSurfaceVariant;
  const iconTone = selected && kind === 'filter' ? color.onSecondaryContainer : color.primary;
  const trailingTone = selected ? color.onSecondaryContainer : color.onSurfaceVariant;
  return (
    <span {...stylex.props(s.content, disabled ? s.contentDisabled : dyn.color(labelTone))}>
      {avatar}
      {checkSlot ? (
        <span data-part="check-slot" {...stylex.props(s.checkSlot, showCheck ? s.checkSlotIn : s.checkSlotOut)}>
          <Glyph d={ICONS.check} tone={disabled ? undefined : color.onSecondaryContainer} />
        </span>
      ) : showCheck ? <Glyph d={ICONS.check} tone={disabled ? undefined : color.onSecondaryContainer} /> : icon != null ? <span style={{ display: 'contents', color: disabled ? undefined : iconTone }}>{icon}</span> : null}
      <span {...stylex.props(typescale.labelLarge, textBox.hug, s.label)}>{label}</span>
      {trailingIcon != null && <span style={{ display: 'contents', color: disabled ? undefined : trailingTone }}>{trailingIcon}</span>}
    </span>
  );
}

// ── Public chips ─────────────────────────────────────────────────────────────────────────────
interface CommonProps {
  /** Elevated style (surface-container-low + shadow) instead of outlined. */
  elevated?: boolean;
  /** 18px leading icon (use currentColor). */
  icon?: ReactNode;
  /** Being dragged (raised + 16% layer). */
  dragged?: boolean;
  children: ReactNode;
  sx?: StyleXStyles;
}

export interface AssistChipProps extends CommonProps, Omit<BaseButton.Props, 'className' | 'style' | 'render' | 'children'> {}

export const AssistChip = forwardRef<HTMLButtonElement, AssistChipProps>(function AssistChip(
  { elevated = false, icon, dragged = false, disabled = false, children, sx, ...rest },
  ref,
) {
  const forced = useForcedState();
  return (
    <BaseButton ref={ref} disabled={disabled} {...rest} {...stylex.props(...frameStyles({ kind: 'assist', elevated, selected: false, disabled, dragged, forced, leading: icon != null ? 'icon' : 'none', trailing: false }), sx)}>
      <StateLayer />
      <ChipContent kind="assist" selected={false} disabled={disabled} icon={icon} showCheck={false} label={children} />
    </BaseButton>
  );
});

interface SelectableProps {
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
}

function useSelected({ selected, defaultSelected = false, onSelectedChange }: SelectableProps) {
  const [inner, setInner] = useState(defaultSelected);
  const value = selected ?? inner;
  return [value, (next: boolean) => { if (selected === undefined) setInner(next); onSelectedChange?.(next); }] as const;
}

export interface SuggestionChipProps extends CommonProps, SelectableProps, Omit<BaseToggle.Props, 'className' | 'style' | 'render' | 'children' | 'pressed' | 'defaultPressed' | 'onPressedChange'> {}

export const SuggestionChip = forwardRef<HTMLButtonElement, SuggestionChipProps>(function SuggestionChip(
  { elevated = false, icon, dragged = false, disabled = false, selected: selectedProp, defaultSelected, onSelectedChange, children, sx, ...rest },
  ref,
) {
  const forced = useForcedState();
  const [selected, setSelected] = useSelected({ selected: selectedProp, defaultSelected, onSelectedChange });
  return (
    <BaseToggle ref={ref} pressed={selected} onPressedChange={setSelected} disabled={disabled} {...rest} {...stylex.props(...frameStyles({ kind: 'suggestion', elevated, selected, disabled, dragged, forced, leading: icon != null ? 'icon' : 'none', trailing: false }), sx)}>
      <StateLayer />
      <ChipContent kind="suggestion" selected={selected} disabled={disabled} icon={icon} showCheck={false} label={children} />
    </BaseToggle>
  );
});

export interface FilterChipProps extends CommonProps, SelectableProps, Omit<BaseToggle.Props, 'className' | 'style' | 'render' | 'children' | 'pressed' | 'defaultPressed' | 'onPressedChange'> {
  /** Show the trailing drop-down arrow (filter menus). */
  trailingIcon?: boolean;
}

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(function FilterChip(
  { elevated = false, icon, trailingIcon = false, dragged = false, disabled = false, selected: selectedProp, defaultSelected, onSelectedChange, children, sx, ...rest },
  ref,
) {
  const forced = useForcedState();
  const [selected, setSelected] = useSelected({ selected: selectedProp, defaultSelected, onSelectedChange });
  // Selected: a check replaces the leading icon (or springs open in front of label-only chips).
  const leading = icon != null ? 'icon' : 'slot';
  return (
    <BaseToggle ref={ref} pressed={selected} onPressedChange={setSelected} disabled={disabled} {...rest} {...stylex.props(...frameStyles({ kind: 'filter', elevated, selected, disabled, dragged, forced, leading, trailing: trailingIcon }), sx)}>
      <StateLayer />
      <ChipContent
        kind="filter"
        selected={selected}
        disabled={disabled}
        icon={icon}
        showCheck={selected}
        checkSlot={icon == null}
        trailingIcon={trailingIcon ? <Glyph d={ICONS.arrowDropDown} /> : undefined}
        label={children}
      />
    </BaseToggle>
  );
});

export interface InputChipProps extends Omit<CommonProps, 'elevated'>, SelectableProps, Omit<BaseToggle.Props, 'className' | 'style' | 'render' | 'children' | 'pressed' | 'defaultPressed' | 'onPressedChange'> {
  /** Leading avatar (24px). When selected the kit shows a check badge in its place. */
  avatar?: ReactNode;
  /** Shows the trailing remove button. */
  onRemove?: () => void;
  removeLabel?: string;
}

const avatarStyles = stylex.create({
  placeholder: { backgroundColor: color.onSurfaceVariant, fill: color.onPrimary },
  check: { backgroundColor: color.onSecondaryContainer, fill: color.onSecondary },
});

/** The kit's generic avatar (person glyph on on-surface-variant). */
export function ChipAvatarPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stylex.props(s.avatar, avatarStyles.placeholder)}>
      <path fillRule="evenodd" clipRule="evenodd" d="M15.6 9.6C15.6 11.5882 13.988 13.2 12 13.2C10.012 13.2 8.4 11.5882 8.4 9.6C8.4 7.6118 10.012 6 12 6C13.988 6 15.6 7.6118 15.6 9.6ZM14.4 9.6C14.4 10.9255 13.326 12 12 12C10.675 12 9.6 10.9255 9.6 9.6C9.6 8.2745 10.675 7.2 12 7.2C13.326 7.2 14.4 8.2745 14.4 9.6Z" />
      <path d="M12 15C8.116 15 4.806 17.2971 3.545 20.5152C3.852 20.8202 4.176 21.1087 4.514 21.3793C5.453 18.4246 8.398 16.2 12 16.2C15.602 16.2 18.547 18.4246 19.486 21.3793C19.825 21.1087 20.148 20.8202 20.455 20.5153C19.195 17.2971 15.885 15 12 15Z" />
    </svg>
  );
}

export const InputChip = forwardRef<HTMLButtonElement, InputChipProps>(function InputChip(
  { icon, avatar, onRemove, removeLabel = 'Remove', dragged = false, disabled = false, selected: selectedProp, defaultSelected, onSelectedChange, children, sx, ...rest },
  ref,
) {
  const forced = useForcedState();
  const [selected, setSelected] = useSelected({ selected: selectedProp, defaultSelected, onSelectedChange });
  const hasAvatar = avatar != null;
  const avatarNode = hasAvatar
    ? selected
      ? (
        <svg viewBox="0 0 24 24" aria-hidden {...stylex.props(s.avatar, avatarStyles.check)}>
          <path d={ICONS.avatarCheck} />
        </svg>
      )
      : avatar
    : undefined;
  const trailing = onRemove != null;
  return (
    <span {...stylex.props(s.inputWrap)}>
      <BaseToggle
        ref={ref}
        pressed={selected}
        onPressedChange={setSelected}
        disabled={disabled}
        {...rest}
        {...stylex.props(...frameStyles({ kind: 'input', elevated: false, selected, disabled, dragged, forced, leading: hasAvatar ? 'avatar' : icon != null ? 'icon' : 'none', trailing, pill: hasAvatar }), sx)}
      >
        <StateLayer />
        <ChipContent
          kind="input"
          selected={selected}
          disabled={disabled}
          avatar={avatarNode}
          icon={hasAvatar ? undefined : icon}
          showCheck={false}
          // Space for the remove button, which sits on top (it can't be nested in a button).
          trailingIcon={trailing ? <span style={{ width: 18, height: 18, flexShrink: 0 }} /> : undefined}
          label={children}
        />
      </BaseToggle>
      {trailing && (
        <button
          type="button"
          aria-label={removeLabel}
          disabled={disabled}
          onClick={onRemove}
          {...stylex.props(s.remove)}
        >
          <Glyph d={ICONS.close} tone={disabled ? `color-mix(in srgb, ${color.onSurface} 38%, transparent)` : selected ? color.onSecondaryContainer : color.onSurfaceVariant} />
        </button>
      )}
    </span>
  );
});

// ── Chip group ───────────────────────────────────────────────────────────────────────────────
const groupStyles = stylex.create({
  group: { display: 'flex', alignItems: 'center', columnGap: 8, paddingBlock: 8, boxSizing: 'border-box' },
  scroll: { flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none' },
  wrap: { flexWrap: 'wrap', rowGap: 16 },
});

export interface ChipGroupProps {
  /** One scrollable row, or wrapping rows (kit "Chip groups"). */
  layout?: 'scroll' | 'wrap';
  'aria-label'?: string;
  children: ReactNode;
  sx?: StyleXStyles;
}

export function ChipGroup({ layout = 'wrap', children, sx, ...rest }: ChipGroupProps) {
  return (
    <div role="group" {...rest} {...stylex.props(groupStyles.group, layout === 'scroll' ? groupStyles.scroll : groupStyles.wrap, sx)}>
      {children}
    </div>
  );
}
