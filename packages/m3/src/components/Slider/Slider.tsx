import { forwardRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { color } from '../../tokens/color.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { StateLayer } from '../../primitives/StateLayer.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { sliderVars, thumb0, thumb1 } from './slider.stylex.ts';

export type SliderSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type SliderOrientation = 'horizontal' | 'vertical';

/*
 * Figma kit, "Sliders" page (Standard / Centered / Range sets). Track thickness 16 / 24 / 40 / 56 /
 * 96 (XS–XL), component 44 / 44 / 52 / 68 / 108 thick; outer track corners 8 / 8 / 12 / 16 / 28
 * (the kit's 16px XS corner, clamped by Figma to half the track), inner corners 2. The handle is a
 * full-height 4px bar (2px while pressed) whose centre travels from 6px to length − 6px; tracks
 * stop 6px short of it. Inactive tracks end in a 4px stop dot 4px from the end. Pressed shows a
 * 48×44 value indicator 4px beyond the handle.
 */
const SIZE: Record<SliderSize, { track: number; h: number; r: number }> = {
  xsmall: { track: 16, h: 44, r: 8 },
  small: { track: 24, h: 44, r: 8 },
  medium: { track: 40, h: 52, r: 12 },
  large: { track: 56, h: 68, r: 16 },
  xlarge: { track: 96, h: 108, r: 28 },
};
const INNER_R = 2;

const s = stylex.create({
  root: {
    position: 'relative',
    flexShrink: 0,
    boxSizing: 'border-box',
    touchAction: 'none',
    [sliderVars.hw0]: { default: '4px', [stylex.when.descendant(':is([data-dragging])', thumb0)]: '2px' },
    [sliderVars.hw1]: { default: '4px', [stylex.when.descendant(':is([data-dragging])', thumb1)]: '2px' },
  },
  forcePressed0: { [sliderVars.hw0]: '2px' },
  forcePressed1: { [sliderVars.hw1]: '2px' },
  horizontal: (h: number) => ({ width: '100%', height: h }),
  vertical: (h: number) => ({ width: h, height: '100%' }),
  control: { position: 'absolute', touchAction: 'none' },
  controlH: { top: 0, bottom: 0, insetInlineStart: 6, insetInlineEnd: 6 },
  controlV: { left: 0, right: 0, top: 6, bottom: 6 },
  track: { position: 'absolute', overflow: 'hidden', pointerEvents: 'none' },
  trackH: (offset: number, thickness: number) => ({ top: offset, height: thickness }),
  trackV: (offset: number, thickness: number) => ({ left: offset, width: thickness }),
  spanH: (start: string | null, end: string | null, size: string) => ({
    insetInlineStart: start ?? 'auto',
    insetInlineEnd: end ?? 'auto',
    width: `max(0px, ${size})`,
  }),
  spanV: (start: string | null, end: string | null, size: string) => ({
    bottom: start ?? 'auto',
    top: end ?? 'auto',
    height: `max(0px, ${size})`,
  }),
  // [start-start, start-end, end-end, end-start] in logical corners (horizontal) — mapped per axis.
  radiusH: (startSide: number, endSide: number) => ({
    borderStartStartRadius: startSide,
    borderEndStartRadius: startSide,
    borderStartEndRadius: endSide,
    borderEndEndRadius: endSide,
  }),
  radiusV: (bottom: number, top: number) => ({
    borderBottomLeftRadius: bottom,
    borderBottomRightRadius: bottom,
    borderTopLeftRadius: top,
    borderTopRightRadius: top,
  }),
  active: { backgroundColor: color.primary },
  activeDisabled: { backgroundColor: color.onSurface, opacity: 0.38 },
  inactive: { backgroundColor: color.secondaryContainer },
  inactiveDisabled: { backgroundColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)` },
  dot: { position: 'absolute', width: 4, height: 4, borderRadius: '50%', backgroundColor: color.onSecondaryContainer },
  dotDisabled: { backgroundColor: color.onSurface, opacity: 0.38 },
  dotH: { top: '50%', marginTop: -2 },
  dotV: { left: '50%', marginLeft: -2 },
  dotStartH: { insetInlineStart: 4 },
  dotEndH: { insetInlineEnd: 4 },
  dotStartV: { bottom: 4 },
  dotEndV: { top: 4 },
  tick: { position: 'absolute', width: 4, height: 4, borderRadius: '50%', pointerEvents: 'none', transform: 'translate(-50%, -50%)' },
  tickAt: (main: string, cross: string) => ({ insetInlineStart: main, top: cross }),
  tickAtV: (main: string, cross: string) => ({ bottom: main, left: cross, transform: 'translate(-50%, 50%)' }),
  tickOnActive: { backgroundColor: color.secondaryContainer },
  tickOnInactive: { backgroundColor: color.onSecondaryContainer },
  thumb: {
    boxSizing: 'border-box',
    backgroundColor: color.primary,
    borderRadius: 2,
    isolation: 'isolate',
    outlineStyle: { default: 'none', ':has(:focus-visible)': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
    [interaction.layerColor]: color.onPrimary,
    [interaction.layerOpacity]: {
      default: '0',
      ':hover': { default: '0', '@media (hover: hover)': state.hoverOpacity },
      ':is([data-dragging])': { default: state.pressedOpacity, '@media (hover: hover)': state.pressedOpacity },
    },
    // Compose StateLayer: a drag fades in over 45 ms (linear).
    [interaction.layerDuration]: { default: '15ms', ':is([data-dragging])': { default: '45ms', '@media (hover: hover)': '45ms' } },
    // 48px touch / hover target around the 4px bar.
    '::after': { content: '""', position: 'absolute', inset: '-4px -22px' },
  },
  thumbV: { '::after': { inset: '-22px -4px' } },
  thumbH0: { width: sliderVars.hw0, height: '100%' },
  thumbH1: { width: sliderVars.hw1, height: '100%' },
  thumbV0: { height: sliderVars.hw0, width: '100%' },
  thumbV1: { height: sliderVars.hw1, width: '100%' },
  thumbDisabled: { backgroundColor: color.onSurface, opacity: 0.38, [interaction.layerOpacity]: '0' },
  forceHover: { [interaction.layerOpacity]: state.hoverOpacity },
  forcePressed: { [interaction.layerOpacity]: state.pressedOpacity },
  indicator: {
    position: 'absolute',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    height: 44,
    paddingInline: 11.5,
    borderRadius: 9999,
    backgroundColor: color.inverseSurface,
    color: color.inverseOnSurface,
    pointerEvents: 'none',
    // Compose's slider value indicator is a `Label` (internal Label.kt): a BasicTooltipBox popup
    // that appears and disappears with no transition. It shows while pressed / dragged (the kit's
    // Pressed variants) and, as our accessibility choice, while keyboard-focused. Compose's Label
    // also shows on hover; the kit's Hovered variants draw no indicator, so the kit wins there.
    opacity: {
      default: 0,
      [stylex.when.ancestor(':is([data-dragging])')]: 1,
      [stylex.when.ancestor(':has(:focus-visible)')]: 1,
    },
  },
  indicatorH: { bottom: 'calc(100% + 4px)', left: '50%', translate: '-50% 0' },
  indicatorV: { right: 'calc(100% + 4px)', top: '50%', translate: '0 -50%' },
  indicatorShown: { opacity: 1 },
});

type Mode = 'standard' | 'centered' | 'range';

interface CommonProps {
  size?: SliderSize;
  orientation?: SliderOrientation;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  name?: string;
  /** Show the value indicator while pressed / dragged / keyboard-focused (default true). */
  labeled?: boolean;
  /** Value indicator content (Material Web `valueLabel`). Default: the formatted value. */
  valueLabel?: (value: number, index: number) => ReactNode;
  format?: Intl.NumberFormatOptions;
  locale?: Intl.LocalesArgument;
  /** Discrete stop indicators at every `step`. */
  ticks?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  sx?: StyleXStyles;
}

export interface SliderProps extends CommonProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueCommitted?: (value: number) => void;
  /** Centered slider: the active track grows from the middle of the range towards the handle. */
  centered?: boolean;
}

export interface RangeSliderProps extends CommonProps {
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  onValueCommitted?: (value: [number, number]) => void;
}

const T = (p: number) => `${p} * (100% - 12px)`; // handle centre − 6px, as a CSS length

function SliderImpl({
  mode,
  values,
  setValues,
  onCommit,
  size = 'xsmall',
  orientation = 'horizontal',
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  name,
  labeled = true,
  valueLabel,
  format,
  locale,
  ticks = false,
  sx,
  forwardedRef,
  ...aria
}: CommonProps & {
  mode: Mode;
  values: number[];
  setValues: (v: number[]) => void;
  onCommit?: (v: number[]) => void;
  forwardedRef: React.Ref<HTMLDivElement>;
}) {
  const forced = useForcedState();
  // Compose halves the handle while it is pressed, dragged *or focused*; keyboard focus is tracked
  // here (a nested :has() can't express "thumb contains a focus-visible input").
  const [kbFocus, setKbFocus] = useState<number | null>(null);
  const { track: th, h, r } = SIZE[size];
  const H = orientation === 'horizontal';
  const off = (h - th) / 2;
  const p = values.map((v) => (max === min ? 0 : (Math.min(max, Math.max(min, v)) - min) / (max - min)));
  // The forced thumb for visual tests (range sliders: the kit hovers the end thumb).
  const forcedThumb = forced.thumb ?? (mode === 'range' ? 1 : 0);
  const hwVar = (i: number) => (i === 0 ? sliderVars.hw0 : sliderVars.hw1);

  // Track spans as [start, end, size] CSS lengths along the main axis.
  type Span = { start: string | null; end: string | null; size: string; role: 'active' | 'inactive'; startR: number; endR: number; dotStart?: boolean; dotEnd?: boolean };
  const hw = (i: number) => `${hwVar(i)} / 2`;
  const spans: Span[] = [];
  if (mode === 'standard') {
    spans.push({ start: '0px', end: null, size: `calc(${T(p[0]!)} - ${hw(0)})`, role: 'active', startR: r, endR: INNER_R });
    spans.push({ start: null, end: '0px', size: `calc(${T(1 - p[0]!)} - ${hw(0)})`, role: 'inactive', startR: INNER_R, endR: r, dotEnd: true });
  } else if (mode === 'centered') {
    const q = p[0]!;
    spans.push({ start: '0px', end: null, size: `min(calc(${T(q)} - ${hw(0)}), calc(50% - 2px))`, role: 'inactive', startR: r, endR: INNER_R, dotStart: true });
    if (q < 0.5) spans.push({ start: `calc(12px + ${T(q)} + ${hw(0)})`, end: null, size: `calc(50% - 14px - ${T(q)} - ${hw(0)})`, role: 'active', startR: INNER_R, endR: INNER_R });
    if (q > 0.5) spans.push({ start: 'calc(50% + 2px)', end: null, size: `calc(${T(q)} - ${hw(0)} - 50% - 2px)`, role: 'active', startR: INNER_R, endR: INNER_R });
    spans.push({ start: null, end: '0px', size: `min(calc(${T(1 - q)} - ${hw(0)}), calc(50% - 2px))`, role: 'inactive', startR: INNER_R, endR: r, dotEnd: true });
  } else {
    const [a, b] = [p[0]!, p[1]!];
    spans.push({ start: '0px', end: null, size: `calc(${T(a)} - ${hw(0)})`, role: 'inactive', startR: r, endR: INNER_R, dotStart: true });
    spans.push({ start: `calc(12px + ${T(a)} + ${hw(0)})`, end: null, size: `calc(${T(b - a)} - ${hw(0)} - ${hw(1)} - 12px)`, role: 'active', startR: INNER_R, endR: INNER_R });
    spans.push({ start: null, end: '0px', size: `calc(${T(1 - b)} - ${hw(1)})`, role: 'inactive', startR: INNER_R, endR: r, dotEnd: true });
  }

  // Discrete stop indicators (hidden in the kit's variants; M3: on-active / on-inactive colours).
  const tickEls: ReactNode[] = [];
  if (ticks && step > 0) {
    const n = Math.round((max - min) / step);
    const lo = mode === 'range' ? p[0]! : mode === 'centered' ? Math.min(0.5, p[0]!) : 0;
    const hi = mode === 'range' ? p[1]! : mode === 'centered' ? Math.max(0.5, p[0]!) : p[0]!;
    for (let k = 0; k <= n && n <= 200; k++) {
      const t = k / n;
      if (p.some((q) => Math.abs(q - t) < 1e-9)) continue;
      const main = `calc(6px + ${T(t)})`;
      tickEls.push(
        <span
          key={k}
          {...stylex.props(
            s.tick,
            H ? s.tickAt(main, '50%') : s.tickAtV(main, '50%'),
            t > lo && t < hi ? s.tickOnActive : s.tickOnInactive,
            disabled && s.dotDisabled,
          )}
        />,
      );
    }
  }

  const label = (v: number, i: number) => valueLabel?.(v, i) ?? new Intl.NumberFormat(locale, format).format(v);

  return (
    <BaseSlider.Root
      ref={forwardedRef}
      value={mode === 'range' ? values : values[0]!}
      onValueChange={(v) => setValues(Array.isArray(v) ? [...v] : [v])}
      onValueCommitted={(v) => onCommit?.(Array.isArray(v) ? [...v] : [v])}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      name={name}
      orientation={orientation}
      format={format}
      locale={locale}
      {...stylex.props(
        s.root,
        H ? s.horizontal(h) : s.vertical(h),
        forced.state === 'pressed' && (forcedThumb === 0 ? s.forcePressed0 : s.forcePressed1),
        kbFocus === 0 && s.forcePressed0,
        kbFocus === 1 && s.forcePressed1,
        sx,
      )}
    >
      {spans.map((sp, i) => (
        <span
          key={i}
          {...stylex.props(
            s.track,
            H ? s.trackH(off, th) : s.trackV(off, th),
            H ? s.spanH(sp.start, sp.end, sp.size) : s.spanV(sp.start, sp.end, sp.size),
            H ? s.radiusH(sp.startR, sp.endR) : s.radiusV(sp.startR, sp.endR),
            sp.role === 'active' ? (disabled ? s.activeDisabled : s.active) : disabled ? s.inactiveDisabled : s.inactive,
          )}
        >
          {sp.dotStart && <span {...stylex.props(s.dot, H ? s.dotH : s.dotV, H ? s.dotStartH : s.dotStartV, disabled && s.dotDisabled)} />}
          {sp.dotEnd && <span {...stylex.props(s.dot, H ? s.dotH : s.dotV, H ? s.dotEndH : s.dotEndV, disabled && s.dotDisabled)} />}
        </span>
      ))}
      {tickEls}
      <BaseSlider.Control {...stylex.props(s.control, H ? s.controlH : s.controlV)}>
        {values.map((v, i) => {
          const on = forced.state && forcedThumb === i;
          return (
            <BaseSlider.Thumb
              key={i}
              index={mode === 'range' ? i : undefined}
              aria-label={aria['aria-label']}
              aria-labelledby={aria['aria-labelledby']}
              onFocus={(e) => setKbFocus((e.target as Element).matches(':focus-visible') ? i : null)}
              onBlur={() => setKbFocus(null)}
              {...stylex.props(
                s.thumb,
                i === 0 ? thumb0 : thumb1,
                stylex.defaultMarker(),
                !H && s.thumbV,
                H ? (i === 0 ? s.thumbH0 : s.thumbH1) : i === 0 ? s.thumbV0 : s.thumbV1,
                disabled && s.thumbDisabled,
                on && forced.state === 'hovered' && s.forceHover,
                on && forced.state === 'pressed' && s.forcePressed,
              )}
            >
              <StateLayer />
              {labeled && (
                <span
                  aria-hidden
                  {...stylex.props(
                    s.indicator,
                    H ? s.indicatorH : s.indicatorV,
                    on && forced.state === 'pressed' && s.indicatorShown,
                  )}
                >
                  <span {...stylex.props(typescale.labelLarge, textBox.hug)}>{label(v, i)}</span>
                </span>
              )}
            </BaseSlider.Thumb>
          );
        })}
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}

function useControllable<V>(value: V | undefined, defaultValue: V, onChange?: (v: V) => void) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  return [current, (v: V) => { if (value === undefined) setInner(v); onChange?.(v); }] as const;
}

/** Standard or centered slider (Base UI Slider underneath: keyboard, pointer, form, RTL). */
export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
  { value, defaultValue, onValueChange, onValueCommitted, centered = false, min = 0, max = 100, ...rest },
  ref,
) {
  const [v, setV] = useControllable(value, defaultValue ?? (centered ? (min + max) / 2 : min), onValueChange);
  return (
    <SliderImpl
      {...rest}
      min={min}
      max={max}
      mode={centered ? 'centered' : 'standard'}
      values={[v]}
      setValues={(n) => setV(n[0]!)}
      onCommit={onValueCommitted && ((n) => onValueCommitted(n[0]!))}
      forwardedRef={ref}
    />
  );
});

/** Range slider: two handles with the active track between them. */
export const RangeSlider = forwardRef<HTMLDivElement, RangeSliderProps>(function RangeSlider(
  { value, defaultValue, onValueChange, onValueCommitted, min = 0, max = 100, ...rest },
  ref,
) {
  const [v, setV] = useControllable(value, defaultValue ?? [min, max], onValueChange);
  return (
    <SliderImpl
      {...rest}
      min={min}
      max={max}
      mode="range"
      values={v}
      setValues={(n) => setV([n[0]!, n[1]!])}
      onCommit={onValueCommitted && ((n) => onValueCommitted([n[0]!, n[1]!]))}
      forwardedRef={ref}
    />
  );
});
