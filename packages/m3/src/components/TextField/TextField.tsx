import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Field } from '@base-ui/react/field';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import { useSpringToken } from '../../motion/context.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { textFieldMarker, textFieldVars } from './textField.stylex.ts';

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

const effects = { transitionDuration: motion.fastEffectsDuration, transitionTimingFunction: motion.fastEffectsEasing };
/** Three transitioned properties: two spatial (FastSpatial) and one colour (FastEffects), in this order. */
const spatialSpatialEffects = {
  transitionDuration: `${motion.fastSpatialDuration}, ${motion.fastSpatialDuration}, ${motion.fastEffectsDuration}`,
  transitionTimingFunction: `${motion.fastSpatialEasing}, ${motion.fastSpatialEasing}, ${motion.fastEffectsEasing}`,
};
const mix = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

const s = stylex.create({
  root: {
    display: 'inline-flex',
    flexDirection: 'column',
    width: 210,
    flexShrink: 0,
    boxSizing: 'border-box',
    textAlign: 'start',
  },
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
  // Compose TextFieldDefaults.Container: the container colour animates on FastEffects (enable ⇄ disable).
  filled: {
    backgroundColor: color.surfaceContainerHighest,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    transitionProperty: 'background-color',
    ...effects,
  },
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
    '::placeholder': {
      color: color.onSurfaceVariant,
      opacity: 1,
      transitionProperty: 'opacity',
      transitionDuration: motion.fastEffectsDuration,
      transitionTimingFunction: motion.fastEffectsEasing,
    },
  },
  inputHidePlaceholder: { '::placeholder': { opacity: 0 } },
  // Compose `placeholderOpacity`: SlowEffects for UnfocusedEmpty → Focused and
  // UnfocusedNotEmpty → UnfocusedEmpty, FastEffects otherwise.
  placeholderSlow: {
    '::placeholder': {
      transitionDuration: motion.slowEffectsDuration,
      transitionTimingFunction: motion.slowEffectsEasing,
    },
  },
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
    // The float itself is a spring driven per frame (see `useLabelFloat`); colours fade in CSS.
    transitionProperty: 'color',
    ...effects,
  },
  labelRest: { top: 16 },
  labelFloatFilled: { top: 8 },
  // The floating outlined label carries the notch fill (transparent by default; the outline itself
  // is cut by the fieldset legend). 4px padding = the kit's notch frame (label + 4px each side).
  labelFloatOutlined: (dx: number) => ({
    top: -8,
    left: dx - 4,
    paddingInline: 4,
    backgroundColor: textFieldVars.notchColor,
  }),
  cOnSurfaceVariant: { color: color.onSurfaceVariant },
  cIdleOutlined: {
    color: { default: color.onSurfaceVariant, [stylex.when.ancestor(':hover', textFieldMarker)]: color.onSurface },
  },
  cOnSurface: { color: color.onSurface },
  cPrimary: { color: color.primary },
  cError: { color: color.error },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    pointerEvents: 'none',
    // Compose IndicatorLineNode: width on FastSpatial, colour on FastEffects.
    transitionProperty: 'top, height, background-color',
    ...spatialSpatialEffects,
  },
  indicatorW: (w: number) => ({ top: 56 - w, height: w }),
  bgOnSurfaceVariant: { backgroundColor: color.onSurfaceVariant },
  bgIdle: {
    backgroundColor: {
      default: color.onSurfaceVariant,
      [stylex.when.ancestor(':hover', textFieldMarker)]: color.onSurface,
    },
  },
  bgOnSurface: { backgroundColor: color.onSurface },
  bgPrimary: { backgroundColor: color.primary },
  bgError: { backgroundColor: color.error },
  // Disabled: Compose snaps the indicator (`snap()` while disabled).
  bgOnSurfaceDim: { backgroundColor: color.onSurface, opacity: 0.38, transitionDuration: '0s' },
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
    // Compose animateBorderStrokeAsState: thickness on FastSpatial, colour on FastEffects.
    transitionProperty: 'border-width, padding-inline-start, border-color',
    ...spatialSpatialEffects,
  },
  outlineW: (w: number, notchX: number) => ({ borderWidth: w, paddingInlineStart: notchX - w }),
  outlineCentered: {
    inset: 'auto',
    top: 0,
    left: 0,
    width: 'calc(100% + 1px)',
    height: 'calc(100% + 1px)',
    transform: 'translate(-0.5px, -0.5px)',
  },
  bOutline: { borderColor: color.outline },
  bIdle: {
    borderColor: { default: color.outline, [stylex.when.ancestor(':hover', textFieldMarker)]: color.onSurface },
  },
  bOnSurface: { borderColor: color.onSurface },
  bPrimary: { borderColor: color.primary },
  bError: { borderColor: color.error },
  // Disabled: Compose doesn't animate the stroke (rememberUpdatedState while disabled).
  bDisabledInner: { borderColor: mix(color.onSurface, 4), transitionDuration: '0s' },
  bDisabledCenter: { borderColor: mix(color.onSurface, 10), transitionDuration: '0s' },
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
  },
  legendOpen: { maxWidth: '100%', paddingInline: 4 },
  legendH: (w: number) => ({ height: w }),
  caret: { position: 'absolute', width: 1, height: 17, pointerEvents: 'none' },
  caretMirror: { visibility: 'hidden', whiteSpace: 'pre' },
  // Compose doesn't animate the supporting-text colour (error on / off switches at once).
  supporting: { flexShrink: 0, margin: 0, paddingTop: 4, paddingInline: 16, color: color.onSurfaceVariant },
});

