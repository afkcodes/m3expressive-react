import { forwardRef, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Field } from '@base-ui/react/field';
import { color } from '../../tokens/color.stylex';
import { motion } from '../../tokens/motion.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { useReducedMotion } from '../../motion/context.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { textFieldMarker, textFieldVars } from './textField.stylex.ts';

export type TextFieldVariant = 'filled' | 'outlined';

/*
 * Figma kit, "Text fields" page (set 52798:24373): 56px container, 16px inline padding (4px next
 * to a 48px icon slot, 4px gap), body-large input, label resting at 16/24 or floating at 12/16
 * (filled: y 8 above the input at y 24; outlined: centred on the top edge, notching the outline).
 * Icons sit flush in 48px slots (the 4px padding is vertical). Filled: surface-container-highest,
 * 4px top corners, an indicator line inside the bottom edge (1px; 3px focused). Outlined: 1px inside stroke (3px focused). Supporting text 12/16, 4px below.
 * Motion (Compose TextFieldImpl): label float + stroke width on FastSpatial, colours FastEffects.
 */
const ERROR_ICON =
  'M10 15C10.2833 15 10.5208 14.9042 10.7125 14.7125C10.9042 14.5208 11 14.2833 11 14C11 13.7167 10.9042 13.4792 10.7125 13.2875C10.5208 13.0958 10.2833 13 10 13C9.71667 13 9.47917 13.0958 9.2875 13.2875C9.09583 13.4792 9 13.7167 9 14C9 14.2833 9.09583 14.5208 9.2875 14.7125C9.47917 14.9042 9.71667 15 10 15ZM9 11H11V5H9V11ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20Z';

const spatial = { transitionDuration: motion.fastSpatialDuration, transitionTimingFunction: motion.fastSpatialEasing };
const effects = { transitionDuration: motion.fastEffectsDuration, transitionTimingFunction: motion.fastEffectsEasing };
const mix = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

