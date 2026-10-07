import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Field } from '@base-ui/react/field';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { textFieldMarker } from './textField.stylex.ts';
import { s } from './TextField.styles.ts';
import { useLabelFloat } from './useLabelFloat.ts';

export type TextFieldVariant = 'filled' | 'outlined';

/*
 * Figma kit, "Text fields" page (set 52798:24373): 56px container, 16px inline padding (4px next
 * to a 48px icon slot, 4px gap), body-large input, label resting at 16/24 or floating at 12/16
 * (filled: y 8 above the input at y 24; outlined: centred on the top edge, notching the outline).
 * Icons sit flush in 48px slots (the 4px padding is vertical). Filled: surface-container-highest,
 * 4px top corners, an indicator line inside the bottom edge (1px; 3px focused). Outlined: 1px inside stroke (3px focused). Supporting text 12/16, 4px below.
 * Motion (Compose TextFieldImpl / TextFieldDefaults): label float (and the outlined notch with it)
 * + stroke width on FastSpatial; indicator, outline, label and container colours on FastEffects
 * (indicator and outline snap when disabled); placeholder fades on Fast / SlowEffects.
 */
const ERROR_ICON =
  'M10 15C10.2833 15 10.5208 14.9042 10.7125 14.7125C10.9042 14.5208 11 14.2833 11 14C11 13.7167 10.9042 13.4792 10.7125 13.2875C10.5208 13.0958 10.2833 13 10 13C9.71667 13 9.47917 13.0958 9.2875 13.2875C9.09583 13.4792 9 13.7167 9 14C9 14.2833 9.09583 14.5208 9.2875 14.7125C9.47917 14.9042 9.71667 15 10 15ZM9 11H11V5H9V11ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20Z';

type InputPhase = 'focused' | 'unfocusedEmpty' | 'unfocusedNotEmpty';

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'size' | 'style' | 'className'
> {
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
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange);
  const [focusedReal, setFocused] = useState(false);
  const focused = !disabled && (forced.state === 'focused' || focusedReal);
  const hovered = !disabled && forced.state === 'hovered';
  const outlined = variant === 'outlined';
  const floated = !!label && (focused || value !== '' || alwaysFloatLabel);
  const hasTrailing = error || trailingIcon != null;
  const labelLeft = outlined && leadingIcon != null ? -32 : 0; // outlined: floats over the icon slot
  const notchX = outlined && leadingIcon != null ? 16 : 12;
  const strokeWidth = focused ? 3 : 1;

  // The label switches between real 16/24 and 12/16 type (exact still frames); the float between
  // them is a transform (centre-aligned, which keeps the baseline) driven by a spring.
  const { label: labelRef, container: containerRef } = useLabelFloat(floated, outlined, labelLeft, !!forced.state);

  // Placeholder opacity (Compose `placeholderOpacity`): shown while focused, or while empty when
  // the label doesn't rest inside the field; the fade's speed depends on where it comes from.
  const phase: InputPhase = focused ? 'focused' : value === '' ? 'unfocusedEmpty' : 'unfocusedNotEmpty';
  const [phases, setPhases] = useState({ from: phase, to: phase });
  if (phases.to !== phase) setPhases({ from: phases.to, to: phase });
  const from = phases.to !== phase ? phases.to : phases.from;
  const placeholderSlow =
    (from === 'unfocusedEmpty' && phase === 'focused') || (from === 'unfocusedNotEmpty' && phase === 'unfocusedEmpty');
  const showExpandedLabel = !!label && !alwaysFloatLabel;
  const placeholderShown = phase === 'focused' || (phase === 'unfocusedEmpty' && !showExpandedLabel);

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
        ref={containerRef}
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
            onValueChange={(next) => setValue(next)}
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
              !placeholderShown && s.inputHidePlaceholder,
              placeholderSlow && s.placeholderSlow,
              error && s.inputError,
              disabled && s.inputDisabled,
            )}
          />
          {showCaret && (
            <span
              aria-hidden
              style={{ position: 'absolute', left: 0, top: label && !outlined ? 24 : 16, display: 'flex' }}
            >
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
              s.indicatorW(disabled ? 1 : error && !focused ? 1 : strokeWidth),
              disabled
                ? s.bgOnSurfaceDim
                : { error: s.bgError, primary: s.bgPrimary, onSurface: s.bgOnSurface, idle: s.bgIdle }[lineColor],
            )}
          />
        )}
        {outlined &&
          (disabled
            ? [s.bDisabledInner, s.bDisabledCenter]
            : [{ error: s.bError, primary: s.bPrimary, onSurface: s.bOnSurface, idle: s.bIdle }[lineColor]]
          ).map((border, i) => (
            <fieldset
              key={i}
              aria-hidden
              {...stylex.props(
                s.outline,
                s.outlineW(disabled ? 1 : strokeWidth, notchX + (i === 1 ? 0.5 : 0)),
                i === 1 && s.outlineCentered,
                border,
              )}
            >
              <legend
                {...stylex.props(
                  typescale.bodySmall,
                  s.legend,
                  s.legendH(disabled ? 1 : strokeWidth),
                  floated && s.legendOpen,
                )}
              >
                {label}
              </legend>
            </fieldset>
          ))}
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
