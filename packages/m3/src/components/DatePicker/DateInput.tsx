import { useMemo, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { Button } from '../Button/Button.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { TextField } from '../TextField/TextField.tsx';
import { textFieldVars } from '../TextField/textField.stylex.ts';
import { ForceStateBoundary } from '../../testing/ForceState.tsx';
import { SvgIcon } from '../../primitives/SvgIcon.tsx';
import { DATE_PICKER_ICONS } from './icons.ts';
import { defaultFormatter, inputFormatHint, parseInputDate, type DatePickerFormatter } from './calendar.ts';

/*
 * Figma kit, "Input date picker" (51954:18540; Compose DatePicker displayMode = Input).
 *   328px, Surface Container High, 28px corners. Header 128px (16px top, 24px start, 12px end,
 *   8px bottom; Outline Variant rule): label-large "Select date", the headline-large prompt 36px
 *   below beside the wide calendar button (switches to the calendar). Fields (18px above, 16px
 *   below, 24px sides): one 280px outlined field, or start / end fields 12px apart. Actions as the
 *   modal picker (Cancel / OK).
 */
const s = stylex.create({
  surface: {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: 328,
    overflow: 'hidden',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerHigh,
    borderRadius: 28,
    [textFieldVars.notchColor]: color.surfaceContainerHigh,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: 36,
    flexShrink: 0,
    height: 128,
    boxSizing: 'border-box',
    paddingBlock: '16px 8px',
    paddingInline: '24px 12px',
    boxShadow: `inset 0 -1px 0 ${color.outlineVariant}`,
  },
  supporting: { margin: 0, color: color.onSurfaceVariant },
  headlineRow: { display: 'flex', alignItems: 'center', columnGap: 8 },
  headlineRowRange: { columnGap: 1 },
  headline: {
    flexGrow: 1,
    minWidth: 0,
    margin: 0,
    color: color.onSurface,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fields: { display: 'flex', columnGap: 12, paddingBlock: '18px 16px', paddingInline: 24 },
  field: { width: '100%' },
  half: { width: 134 },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    columnGap: 8,
    flexShrink: 0,
    height: 60,
    boxSizing: 'border-box',
    paddingBlock: '4px 8px',
    paddingInline: 12,
  },
});

export interface DateInputPanelProps {
  /** Start / end fields (a range). */
  range?: boolean;
  value?: Date | null;
  end?: Date | null;
  onChange?: (date: Date | null) => void;
  onEndChange?: (date: Date | null) => void;
  locale?: string;
  formatter?: Partial<DatePickerFormatter>;
  /** Years accepted (inclusive); a typed date outside them doesn't parse. */
  yearRange?: [number, number];
  supportingText?: ReactNode;
  headline?: ReactNode;
  label?: string;
  endLabel?: string;
  /** Placeholder: the expected format (default from the locale, e.g. "mm/dd/yyyy", "dd/mm/yyyy"). */
  placeholder?: string;
  /** Switch back to the calendar. */
  onModeToggle?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  labels?: { cancel?: string; confirm?: string; mode?: string };
  autoFocus?: boolean;
  sx?: StyleXStyles;
}

/** Text entry for a date (or range) — the modal date picker's input mode. */
export function DateInputPanel({
  range = false,
  value = null,
  end = null,
  onChange,
  onEndChange,
  locale,
  formatter,
  yearRange,
  supportingText = 'Select date',
  headline,
  label = 'Date',
  endLabel = 'End date',
  placeholder: placeholderProp,
  onModeToggle,
  onCancel,
  onConfirm,
  labels = {},
  autoFocus,
  sx,
}: DateInputPanelProps) {
  const format = useMemo(() => ({ ...defaultFormatter(locale), ...formatter }), [locale, formatter]);
  const placeholder = placeholderProp ?? inputFormatHint(locale);
  const [startText, setStartText] = useState(value ? format.input(value) : '');
  const [endText, setEndText] = useState(end ? format.input(end) : '');
  const field = (
    text: string,
    set: (t: string) => void,
    report: ((d: Date | null) => void) | undefined,
    fieldLabel: string,
    half: boolean,
    focus?: boolean,
  ) => (
    <TextField
      variant="outlined"
      label={fieldLabel}
      value={text}
      placeholder={placeholder}
      autoFocus={focus}
      inputMode="numeric"
      onValueChange={(t) => {
        set(t);
        report?.(parseInputDate(t, locale, yearRange));
      }}
      sx={half ? s.half : s.field}
    />
  );
  return (
    <div {...stylex.props(s.surface, sx)}>
      {/* A forced test state belongs to the first field only. */}
      <ForceStateBoundary>
        <div data-dp-header="" {...stylex.props(s.header)}>
          <p {...stylex.props(typescale.labelLarge, s.supporting)}>{supportingText}</p>
          <div {...stylex.props(s.headlineRow, range && s.headlineRowRange)}>
            <p {...stylex.props(typescale.headlineLarge, s.headline)}>
              {headline ?? (range ? 'Enter dates' : 'Enter date')}
            </p>
            {onModeToggle && (
              <IconButton aria-label={labels.mode ?? 'Switch to calendar'} width="wide" onClick={onModeToggle}>
                <SvgIcon d={DATE_PICKER_ICONS.today} />
              </IconButton>
            )}
          </div>
        </div>
      </ForceStateBoundary>
      <div data-dp-body="" {...stylex.props(s.fields)}>
        {field(startText, setStartText, onChange, label, range, autoFocus)}
        {range && <ForceStateBoundary>{field(endText, setEndText, onEndChange, endLabel, true)}</ForceStateBoundary>}
      </div>
      <ForceStateBoundary>
        <div data-dp-actions="" {...stylex.props(s.actions)}>
          {onCancel && (
            <Button variant="text" onClick={onCancel}>
              {labels.cancel ?? 'Cancel'}
            </Button>
          )}
          {onConfirm && (
            <Button variant="text" onClick={onConfirm}>
              {labels.confirm ?? 'OK'}
            </Button>
          )}
        </div>
      </ForceStateBoundary>
    </div>
  );
}
