import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { color } from '../../tokens/color.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { usePortalContainer } from '../../theme/portal.tsx';
import { Button } from '../Button/Button.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { scrim } from '../Sheet/scrim.ts';
import { dialogMotion } from '../Dialog/dialogMotion.ts';
import { ForceStateBoundary } from '../../testing/ForceState.tsx';
import { ClockFace, PeriodSelector, TimeField, TimeSelector, TimeSeparator } from './parts.tsx';

/*
 * Figma kit, "Dial picker" (52949:27916) and "Keyboard picker" (52949:28053); Compose TimePicker /
 * TimeInput in a TimePickerDialog.
 *   Surface Container High, 28px corners. Header 40px: label-medium On Surface Variant 24px in.
 *   Dial, vertical (328×520, 20px gaps): hour : minute boxes + the period selector (24px sides;
 *   24h: 116px boxes, 36px sides), the 256px dial 36px below, actions 68px (the keyboard toggle at
 *   the start, Cancel / OK 24px from the end, 20px below). Horizontal (572×384): the boxes and a
 *   horizontal period selector (72px down, 16px gap) beside the dial (52px gap), actions 88px.
 *   Keyboard (328×243; 24h 264): hour : minute fields with labels + the 72px period selector.
 * Motion: the dialog uses the M3 dialog fade + scale; the dial's hand rotates on the default
 *   spatial spring and hours ⇄ minutes cross-fade on default effects.
 */
const KEYBOARD =
  'M4 19C3.45 19 2.97917 18.8042 2.5875 18.4125C2.19583 18.0208 2 17.55 2 17V7C2 6.45 2.19583 5.97917 2.5875 5.5875C2.97917 5.19583 3.45 5 4 5H20C20.55 5 21.0208 5.19583 21.4125 5.5875C21.8042 5.97917 22 6.45 22 7V17C22 17.55 21.8042 18.0208 21.4125 18.4125C21.0208 18.8042 20.55 19 20 19H4ZM8 16H16V14H8V16ZM5 13H7V11H5V13ZM8 13H10V11H8V13ZM11 13H13V11H11V13ZM14 13H16V11H14V13ZM17 13H19V11H17V13ZM5 10H7V8H5V10ZM8 10H10V8H8V10ZM11 10H13V8H11V10ZM14 10H16V8H14V10ZM17 10H19V8H17V10Z';
const SCHEDULE =
  'M15.3 16.7L16.7 15.3L13 11.6V7H11V12.4L15.3 16.7ZM12 22C10.6167 22 9.31667 21.7375 8.1 21.2125C6.88333 20.6875 5.825 19.975 4.925 19.075C4.025 18.175 3.3125 17.1167 2.7875 15.9C2.2625 14.6833 2 13.3833 2 12C2 10.6167 2.2625 9.31667 2.7875 8.1C3.3125 6.88333 4.025 5.825 4.925 4.925C5.825 4.025 6.88333 3.3125 8.1 2.7875C9.31667 2.2625 10.6167 2 12 2C13.3833 2 14.6833 2.2625 15.9 2.7875C17.1167 3.3125 18.175 4.025 19.075 4.925C19.975 5.825 20.6875 6.88333 21.2125 8.1C21.7375 9.31667 22 10.6167 22 12C22 13.3833 21.7375 14.6833 21.2125 15.9C20.6875 17.1167 19.975 18.175 19.075 19.075C18.175 19.975 17.1167 20.6875 15.9 21.2125C14.6833 21.7375 13.3833 22 12 22Z';

const Glyph = ({ d }: { d: string }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={d} />
  </svg>
);

const s = stylex.create({
  surface: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: 20,
    boxSizing: 'border-box',
    width: 328,
    overflow: 'hidden',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerHigh,
    borderRadius: 28,
  },
  surfaceH: { width: 572, rowGap: 0 },
  surfaceKb24: { width: 264 },
  header: { height: 40, boxSizing: 'border-box', paddingTop: 24, paddingInline: 24, flexShrink: 0 },
  title: { margin: 0, height: 16, color: color.onSurfaceVariant },
  body: { display: 'flex', flexDirection: 'column', alignItems: 'center', rowGap: 36, paddingInline: 24 },
  body24: { paddingInline: 36 },
  bodyH: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 52 },
  inputs: { display: 'flex', columnGap: 12, alignSelf: 'stretch' },
  inputsCol: { flexDirection: 'column', rowGap: 16, width: 216, paddingTop: 72, paddingBottom: 50 },
  // 24h: no period selector under the boxes — they centre beside the dial.
  inputsCol24: { justifyContent: 'center', alignSelf: 'stretch', paddingTop: 0, paddingBottom: 0 },
  boxes: { display: 'flex' },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    height: 68,
    boxSizing: 'border-box',
    paddingInline: '12px 24px',
    paddingBottom: 20,
  },
  actionsH: { height: 88, paddingBlock: 20 },
  end: { display: 'flex', columnGap: 8 },
  kbRow: { display: 'flex', columnGap: 12, paddingInline: 24 },
  popup: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    translate: '-50% -50%',
    outlineStyle: 'none',
  },
});

