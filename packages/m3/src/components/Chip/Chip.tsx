import type { ReactNode, Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { StateLayer } from '../../primitives/StateLayer.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { frameStyles } from './chipStyles.ts';
import { ChipContent, Glyph, ICONS } from './ChipContent.tsx';

/*
 * Assist, suggestion and filter chips (kit "Chips" page — geometry, colours and motion in
 * chipStyles.ts). Input chips: InputChip.tsx; chip groups: ChipGroup.tsx.
 */
export interface CommonProps {
  ref?: Ref<HTMLButtonElement>;
  /** Elevated style (surface-container-low + shadow) instead of outlined. */
  elevated?: boolean;
  /** 18px leading icon (use currentColor). */
  icon?: ReactNode;
  /** Being dragged (raised + 16% layer). */
  dragged?: boolean;
  children: ReactNode;
}

export interface AssistChipProps extends CommonProps, SxProps<Omit<BaseButton.Props, 'render' | 'children'>> {}

export function AssistChip({
  elevated = false,
  icon,
  dragged = false,
  disabled = false,
  children,
  sx,
  ...rest
}: AssistChipProps) {
  const forced = useForcedState();
  return (
    <BaseButton
      disabled={disabled}
      {...rest}
      {...stylex.props(
        ...frameStyles({
          kind: 'assist',
          elevated,
          selected: false,
          disabled,
          dragged,
          forced,
          leading: icon != null ? 'icon' : 'none',
          trailing: false,
        }),
        sx,
      )}
    >
      <StateLayer />
      <ChipContent kind="assist" selected={false} disabled={disabled} icon={icon} showCheck={false} label={children} />
    </BaseButton>
  );
}

/** Selection (the M3 term) on Base UI Toggle; `onSelectedChange` gets Base UI's event details. */
export interface SelectableProps {
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean, details: BaseToggle.ChangeEventDetails) => void;
}

/** Selection state (controlled when `selected` is defined). */
export function useSelected({ selected, defaultSelected = false, onSelectedChange }: SelectableProps) {
  return useControllableState(selected, defaultSelected, onSelectedChange);
}

/** Toggle props minus `pressed` (chips say `selected`). */
export type ChipToggleProps = SxProps<
  Omit<BaseToggle.Props, 'render' | 'children' | 'pressed' | 'defaultPressed' | 'onPressedChange'>
>;

export interface SuggestionChipProps extends CommonProps, SelectableProps, ChipToggleProps {}

export function SuggestionChip({
  elevated = false,
  icon,
  dragged = false,
  disabled = false,
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  children,
  sx,
  ...rest
}: SuggestionChipProps) {
  const forced = useForcedState();
  const [selected, setSelected] = useSelected({ selected: selectedProp, defaultSelected, onSelectedChange });
  return (
    <BaseToggle
      pressed={selected}
      onPressedChange={setSelected}
      disabled={disabled}
      {...rest}
      {...stylex.props(
        ...frameStyles({
          kind: 'suggestion',
          elevated,
          selected,
          disabled,
          dragged,
          forced,
          leading: icon != null ? 'icon' : 'none',
          trailing: false,
        }),
        sx,
      )}
    >
      <StateLayer />
      <ChipContent
        kind="suggestion"
        selected={selected}
        disabled={disabled}
        icon={icon}
        showCheck={false}
        label={children}
      />
    </BaseToggle>
  );
}

export interface FilterChipProps extends CommonProps, SelectableProps, ChipToggleProps {
  /** Show the trailing drop-down arrow (filter menus). */
  dropdown?: boolean;
}

export function FilterChip({
  elevated = false,
  icon,
  dropdown = false,
  dragged = false,
  disabled = false,
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  children,
  sx,
  ...rest
}: FilterChipProps) {
  const forced = useForcedState();
  const [selected, setSelected] = useSelected({ selected: selectedProp, defaultSelected, onSelectedChange });
  // Selected: a check replaces the leading icon (or springs open in front of label-only chips).
  const leading = icon != null ? 'icon' : 'slot';
  return (
    <BaseToggle
      pressed={selected}
      onPressedChange={setSelected}
      disabled={disabled}
      {...rest}
      {...stylex.props(
        ...frameStyles({
          kind: 'filter',
          elevated,
          selected,
          disabled,
          dragged,
          forced,
          leading,
          trailing: dropdown,
        }),
        sx,
      )}
    >
      <StateLayer />
      <ChipContent
        kind="filter"
        selected={selected}
        disabled={disabled}
        icon={icon}
        showCheck={selected}
        checkSlot={icon == null}
        trailingIcon={dropdown ? <Glyph d={ICONS.arrowDropDown} /> : undefined}
        label={children}
      />
    </BaseToggle>
  );
}
