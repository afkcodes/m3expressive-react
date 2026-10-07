import { createContext, useContext, useMemo, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { StateLayer, forcedStateLayer, isInteractionState, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { focusRing } from '../../primitives/focusRing.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { radioVars } from './radio.stylex.ts';

/*
 * Figma kit, "Radio button" page, set "Radio buttons" (selected × 5 states).
 *   48px target → 40px circular state layer → 24px glyph (radio_button_unchecked / _checked).
 *   Unselected: on-surface-variant (on-surface while hovered / focused / pressed).
 *   Selected: primary. Disabled: on-surface at 38%.
 *   State layer: the radio's colour at 8 / 10%; pressed is a flat 10% layer in the *opposite*
 *   role (primary when unselected, on-surface when selected) — no ripple in the kit.
 *
 * Motion — Compose material3 RadioButton.kt (RadioButtonImpl):
 *   dot radius r animates 0 ⇄ 6dp on FastSpatial and is drawn at r − 1dp (half the 2dp stroke),
 *   not at all when r ≤ 0 — so the spring's overshoot past 0 on deselect never shows a dot.
 *   The kit's 5px dot therefore scales by max(0, (6p − 1) / 5) with p = r / 6dp.
 *   Ring + dot colour: DefaultEffects; snaps while disabled (and when `disabled` changes).
 */
const RING =
  'M12 22C10.6167 22 9.3167 21.7375 8.1 21.2125C6.8833 20.6875 5.825 19.975 4.925 19.075C4.025 18.175 3.3125 17.1167 2.7875 15.9C2.2625 14.6833 2 13.3833 2 12C2 10.6167 2.2625 9.3167 2.7875 8.1C3.3125 6.8833 4.025 5.825 4.925 4.925C5.825 4.025 6.8833 3.3125 8.1 2.7875C9.3167 2.2625 10.6167 2 12 2C13.3833 2 14.6833 2.2625 15.9 2.7875C17.1167 3.3125 18.175 4.025 19.075 4.925C19.975 5.825 20.6875 6.8833 21.2125 8.1C21.7375 9.3167 22 10.6167 22 12C22 13.3833 21.7375 14.6833 21.2125 15.9C20.6875 17.1167 19.975 18.175 19.075 19.075C18.175 19.975 17.1167 20.6875 15.9 21.2125C14.6833 21.7375 13.3833 22 12 22ZM12 20C14.2333 20 16.125 19.225 17.675 17.675C19.225 16.125 20 14.2333 20 12C20 9.7667 19.225 7.875 17.675 6.325C16.125 4.775 14.2333 4 12 4C9.7667 4 7.875 4.775 6.325 6.325C4.775 7.875 4 9.7667 4 12C4 14.2333 4.775 16.125 6.325 17.675C7.875 19.225 9.7667 20 12 20Z';
const DOT =
  'M12 17C13.3833 17 14.5625 16.5125 15.5375 15.5375C16.5125 14.5625 17 13.3833 17 12C17 10.6167 16.5125 9.4375 15.5375 8.4625C14.5625 7.4875 13.3833 7 12 7C10.6167 7 9.4375 7.4875 8.4625 8.4625C7.4875 9.4375 7 10.6167 7 12C7 13.3833 7.4875 14.5625 8.4625 15.5375C9.4375 16.5125 10.6167 17 12 17Z';

const s = stylex.create({
  root: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 48,
    height: 48,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    outline: 'none',
    verticalAlign: 'middle',
  },
  disabled: { cursor: 'default' },
  circle: {
    position: 'relative',
    isolation: 'isolate',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: '50%',
  },
  glyph: {
    position: 'relative',
    width: 24,
    height: 24,
    fill: 'currentColor',
    transitionProperty: 'color',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  glyphSnap: { transitionDuration: '0s' },
  glyphDisabled: { opacity: state.disabledContentOpacity },
  dot: {
    transformBox: 'fill-box',
    transformOrigin: 'center',
    [radioVars['--m3x-radio-dot']]: 1,
    scale: `max(0, calc((6 * ${radioVars['--m3x-radio-dot']} - 1) / 5))`,
    transitionProperty: '--m3x-radio-dot',
    transitionDuration: motion.fastSpatialDuration,
    transitionTimingFunction: motion.fastSpatialEasing,
  },
  dotHidden: { [radioVars['--m3x-radio-dot']]: 0 },
});

const roles = stylex.create({
  unselected: {
    color: {
      default: color.onSurfaceVariant,
      ':hover': { default: null, '@media (hover: hover)': color.onSurface },
      ':focus-visible': { default: color.onSurface, '@media (hover: hover)': color.onSurface },
      ':active': { default: color.onSurface, '@media (hover: hover)': color.onSurface },
    },
    [interaction.layerColor]: {
      default: color.onSurface,
      ':active': { default: color.primary, '@media (hover: hover)': color.primary },
    },
  },
  unselectedInteracting: { color: color.onSurface },
  unselectedPressed: { [interaction.layerColor]: color.primary },
  selected: {
    color: color.primary,
    [interaction.layerColor]: {
      default: color.primary,
      ':active': { default: color.onSurface, '@media (hover: hover)': color.onSurface },
    },
  },
  selectedPressed: { [interaction.layerColor]: color.onSurface },
  disabled: { color: color.onSurface },
});

/** The group's value and `disabled` (radios draw disabled too; Base UI only disables their behaviour). */
const GroupContext = createContext<{ value: unknown; disabled: boolean } | null>(null);

/** `ref` and the remaining props go to Base UI's group `<div role="radiogroup">`. */
export type RadioGroupProps = SxProps<Omit<BaseRadioGroup.Props, 'render'>>;

const groupStyles = stylex.create({ group: { display: 'flex', flexDirection: 'column' } });

export function RadioGroup({
  value: valueProp,
  defaultValue,
  onValueChange,
  disabled = false,
  sx,
  children,
  ...rest
}: RadioGroupProps) {
  const [value, setValue] = useControllableState<unknown, [BaseRadioGroup.ChangeEventDetails]>(
    valueProp,
    defaultValue ?? null,
    onValueChange,
  );
  const group = useMemo(() => ({ value, disabled }), [value, disabled]);
  return (
    <GroupContext value={group}>
      <BaseRadioGroup
        value={value}
        disabled={disabled}
        onValueChange={setValue}
        {...rest}
        {...stylex.props(groupStyles.group, sx)}
      >
        {children}
      </BaseRadioGroup>
    </GroupContext>
  );
}

/** `ref` and the remaining props go to Base UI's root `<span role="radio">`. */
export interface RadioProps extends SxProps<Omit<BaseRadio.Root.Props, 'render' | 'nativeButton' | 'children'>> {
  /**
   * Standalone use (outside a RadioGroup): whether it's selected. Controlled only (no
   * `defaultChecked` / `onCheckedChange`): a radio never changes its own selection — picking one of
   * several options is the group's job — so a lone radio shows state its parent owns.
   */
  checked?: boolean;
}

export function Radio({ ref, value, checked: checkedProp, disabled: disabledProp = false, sx, ...rest }: RadioProps) {
  const group = useContext(GroupContext);
  const forced = useForcedState();
  const interacting = isInteractionState(forced.state);
  const selected = group ? Object.is(group.value, value) : !!checkedProp;
  const disabled = disabledProp || (group?.disabled ?? false);
  // Compose snaps the colour while disabled and across an enabled ⇄ disabled change: decided when
  // the colour inputs change, and kept until they next change.
  const [colour, setColour] = useState({ disabled, selected, snap: disabled });
  if (colour.disabled !== disabled || colour.selected !== selected) {
    setColour({ disabled, selected, snap: disabled || colour.disabled !== disabled });
  }
  const colourSnap = colour.snap;
  const root = (
    <BaseRadio.Root
      ref={ref}
      value={value}
      disabled={disabled}
      {...rest}
      {...stylex.props(
        s.root,
        stylex.defaultMarker(),
        stateLayerHost.hostPressLayer,
        disabled && stateLayerHost.disabled,
        forcedStateLayer(forced.state, 'pressed'),
        selected ? roles.selected : roles.unselected,
        !selected && interacting && roles.unselectedInteracting,
        forced.state === 'pressed' && (selected ? roles.selectedPressed : roles.unselectedPressed),
        disabled && roles.disabled,
        disabled && s.disabled,
        sx,
      )}
    >
      <span {...stylex.props(s.circle, focusRing.part, forced.focusRing && focusRing.forced)}>
        <StateLayer />
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          {...stylex.props(s.glyph, colourSnap && s.glyphSnap, disabled && s.glyphDisabled)}
        >
          <path d={RING} />
          <path d={DOT} {...stylex.props(s.dot, !selected && s.dotHidden)} />
        </svg>
      </span>
    </BaseRadio.Root>
  );
  if (group) return root;
  // Standalone: a one-radio group carries the checked state.
  return (
    <BaseRadioGroup value={checkedProp ? value : null} style={{ display: 'contents' }}>
      {root}
    </BaseRadioGroup>
  );
}
