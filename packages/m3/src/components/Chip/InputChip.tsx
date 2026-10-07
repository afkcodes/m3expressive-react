import { useId, type MouseEventHandler, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { color } from '../../tokens/color.stylex.ts';
import { focusRing } from '../../primitives/focusRing.ts';
import { StateLayer } from '../../primitives/StateLayer.tsx';
import { useLabels, type M3Labels } from '../../theme/labels.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { useSelected, type ChipToggleProps, type CommonProps, type SelectableProps } from './Chip.tsx';
import { chipStyles as s, frameStyles } from './chipStyles.ts';
import { ChipContent, Glyph, ICONS } from './ChipContent.tsx';

/**
 * Compound: a wrapper `<span>` holds the chip (a toggle `<button>`) and its remove button, which
 * can't be nested in it. `ref`, native props and `sx` go to the chip button.
 */
export interface InputChipProps extends Omit<CommonProps, 'elevated'>, SelectableProps, ChipToggleProps {
  /** Leading avatar (24px). When selected the kit shows a check badge in its place. */
  avatar?: ReactNode;
  /**
   * Shows the trailing remove button, named "<labels.remove> <chip label>" (its `aria-label` is the
   * verb, joined to the label with `aria-labelledby`).
   */
  onRemove?: MouseEventHandler<HTMLButtonElement>;
  /** Overrides the built-in strings (`remove`). */
  labels?: Partial<M3Labels>;
}

const avatarStyles = stylex.create({
  placeholder: { backgroundColor: color.onSurfaceVariant, fill: color.onPrimary },
  check: { backgroundColor: color.onSecondaryContainer, fill: color.onSecondary },
});

/** Testing: the kit's generic avatar (person glyph on on-surface-variant), a design-time placeholder. */
export function ChipAvatarPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stylex.props(s.avatar, avatarStyles.placeholder)}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.6 9.6C15.6 11.5882 13.988 13.2 12 13.2C10.012 13.2 8.4 11.5882 8.4 9.6C8.4 7.6118 10.012 6 12 6C13.988 6 15.6 7.6118 15.6 9.6ZM14.4 9.6C14.4 10.9255 13.326 12 12 12C10.675 12 9.6 10.9255 9.6 9.6C9.6 8.2745 10.675 7.2 12 7.2C13.326 7.2 14.4 8.2745 14.4 9.6Z"
      />
      <path d="M12 15C8.116 15 4.806 17.2971 3.545 20.5152C3.852 20.8202 4.176 21.1087 4.514 21.3793C5.453 18.4246 8.398 16.2 12 16.2C15.602 16.2 18.547 18.4246 19.486 21.3793C19.825 21.1087 20.148 20.8202 20.455 20.5153C19.195 17.2971 15.885 15 12 15Z" />
    </svg>
  );
}

export function InputChip({
  icon,
  avatar,
  onRemove,
  labels: labelOverrides,
  dragged = false,
  disabled = false,
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  children,
  sx,
  ...rest
}: InputChipProps) {
  const forced = useForcedState();
  const labels = useLabels(labelOverrides);
  const [selected, setSelected] = useSelected({ selected: selectedProp, defaultSelected, onSelectedChange });
  const hasAvatar = avatar != null;
  const avatarNode = hasAvatar ? (
    selected ? (
      <svg viewBox="0 0 24 24" aria-hidden {...stylex.props(s.avatar, avatarStyles.check)}>
        <path d={ICONS.avatarCheck} />
      </svg>
    ) : (
      avatar
    )
  ) : undefined;
  const trailing = onRemove != null;
  // Name "Remove <label>": the button's own aria-label (the verb), then the chip's label.
  const removeId = useId();
  const labelId = useId();
  return (
    <span {...stylex.props(s.inputWrap)}>
      <BaseToggle
        pressed={selected}
        onPressedChange={setSelected}
        disabled={disabled}
        {...rest}
        {...stylex.props(
          ...frameStyles({
            kind: 'input',
            elevated: false,
            selected,
            disabled,
            dragged,
            forced,
            leading: hasAvatar ? 'avatar' : icon != null ? 'icon' : 'none',
            trailing,
            pill: hasAvatar,
          }),
          sx,
        )}
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
          labelId={labelId}
        />
      </BaseToggle>
      {trailing && (
        <button
          type="button"
          id={removeId}
          aria-label={labels.remove}
          aria-labelledby={`${removeId} ${labelId}`}
          disabled={disabled}
          onClick={onRemove}
          {...stylex.props(focusRing.host, s.remove)}
        >
          <Glyph
            d={ICONS.close}
            tone={
              disabled
                ? `color-mix(in srgb, ${color.onSurface} 38%, transparent)`
                : selected
                  ? color.onSecondaryContainer
                  : color.onSurfaceVariant
            }
          />
        </button>
      )}
    </span>
  );
}