export interface Time {
  /** 0–23 */
  hour: number;
  minute: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const display12 = (h: number) => (h % 12 === 0 ? 12 : h % 12);

export interface TimePickerProps {
  value: Time;
  onChange: (time: Time) => void;
  is24Hour?: boolean;
  orientation?: 'vertical' | 'horizontal';
  /** Which field the dial edits (uncontrolled when omitted). */
  selection?: 'hour' | 'minute';
  onSelectionChange?: (s: 'hour' | 'minute') => void;
  /** Move to minutes after an hour is picked on the dial (default true, as Compose). */
  autoSwitchToMinute?: boolean;
  title?: ReactNode;
  onModeToggle?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  labels?: { cancel?: string; confirm?: string; mode?: string; am?: string; pm?: string };
  sx?: StyleXStyles;
}

/** The dial time picker (the dialog's content; see `ModalTimePicker`). */
export function TimePicker({
  value,
  onChange,
  is24Hour = false,
  orientation = 'vertical',
  selection: selProp,
  onSelectionChange,
  autoSwitchToMinute = true,
  title = 'Select time',
  onModeToggle,
  onCancel,
  onConfirm,
  labels = {},
  sx,
}: TimePickerProps) {
  const [innerSel, setInnerSel] = useState<'hour' | 'minute'>('hour');
  const sel = selProp ?? innerSel;
  const setSel = (v: 'hour' | 'minute') => {
    if (!selProp) setInnerSel(v);
    onSelectionChange?.(v);
  };
  const h = orientation === 'horizontal';
  const pm = value.hour >= 12;
  const dialHour = is24Hour ? value.hour : display12(value.hour);
  const setHourFromDial = (v: number) => {
    const hour = is24Hour ? v % 24 : (v % 12) + (pm ? 12 : 0);
    onChange({ hour, minute: value.minute });
  };
  const boxes = (
    <span {...stylex.props(s.boxes)}>
      <TimeSelector
        value={pad(dialHour)}
        selected={sel === 'hour'}
        wide={is24Hour && !h}
        onClick={() => setSel('hour')}
        aria-label={`Hour ${dialHour}`}
      />
      <TimeSeparator />
      <ForceStateBoundary>
        <TimeSelector
          value={pad(value.minute)}
          selected={sel === 'minute'}
          wide={is24Hour && !h}
          onClick={() => setSel('minute')}
          aria-label={`Minute ${value.minute}`}
        />
      </ForceStateBoundary>
    </span>
  );
  const period = !is24Hour && (
    <ForceStateBoundary>
      <PeriodSelector
        pm={pm}
        orientation={h ? 'horizontal' : 'vertical'}
        labels={labels}
        onChange={(toPm) => onChange({ hour: (value.hour % 12) + (toPm ? 12 : 0), minute: value.minute })}
      />
    </ForceStateBoundary>
  );
  return (
    <div {...stylex.props(s.surface, h && s.surfaceH, sx)}>
      <div {...stylex.props(s.header)}>
        <p {...stylex.props(typescale.labelMedium, s.title)}>{title}</p>
      </div>
      <div {...stylex.props(s.body, is24Hour && !h && s.body24, h && s.bodyH)}>
        <div {...stylex.props(s.inputs, h && s.inputsCol, h && is24Hour && s.inputsCol24)}>
          {boxes}
          {period}
        </div>
        <ForceStateBoundary>
          <ClockFace
            mode={sel}
            value={sel === 'hour' ? (is24Hour ? value.hour : dialHour) : value.minute}
            is24Hour={is24Hour}
            onChange={(v) => (sel === 'hour' ? setHourFromDial(v) : onChange({ hour: value.hour, minute: v }))}
            onCommit={() => sel === 'hour' && autoSwitchToMinute && setSel('minute')}
          />
        </ForceStateBoundary>
      </div>
      {(onModeToggle || onCancel || onConfirm) && (
        <ForceStateBoundary>
          <div {...stylex.props(s.actions, h && s.actionsH)}>
            {onModeToggle ? (
              <IconButton aria-label={labels.mode ?? 'Switch to text input'} onClick={onModeToggle}>
                <Glyph d={KEYBOARD} />
              </IconButton>
            ) : (
              <span />
            )}
            <span {...stylex.props(s.end)}>
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
            </span>
          </div>
        </ForceStateBoundary>
      )}
    </div>
  );
}

export interface TimeInputProps extends Omit<TimePickerProps, 'orientation' | 'selection' | 'onSelectionChange' | 'autoSwitchToMinute'> {
  autoFocus?: boolean;
}

/** The keyboard time picker (Compose TimeInput). */
export function TimeInput({
  value,
  onChange,
  is24Hour = false,
  title = 'Enter time',
  onModeToggle,
  onCancel,
  onConfirm,
  labels = {},
  autoFocus,
  sx,
}: TimeInputProps) {
  const pm = value.hour >= 12;
  const [hourText, setHourText] = useState(pad(is24Hour ? value.hour : display12(value.hour)));
  const [minuteText, setMinuteText] = useState(pad(value.minute));
  const minuteRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (autoFocus) hourRef.current?.focus();
  }, [autoFocus]);
  return (
    <div {...stylex.props(s.surface, is24Hour && s.surfaceKb24, sx)}>
      <div {...stylex.props(s.header)}>
        <p {...stylex.props(typescale.labelMedium, s.title)}>{title}</p>
      </div>
      <div {...stylex.props(s.kbRow)}>
        <span {...stylex.props(s.boxes)}>
          <TimeField
            ref={hourRef}
            label="Hour"
            value={hourText}
            max={is24Hour ? 23 : 12}
            onValueChange={(t) => {
              setHourText(t);
              if (t !== '') {
                const n = Number(t);
                onChange({ hour: is24Hour ? n : (n % 12) + (pm ? 12 : 0), minute: value.minute });
              }
            }}
            onCommit={() => minuteRef.current?.focus()}
          />
          <TimeSeparator height={72} />
          <ForceStateBoundary>
            <TimeField
              ref={minuteRef}
              label="Minute"
              value={minuteText}
              max={59}
              onValueChange={(t) => {
                setMinuteText(t);
                if (t !== '') onChange({ hour: value.hour, minute: Number(t) });
              }}
            />
          </ForceStateBoundary>
        </span>
        {!is24Hour && (
          <ForceStateBoundary>
            <PeriodSelector
              pm={pm}
              compact
              labels={labels}
              onChange={(toPm) => onChange({ hour: (value.hour % 12) + (toPm ? 12 : 0), minute: value.minute })}
            />
          </ForceStateBoundary>
        )}
      </div>
      {(onModeToggle || onCancel || onConfirm) && (
        <ForceStateBoundary>
          <div {...stylex.props(s.actions)}>
            {onModeToggle ? (
              <IconButton aria-label={labels.mode ?? 'Switch to clock'} onClick={onModeToggle}>
                <Glyph d={SCHEDULE} />
              </IconButton>
            ) : (
              <span />
            )}
            <span {...stylex.props(s.end)}>
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
            </span>
          </div>
        </ForceStateBoundary>
      )}
    </div>
  );
}

