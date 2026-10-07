import { forwardRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { StateLayer } from '../../primitives/StateLayer.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { frameStyles } from './chipStyles.ts';
import { ChipContent, Glyph, ICONS } from './ChipContent.tsx';

/*
 * Assist, suggestion and filter chips (kit "Chips" page — geometry, colours and motion in
 * chipStyles.ts). Input chips: InputChip.tsx; chip groups: ChipGroup.tsx.
 */
export interface CommonProps {
  /** Elevated style (surface-container-low + shadow) instead of outlined. */
  elevated?: boolean;
  /** 18px leading icon (use currentColor). */
  icon?: ReactNode;
  /** Being dragged (raised + 16% layer). */
  dragged?: boolean;
  children: ReactNode;
  sx?: StyleXStyles;
}

export interface AssistChipProps
  extends CommonProps, Omit<BaseButton.Props, 'className' | 'style' | 'render' | 'children'> {}

export const AssistChip = forwardRef<HTMLButtonElement, AssistChipProps>(function AssistChip(
  { elevated = false, icon, dragged = false, disabled = false, children, sx, ...rest },
  ref,
) {
  const forced = useForcedState();
  return (
    <BaseButton
      ref={ref}
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
});

export interface SelectableProps {
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
}

/** Selection state (controlled when `selected` is defined); `onSelectedChange` hears only the value. */
export function useSelected({ selected, defaultSelected = false, onSelectedChange }: SelectableProps) {
  return useControllableState(selected, defaultSelected, onSelectedChange);
}

export interface SuggestionChipProps
  extends
    CommonProps,
    SelectableProps,
    Omit<
      BaseToggle.Props,
      'className' | 'style' | 'render' | 'children' | 'pressed' | 'defaultPressed' | 'onPressedChange'
    > {}

export const SuggestionChip = forwardRef<HTMLButtonElement, SuggestionChipProps>(function SuggestionChip(
  {
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
  },
  ref,
) {
  const forced = useForcedState();
  const [selected, setSelected] = useSelected({ selected: selectedProp, defaultSelected, onSelectedChange });
  return (
    <BaseToggle
      ref={ref}
      pressed={selected}
      onPressedChange={(next) => setSelected(next)}
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
});

export interface FilterChipProps
  extends
    CommonProps,
    SelectableProps,
    Omit<
      BaseToggle.Props,
      'className' | 'style' | 'render' | 'children' | 'pressed' | 'defaultPressed' | 'onPressedChange'
    > {
  /** Show the trailing drop-down arrow (filter menus). */
  trailingIcon?: boolean;
}

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(function FilterChip(
  {
    elevated = false,
    icon,
    trailingIcon = false,
    dragged = false,
    disabled = false,
    selected: selectedProp,
    defaultSelected,
    onSelectedChange,
    children,
    sx,
    ...rest
  },
  ref,
) {
  const forced = useForcedState();
  const [selected, setSelected] = useSelected({ selected: selectedProp, defaultSelected, onSelectedChange });
  // Selected: a check replaces the leading icon (or springs open in front of label-only chips).
  const leading = icon != null ? 'icon' : 'slot';
  return (
    <BaseToggle
      ref={ref}
      pressed={selected}
      onPressedChange={(next) => setSelected(next)}
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
          trailing: trailingIcon,
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
        trailingIcon={trailingIcon ? <Glyph d={ICONS.arrowDropDown} /> : undefined}
        label={children}
      />
    </BaseToggle>
  );
});