/** Label centre line (px from the content top): resting 16/24 at y 16, floating 12/16 at y 8 (outlined −8). */
const REST_Y = 16 + 12;
const floatY = (outlined: boolean) => (outlined ? -8 : 8) + 8;
/** The outlined notch's padding each side of the label (Compose OutlinedTextFieldInnerPadding). */
const NOTCH_PAD = 4;

/**
 * The label's transform at float progress `p` (0 rest … 1 floated) relative to the layout it
 * currently has (real 16/24 type at rest, 12/16 floated — exact still frames). Position and size
 * are linear in `p` in both layouts, so a layout swap mid-flight is seamless. `scale` is relative
 * to the current layout's type.
 */
function labelTransform(layoutFloated: boolean, p: number, outlined: boolean, labelLeft: number) {
  const dy = REST_Y - floatY(outlined);
  if (layoutFloated) {
    // Floated outlined labels sit in a 4px-padded notch box starting at labelLeft − 4.
    const pad = outlined ? NOTCH_PAD : 0;
    const k = 16 / 12;
    const q = 1 - p;
    return { x: (-(labelLeft - pad) - pad * k) * q, y: dy * q, scale: 1 + (k - 1) * q };
  }
  return { x: labelLeft * p, y: -dy * p, scale: 1 + (12 / 16 - 1) * p };
}

/**
 * Label float as a FastSpatial spring (Compose `labelProgress`: a Transition, so an interrupted
 * float continues from the current position and velocity), written per frame. The outlined notch
 * follows it like Compose's `outlineCutout`: label width × progress, plus 4px each side once open.
 */
function useLabelFloat(
  floated: boolean,
  outlined: boolean,
  labelLeft: number,
  still: boolean,
  label: RefObject<HTMLElement | null>,
  container: RefObject<HTMLDivElement | null>,
) {
  const spring = useSpringToken('fast-spatial');
  const anim = useRef<SpringAnimation | null>(null);
  const progress = useRef(floated ? 1 : 0);
  const layout = useRef({ floated, outlined, labelLeft, width: 0 });
  const prevFloated = useRef(floated);

  useLayoutEffect(() => {
    if (prevFloated.current === floated) return;
    prevFloated.current = floated;
    const el = label.current;
    const legends = [...(container.current?.querySelectorAll('legend') ?? [])];
    const clear = () => {
      if (el) el.style.transform = '';
      for (const lg of legends) {
        lg.style.width = '';
        lg.style.maxWidth = '';
        lg.style.paddingInline = '';
      }
    };
    const target = floated ? 1 : 0;
    if (!el || !spring || still) {
      anim.current?.stop();
      anim.current = null;
      progress.current = target;
      clear();
      return;
    }
    // The label just switched type: measure its text width in the new layout.
    el.style.transform = 'none';
    const width = el.getBoundingClientRect().width - (floated && outlined ? 2 * NOTCH_PAD : 0);
    layout.current = { floated, outlined, labelLeft, width };
    const draw = (p: number) => {
      const g = layout.current;
      const t = labelTransform(g.floated, p, g.outlined, g.labelLeft);
      el.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
      if (!g.outlined) return;
      const cut = p > 0 ? g.width * t.scale * p : 0;
      for (const lg of legends) {
        lg.style.maxWidth = cut > 0 ? 'none' : '0.01px';
        lg.style.width = cut > 0 ? `${cut + 2 * NOTCH_PAD}px` : '';
        lg.style.paddingInline = cut > 0 ? `${NOTCH_PAD}px` : '0px';
      }
    };
    if (anim.current) anim.current.retarget(target, spring);
    else
      anim.current = animateSpring({
        spring,
        from: progress.current,
        to: target,
        precision: 0.01, // Compose's Float visibility threshold
        onUpdate: (v) => {
          progress.current = v;
          draw(v);
        },
        onComplete: () => {
          anim.current = null;
          clear();
        },
      });
    draw(progress.current);
  }, [floated, outlined, labelLeft, still, spring, label, container]);

  useEffect(() => () => anim.current?.stop(), []);
}

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

  // The label switches between real 16/24 and 12/16 type (exact still frames); the float between
  // them is a transform (centre-aligned, which keeps the baseline) driven by a spring.
  const labelRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useLabelFloat(floated, outlined, labelLeft, !!forced.state, labelRef, containerRef);

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
              s.indicatorW(disabled ? 1 : error && !focused ? 1 : w),
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
                s.outlineW(disabled ? 1 : w, notchX + (i === 1 ? 0.5 : 0)),
                i === 1 && s.outlineCentered,
                border,
              )}
            >
              <legend
                {...stylex.props(typescale.bodySmall, s.legend, s.legendH(disabled ? 1 : w), floated && s.legendOpen)}
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
