import { useMemo, useState, type ComponentPropsWithRef, type MouseEventHandler, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { Button } from '../Button/Button.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { TextField } from '../TextField/TextField.tsx';
import { textFieldVars } from '../TextField/textField.stylex.ts';
import { ForceStateBoundary } from '../../testing/ForceState.tsx';
import { SvgIcon } from '../../primitives/SvgIcon.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { useLabels, type M3Labels } from '../../theme/labels.tsx';
import { DATE_PICKER_ICONS } from './icons.ts';
import { defaultFormatter, inputFormatHint, parseInputDate, type DatePickerFormatter } from './calendar.ts';
import type { DateRange } from './DateRangePicker.tsx';

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

/** `ref`, the native props and `sx` go to the panel's surface `<div>`. */
interface DateInputPanelCommon extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'defaultValue' | 'placeholder'>> {
  locale?: string;
  formatter?: Partial<DatePickerFormatter>;
  /** Years accepted (inclusive); a typed date outside them doesn't parse. */
  yearRange?: [number, number];
  /** The header's label (default the `selectDate` label). */
  supportingText?: ReactNode;
  /** Default the `enterDate` / `enterDates` label. */
  headline?: ReactNode;
  /** The (first) field's label (default the `date` label — the kit's range also says "Date"). */
  label?: string;
  /** The range's end field label (default the `endDate` label). */
  endLabel?: string;
  /** Placeholder: the expected format (default from the locale, e.g. "mm/dd/yyyy", "dd/mm/yyyy"). */
  placeholder?: string;
  /** Switch back to the calendar (hidden when omitted). */
  onModeToggle?: MouseEventHandler<HTMLButtonElement>;
  onCancel?: MouseEventHandler<HTMLButtonElement>;
  onConfirm?: MouseEventHandler<HTMLButtonElement>;
  /** Overrides for the built-in strings (`selectDate`, `enterDate(s)`, `date`, `endDate`, `switchToCalendar`, `cancel`, `ok`). */
  labels?: Partial<M3Labels>;
  /** Focus the (first) field on mount. */
  autoFocus?: boolean;
}

/**
 * The fields keep what is typed (text entry is uncontrolled): `defaultValue` fills them on mount and
 * every edit reports the parsed value (`null`: not a complete, valid date).
 */
export type DateInputPanelProps = DateInputPanelCommon &
  (
    | { range?: false; defaultValue?: Date | null; onValueChange?: (date: Date | null) => void }
    | { range: true; defaultValue?: DateRange; onValueChange?: (range: DateRange) => void }
  );

/** Text entry for a date (or range) — the modal date picker's input mode. */
export function DateInputPanel(props: DateInputPanelProps) {
  const {
    ref,
    // The value props are read from `props`, narrowed on `range`.
    range = false,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    locale,
    formatter,
    yearRange,
    supportingText,
    headline,
    label,
    endLabel,
    placeholder: placeholderProp,
    onModeToggle,
    onCancel,
    onConfirm,
    labels: labelsProp,
    autoFocus,
    sx,
    ...rest
  } = props;
  const labels = useLabels(labelsProp);
  const format = useMemo(() => ({ ...defaultFormatter(locale), ...formatter }), [locale, formatter]);
  const placeholder = placeholderProp ?? inputFormatHint(locale);
  const [start, end] = props.range
    ? [props.defaultValue?.start ?? null, props.defaultValue?.end ?? null]
    : [props.defaultValue ?? null, null];
  const [startText, setStartText] = useState(start ? format.input(start) : '');
  const [endText, setEndText] = useState(end ? format.input(end) : '');
  const parse = (text: string) => parseInputDate(text, locale, yearRange);
  const report = (typedStart: string, typedEnd: string) => {
    if (props.range) props.onValueChange?.({ start: parse(typedStart), end: parse(typedEnd) });
    else props.onValueChange?.(parse(typedStart));
  };
  const field = (text: string, onType: (typed: string) => void, fieldLabel: string, half: boolean, focus?: boolean) => (
    <TextField
      variant="outlined"
      label={fieldLabel}
      value={text}
      placeholder={placeholder}
      autoFocus={focus}
      inputMode="numeric"
      onValueChange={onType}
      sx={half ? s.half : s.field}
    />
  );
  return (
    <div ref={ref} {...rest} {...stylex.props(s.surface, sx)}>
      {/* A forced test state belongs to the first field only. */}
      <ForceStateBoundary>
        <div data-dp-header="" {...stylex.props(s.header)}>
          <p {...stylex.props(typescale.labelLarge, s.supporting)}>
            {supportingText === undefined ? labels.selectDate : supportingText}
          </p>
          <div {...stylex.props(s.headlineRow, range && s.headlineRowRange)}>
            <p {...stylex.props(typescale.headlineLarge, s.headline)}>
              {headline ?? (range ? labels.enterDates : labels.enterDate)}
            </p>
            {onModeToggle && (
              <IconButton aria-label={labels.switchToCalendar} width="wide" onClick={onModeToggle}>
                <SvgIcon d={DATE_PICKER_ICONS.today} />
              </IconButton>
            )}
          </div>
        </div>
      </ForceStateBoundary>
      <div data-dp-body="" {...stylex.props(s.fields)}>
        {field(
          startText,
          (typed) => {
            setStartText(typed);
            report(typed, endText);
          },
          label ?? labels.date,
          range,
          autoFocus,
        )}
        {range && (
          <ForceStateBoundary>
            {field(
              endText,
              (typed) => {
                setEndText(typed);
                report(startText, typed);
              },
              endLabel ?? labels.endDate,
              true,
            )}
          </ForceStateBoundary>
        )}
      </div>
      <ForceStateBoundary>
        <div data-dp-actions="" {...stylex.props(s.actions)}>
          {onCancel && (
            <Button variant="text" onClick={onCancel}>
              {labels.cancel}
            </Button>
          )}
          {onConfirm && (
            <Button variant="text" onClick={onConfirm}>
              {labels.ok}
            </Button>
          )}
        </div>
      </ForceStateBoundary>
    </div>
  );
}
