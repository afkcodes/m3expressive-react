import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { chipDyn as dyn, chipStyles as s, type ChipKind } from './chipStyles.ts';

export const ICONS = {
  check: 'M7.16 13.5L2.89 9.225L3.96 8.156L7.16 11.362L14.04 4.481L15.11 5.55L7.16 13.5Z',
  arrowDropDown: 'M9 11.25L5.25 7.5H12.75L9 11.25Z',
  close:
    'M4.8 14.25L3.75 13.2L7.95 9L3.75 4.8L4.8 3.75L9 7.95L13.2 3.75L14.25 4.8L10.05 9L14.25 13.2L13.2 14.25L9 10.05L4.8 14.25Z',
  avatarCheck: 'M9.078 16.311L4.872 12.104L3.44 13.527L9.078 19.165L21.182 7.061L19.76 5.639L9.078 16.311Z',
} as const;

/** An 18px kit glyph in currentColor, or in `tone`. */
export function Glyph({ d, tone }: { d: string; tone?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden {...stylex.props(s.icon, tone ? dyn.fill(tone) : null)}>
      <path d={d} />
    </svg>
  );
}

export interface ChipContentProps {
  kind: ChipKind;
  selected: boolean;
  disabled: boolean;
  icon?: ReactNode;
  avatar?: ReactNode;
  showCheck: boolean;
  /** Icon-less filter chip: the check lives in an always-mounted slot that springs open. */
  checkSlot?: boolean;
  trailingIcon?: ReactNode;
  label: ReactNode;
  /** id of the label (the input chip's remove button is named after it). */
  labelId?: string;
}

/** Leading slot (avatar / check / icon) + label + trailing icon, in the kit's tones. */
export function ChipContent({
  kind,
  selected,
  disabled,
  icon,
  avatar,
  showCheck,
  checkSlot = false,
  trailingIcon,
  label,
  labelId,
}: ChipContentProps) {
  // Colours (kit): label on-surface (assist) / on-surface-variant; icons primary; trailing
  // on-surface-variant; selected → on-secondary-container (suggestion / input keep a primary icon).
  const labelTone = selected
    ? color.onSecondaryContainer
    : kind === 'assist'
      ? color.onSurface
      : color.onSurfaceVariant;
  const iconTone = selected && kind === 'filter' ? color.onSecondaryContainer : color.primary;
  const trailingTone = selected ? color.onSecondaryContainer : color.onSurfaceVariant;
  return (
    <span {...stylex.props(s.content, disabled ? s.contentDisabled : dyn.color(labelTone))}>
      {avatar}
      {checkSlot ? (
        <span data-part="check-slot" {...stylex.props(s.checkSlot, showCheck ? s.checkSlotIn : s.checkSlotOut)}>
          <Glyph d={ICONS.check} tone={disabled ? undefined : color.onSecondaryContainer} />
        </span>
      ) : showCheck ? (
        <Glyph d={ICONS.check} tone={disabled ? undefined : color.onSecondaryContainer} />
      ) : icon != null ? (
        <span style={{ display: 'contents', color: disabled ? undefined : iconTone }}>{icon}</span>
      ) : null}
      <span id={labelId} {...stylex.props(typescale.labelLarge, textBox.hug, s.label)}>
        {label}
      </span>
      {trailingIcon != null && (
        <span style={{ display: 'contents', color: disabled ? undefined : trailingTone }}>{trailingIcon}</span>
      )}
    </span>
  );
}