const s = stylex.create({
  root: { display: 'inline-flex', flexDirection: 'column', width: 210, flexShrink: 0, boxSizing: 'border-box', textAlign: 'start' },
  container: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    columnGap: 4,
    boxSizing: 'border-box',
    height: 56,
    flexShrink: 0,
    cursor: 'text',
    isolation: 'isolate',
  },
  padStart: { paddingInlineStart: 16 },
  padStartIcon: { paddingInlineStart: 0 },
  padEnd: { paddingInlineEnd: 16 },
  padEndIcon: { paddingInlineEnd: 0 },
  filled: { backgroundColor: color.surfaceContainerHighest, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  filledDisabled: { backgroundColor: mix(color.onSurface, 4) },
  outlined: { borderRadius: 4 },
  stateLayer: {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    zIndex: -1,
    backgroundColor: color.onSurface,
    opacity: { default: 0, [stylex.when.ancestor(':hover', textFieldMarker)]: 0.08 },
    transitionProperty: 'opacity',
    ...effects,
  },
  stateLayerHover: { opacity: 0.08 },
  dim: { opacity: 0.38 },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    flexShrink: 0,
    color: color.onSurfaceVariant,
  },
  iconError: { color: color.error },
  content: { position: 'relative', flexGrow: 1, minWidth: 0, alignSelf: 'stretch' },
  input: {
    position: 'absolute',
    insetInline: 0,
    boxSizing: 'border-box',
    width: '100%',
    height: 24,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    outlineStyle: 'none',
    backgroundColor: 'transparent',
    color: color.onSurface,
    caretColor: color.primary,
    textOverflow: 'ellipsis',
    '::placeholder': { color: color.onSurfaceVariant, opacity: 1 },
  },
  inputHidePlaceholder: { '::placeholder': { opacity: 0 } },
  inputError: { caretColor: color.error },
  inputDisabled: { color: mix(color.onSurface, 38), '::placeholder': { color: mix(color.onSurface, 38) } },
  cDisabled: { color: mix(color.onSurface, 38) },
  inputFilledLabel: { top: 24 },
  inputCentered: { top: 16 },
  label: {
    position: 'absolute',
    left: 0,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    transformOrigin: 'left center',
    transitionProperty: 'color, transform',
    transitionDuration: `${motion.fastEffectsDuration}, ${motion.fastSpatialDuration}`,
    transitionTimingFunction: `${motion.fastEffectsEasing}, ${motion.fastSpatialEasing}`,
  },
  labelRest: { top: 16 },
  labelFloatFilled: { top: 8 },
  // The floating outlined label carries the notch fill (transparent by default; the outline itself
  // is cut by the fieldset legend). 4px padding = the kit's notch frame (label + 4px each side).
  labelFloatOutlined: (dx: number) => ({ top: -8, left: dx - 4, paddingInline: 4, backgroundColor: textFieldVars.notchColor }),
  cOnSurfaceVariant: { color: color.onSurfaceVariant },
  cIdleOutlined: { color: { default: color.onSurfaceVariant, [stylex.when.ancestor(':hover', textFieldMarker)]: color.onSurface } },
  cOnSurface: { color: color.onSurface },
  cPrimary: { color: color.primary },
  cError: { color: color.error },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    pointerEvents: 'none',
    transitionProperty: 'top, height, background-color',
    ...spatial,
  },
  indicatorW: (w: number) => ({ top: 56 - w, height: w }),
  bgOnSurfaceVariant: { backgroundColor: color.onSurfaceVariant },
  bgIdle: { backgroundColor: { default: color.onSurfaceVariant, [stylex.when.ancestor(':hover', textFieldMarker)]: color.onSurface } },
  bgOnSurface: { backgroundColor: color.onSurface },
  bgPrimary: { backgroundColor: color.primary },
  bgError: { backgroundColor: color.error },
  bgOnSurfaceDim: { backgroundColor: color.onSurface, opacity: 0.38 },
  // Outlined stroke: a fieldset whose legend cuts the notch for the floating label.
  outline: {
    position: 'absolute',
    inset: 0,
    margin: 0,
    paddingBlock: 0,
    paddingInlineEnd: 0,
    minWidth: 0,
    boxSizing: 'border-box',
    borderStyle: 'solid',
    borderRadius: 4,
    pointerEvents: 'none',
    transitionProperty: 'border-width, border-color, padding-inline-start',
    ...spatial,
  },
  outlineW: (w: number, notchX: number) => ({ borderWidth: w, paddingInlineStart: notchX - w }),
  outlineCentered: { inset: 'auto', top: 0, left: 0, width: 'calc(100% + 1px)', height: 'calc(100% + 1px)', transform: 'translate(-0.5px, -0.5px)' },
  bOutline: { borderColor: color.outline },
  bIdle: { borderColor: { default: color.outline, [stylex.when.ancestor(':hover', textFieldMarker)]: color.onSurface } },
  bOnSurface: { borderColor: color.onSurface },
  bPrimary: { borderColor: color.primary },
  bError: { borderColor: color.error },
  bDisabledInner: { borderColor: mix(color.onSurface, 4) },
  bDisabledCenter: { borderColor: mix(color.onSurface, 10) },
  legend: {
    float: 'none',
    boxSizing: 'border-box',
    padding: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    lineHeight: 0,
    maxWidth: 0.01,
    visibility: 'visible',
    color: 'transparent',
    transitionProperty: 'max-width',
    ...spatial,
  },
  legendOpen: { maxWidth: '100%', paddingInline: 4 },
  legendH: (w: number) => ({ height: w }),
  caret: { position: 'absolute', width: 1, height: 17, pointerEvents: 'none' },
  caretMirror: { visibility: 'hidden', whiteSpace: 'pre' },
  supporting: { flexShrink: 0, margin: 0, paddingTop: 4, paddingInline: 16, color: color.onSurfaceVariant, transitionProperty: 'color', ...effects },
});

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'size' | 'style' | 'className'> {
  variant?: TextFieldVariant;
  label?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Supporting text under the field (replaced by `errorText` when `error`). */
  supportingText?: ReactNode;
  errorText?: ReactNode;
  error?: boolean;
  disabled?: boolean;
  /** 24px icon shown in a 48px slot (pass an IconButton for an actionable icon). */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Keep the label floated (and the placeholder visible) while empty — Compose `alwaysMinimize`. */
  alwaysFloatLabel?: boolean;
  sx?: StyleXStyles;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    variant = 'filled',
    label,
    value: valueProp,
    defaultValue = '',
    onValueChange,
    placeholder,
    supportingText,
    errorText,
    error = false,
    disabled = false,
    leadingIcon,
    trailingIcon,
    alwaysFloatLabel = false,
    sx,
    onFocus,
    onBlur,
    ...inputProps
  },
  ref,
) {
  const forced = useForcedState();
  const reduced = useReducedMotion();
  const [inner, setInner] = useState(defaultValue);
  const value = valueProp ?? inner;
  const [focusedReal, setFocused] = useState(false);
  const focused = !disabled && (forced.state === 'focused' || focusedReal);
  const hovered = !disabled && forced.state === 'hovered';
  const outlined = variant === 'outlined';
  const floated = !!label && (focused || value !== '' || alwaysFloatLabel);
  const hasTrailing = error || trailingIcon != null;
  const labelLeft = outlined && leadingIcon != null ? -32 : 0; // outlined: floats over the icon slot
  const notchX = outlined && leadingIcon != null ? 16 : 12;
  const w = focused ? 3 : 1;

  // FLIP: the label switches between real 16/24 and 12/16 type (exact still frames) and animates
  // from the previous geometry with a transform (centre-aligned, which keeps the baseline).
  const labelRef = useRef<HTMLSpanElement>(null);
  const prevFloated = useRef(floated);
  useLayoutEffect(() => {
    const el = labelRef.current;
    if (!el || prevFloated.current === floated) return;
    prevFloated.current = floated;
    if (reduced || forced.state) return;
    const restTop = 16 + 12;
    const floatTop = (outlined ? -8 : 8) + 8;
    const k = floated ? 16 / 12 : 12 / 16;
    // Text x: resting 0; floating labelLeft (outlined labels sit in a 4px-padded notch box).
    const pad = outlined ? 4 : 0;
    const dx = floated ? -(labelLeft - pad) - pad * k : labelLeft;
    const dy = floated ? restTop - floatTop : floatTop - restTop;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`;
    void el.offsetWidth;
    el.style.transition = '';
    el.style.transform = '';
  }, [floated, outlined, labelLeft, reduced, forced.state]);

  const labelColor = disabled
    ? s.cDisabled
    : error
      ? s.cError
      : focused
        ? s.cPrimary
        : hovered && outlined
          ? s.cOnSurface
          : outlined
            ? s.cIdleOutlined
            : s.cOnSurfaceVariant;
  const lineColor = error ? 'error' : focused ? 'primary' : hovered ? 'onSurface' : 'idle';
  const showCaret = focused && forced.state === 'focused' && forced.caret !== false; // kit's static caret (tests); live uses the native one
  const supporting = error && errorText != null ? errorText : supportingText;

  return (
    <Field.Root disabled={disabled} invalid={error} {...stylex.props(s.root, sx)}>
      <div
        {...stylex.props(
          s.container,
          textFieldMarker,
          leadingIcon != null ? s.padStartIcon : s.padStart,
          hasTrailing ? s.padEndIcon : s.padEnd,
          outlined ? s.outlined : disabled ? [s.filled, s.filledDisabled] : s.filled,
        )}
        onPointerDown={(e) => {
          const input = e.currentTarget.querySelector('input');
          if (input && e.target !== input && !(e.target as Element).closest('button')) {
            e.preventDefault();
            input.focus();
          }
        }}
      >
        {!outlined && !disabled && <span aria-hidden {...stylex.props(s.stateLayer, hovered && s.stateLayerHover)} />}
        {leadingIcon != null && <span {...stylex.props(s.icon, disabled && s.dim)}>{leadingIcon}</span>}
        <div {...stylex.props(s.content)}>
          {label && (
            <Field.Label
              ref={labelRef}
              {...stylex.props(
                s.label,
                floated ? typescale.bodySmall : typescale.bodyLarge,
                floated ? (outlined ? s.labelFloatOutlined(labelLeft) : s.labelFloatFilled) : s.labelRest,
                labelColor,
              )}
            >
              {label}
            </Field.Label>
          )}
          <Field.Control
            ref={ref}
            value={value}
            onValueChange={(v) => {
              if (valueProp === undefined) setInner(v);
              onValueChange?.(v);
            }}
            placeholder={placeholder}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...inputProps}
            {...stylex.props(
              typescale.bodyLarge,
              s.input,
              !!label && !outlined ? s.inputFilledLabel : s.inputCentered,
              !!label && !floated && s.inputHidePlaceholder,
              !!label && !focused && !alwaysFloatLabel && s.inputHidePlaceholder,
              error && s.inputError,
              disabled && s.inputDisabled,
            )}
          />
          {showCaret && (
            <span aria-hidden style={{ position: 'absolute', left: 0, top: label && !outlined ? 24 : 16, display: 'flex' }}>
              <span {...stylex.props(typescale.bodyLarge, textBox.hug, s.caretMirror)}>{value}</span>
              <span
                {...stylex.props(s.caret, error ? s.bgError : s.bgPrimary)}
                // The kit's 1px caret is centred on the text end; layout offsets snap to whole px, a
                // transform doesn't.
                style={{ position: 'relative', transform: 'translate(-0.5px, 3.5px)' }}
              />
            </span>
          )}
        </div>
        {hasTrailing && (
          <span {...stylex.props(s.icon, error && s.iconError, disabled && s.dim)}>
            {error ? (
              <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path transform="translate(2 2)" d={ERROR_ICON} />
              </svg>
            ) : (
              trailingIcon
            )}
          </span>
        )}
        {!outlined && (
          <span
            aria-hidden
            {...stylex.props(
              s.indicator,
              s.indicatorW(disabled ? 1 : error && !focused ? 1 : w),
              disabled
                ? s.bgOnSurfaceDim
                : { error: s.bgError, primary: s.bgPrimary, onSurface: s.bgOnSurface, idle: s.bgIdle }[lineColor],
            )}
          />
        )}
        {outlined &&
          (disabled ? [s.bDisabledInner, s.bDisabledCenter] : [{ error: s.bError, primary: s.bPrimary, onSurface: s.bOnSurface, idle: s.bIdle }[lineColor]]).map(
            (border, i) => (
              <fieldset key={i} aria-hidden {...stylex.props(s.outline, s.outlineW(disabled ? 1 : w, notchX + (i === 1 ? 0.5 : 0)), i === 1 && s.outlineCentered, border)}>
                <legend {...stylex.props(typescale.bodySmall, s.legend, s.legendH(disabled ? 1 : w), floated && s.legendOpen)}>{label}</legend>
              </fieldset>
            ),
          )}
      </div>
      {supporting != null && (
        <Field.Description
          {...stylex.props(typescale.bodySmall, s.supporting, error && s.cError, disabled && [s.cOnSurface, s.dim])}
        >
          {supporting}
        </Field.Description>
      )}
    </Field.Root>
  );
});