export interface ModalTimePickerProps extends Omit<TimePickerProps, 'onCancel' | 'onConfirm' | 'onModeToggle'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The time picker dialog: dial ⇄ keyboard, OK commits, Cancel / Escape discard. */
export function ModalTimePicker({ open, onOpenChange, value, onChange, ...picker }: ModalTimePickerProps) {
  const portal = usePortalContainer();
  const [draft, setDraft] = useState<Time>(value);
  const [mode, setMode] = useState<'dial' | 'keyboard'>('dial');
  useLayoutEffect(() => {
    if (open) {
      setDraft(value);
      setMode('dial');
    }
  }, [open, value]);
  const confirm = () => {
    onChange(draft);
    onOpenChange(false);
  };
  return (
    <BaseDialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <BaseDialog.Portal container={portal}>
        <BaseDialog.Backdrop {...stylex.props(scrim.backdrop)} />
        <BaseDialog.Popup aria-label={mode === 'dial' ? 'Select time' : 'Enter time'} {...stylex.props(s.popup, dialogMotion.fadeScale)}>
          {mode === 'dial' ? (
            <TimePicker
              {...picker}
              value={draft}
              onChange={setDraft}
              onModeToggle={() => setMode('keyboard')}
              onCancel={() => onOpenChange(false)}
              onConfirm={confirm}
            />
          ) : (
            <TimeInput
              value={draft}
              onChange={setDraft}
              is24Hour={picker.is24Hour}
              labels={picker.labels}
              autoFocus
              onModeToggle={() => setMode('dial')}
              onCancel={() => onOpenChange(false)}
              onConfirm={confirm}
            />
          )}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
