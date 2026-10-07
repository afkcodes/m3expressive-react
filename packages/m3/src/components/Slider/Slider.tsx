import { memo, useMemo, useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { focusRing } from '../../primitives/focusRing.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { thumb0, thumb1 } from './slider.stylex.ts';
import { s } from './Slider.styles.ts';
import { activeRange, along, trackSpans, type SliderMode } from './track.ts';
import { sortRange, thumbValueText, tickSteps } from './values.ts';

export type SliderSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type SliderOrientation = 'horizontal' | 'vertical';

/*
 * Figma kit, "Sliders" page (Standard / Centered / Range sets). Track thickness 16 / 24 / 40 / 56 /
 * 96 (XS–XL), component 44 / 44 / 52 / 68 / 108 thick; outer track corners 8 / 8 / 12 / 16 / 28
 * (the kit's 16px XS corner, clamped by Figma to half the track), inner corners 2. The handle is a
 * full-height 4px bar (2px while pressed) whose centre travels from 6px to length − 6px; tracks
 * stop 6px short of it (track.ts). Inactive tracks end in a 4px stop dot 4px from the end. Pressed
 * shows a 48×44 value indicator 4px beyond the handle.
 */
const SIZE: Record<SliderSize, { track: number; height: number; radius: number }> = {
  xsmall: { track: 16, height: 44, radius: 8 },
  small: { track: 24, height: 44, radius: 8 },
  medium: { track: 40, height: 52, radius: 12 },
  large: { track: 56, height: 68, radius: 16 },
  xlarge: { track: 96, height: 108, radius: 28 },
};

/**
 * `ref` and the native props go to Base UI's root `<div>` — except `aria-label` /
 * `aria-labelledby`, which name the thumbs (the focusable sliders).
 */
interface CommonProps extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'defaultValue'>> {
  size?: SliderSize;
  orientation?: SliderOrientation;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  name?: string;
  /** Show the value indicator while pressed / dragged / keyboard-focused (default true). */
  labeled?: boolean;
  /**
   * Value indicator content (Material Web `valueLabel`). Default: the formatted value. A string or
   * number result is also announced as the thumb's value (aria-valuetext).
   */
  valueLabel?: (value: number, index: number) => ReactNode;
  format?: Intl.NumberFormatOptions;
  locale?: Intl.LocalesArgument;
  /**
   * Discrete stop indicators at every `step`. Drawn for up to 200 steps (`MAX_TICKS`); a denser
   * scale would paint a solid line of dots, so above that no ticks are drawn.
   */
  ticks?: boolean;
  /** The thumbs' accessible name (a range slider's two thumbs share it; see `getAriaLabel`). */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /**
   * Accessible name per thumb (range sliders: e.g. "Minimum price" / "Maximum price"); replaces
   * `aria-label` / `aria-labelledby` on the thumbs.
   */
  getAriaLabel?: (index: number) => string;
  /** Announced value per thumb. Default: the `valueLabel` text, or the formatted value. */
  getAriaValueText?: (formattedValue: string, value: number, index: number) => string;
}

/** Base UI's change details (reason, event, `activeThumbIndex`, `cancel()`). */
type ChangeDetails = BaseSlider.Root.ChangeEventDetails;
/** Base UI's commit details (reason, event). */
type CommitDetails = BaseSlider.Root.CommitEventDetails;

export interface SliderProps extends CommonProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number, details: ChangeDetails) => void;
  /** The value when a drag / key press / track press ends. */
  onValueCommitted?: (value: number, details: CommitDetails) => void;
  /** Centered slider: the active track grows from the middle of the range towards the handle. */
  centered?: boolean;
}

export interface RangeSliderProps extends CommonProps {
  /** [start, end]; a reversed pair is put in order. */
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number], details: ChangeDetails) => void;
  onValueCommitted?: (value: [number, number], details: CommitDetails) => void;
}

/** One discrete stop indicator. Memoised: a value change re-renders only the ticks that change colour. */
const SliderTick = memo(function SliderTick({
  fraction,
  horizontal,
  onActive,
  disabled,
}: {
  fraction: number;
  horizontal: boolean;
  onActive: boolean;
  disabled: boolean;
}) {
  const main = `calc(6px + ${along(fraction)})`;
  return (
    <span
      {...stylex.props(
        s.tick,
        horizontal ? s.tickAt(main, '50%') : s.tickAtV(main, '50%'),
        onActive ? s.tickOnActive : s.tickOnInactive,
        disabled && s.dotDisabled,
      )}
    />
  );
});

/**
 * Discrete stop indicators (hidden in the kit's variants; M3: on-active / on-inactive colours) at
 * every step but under the handles. Rebuilt only when the steps, handles or appearance change.
 */
function useTicks(
  steps: number | null,
  mode: SliderMode,
  fractions: readonly number[],
  horizontal: boolean,
  disabled: boolean,
) {
  const [first, second] = fractions;
  return useMemo(() => {
    if (steps == null) return null;
    const handles = second === undefined ? [first!] : [first!, second];
    const [low, high] = activeRange(mode, handles);
    const ticks: ReactNode[] = [];
    for (let k = 0; k <= steps; k++) {
      const fraction = k / steps;
      if (handles.some((handle) => Math.abs(handle - fraction) < 1e-9)) continue;
      ticks.push(
        <SliderTick
          key={k}
          fraction={fraction}
          horizontal={horizontal}
          onActive={fraction > low && fraction < high}
          disabled={disabled}
        />,
      );
    }
    return ticks;
  }, [steps, mode, first, second, horizontal, disabled]);
}

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
  getAriaLabel,
  getAriaValueText,
  sx,
  ref,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...rest
}: CommonProps & {
  mode: SliderMode;
  values: number[];
  setValues: (values: number[], details: ChangeDetails) => void;
  onCommit?: (values: number[], details: CommitDetails) => void;
}) {
  const forced = useForcedState();
  // Compose halves the handle while it is pressed, dragged *or focused*; keyboard focus is tracked
  // here (a nested :has() can't express "thumb contains a focus-visible input").
  const [kbFocus, setKbFocus] = useState<number | null>(null);
  const { track: trackThickness, height, radius } = SIZE[size];
  const horizontal = orientation === 'horizontal';
  const trackOffset = (height - trackThickness) / 2;
  const fractions = values.map((v) => (max === min ? 0 : (Math.min(max, Math.max(min, v)) - min) / (max - min)));
  // The forced thumb for visual tests (range sliders: the kit hovers the end thumb).
  const forcedThumb = forced.thumb ?? (mode === 'range' ? 1 : 0);
  const spans = trackSpans(mode, fractions, radius);
  const tickMarks = useTicks(ticks ? tickSteps(min, max, step) : null, mode, fractions, horizontal, disabled);

  const label = (v: number, i: number) => valueLabel?.(v, i) ?? new Intl.NumberFormat(locale, format).format(v);
  // A text value label is what sighted users read: announce the same (Base UI's default otherwise).
  const valueText =
    getAriaValueText ??
    (valueLabel
      ? (formatted: string, v: number, i: number) => thumbValueText(valueLabel(v, i), formatted, i, mode === 'range')
      : undefined);

  return (
    <BaseSlider.Root
      ref={ref}
      {...rest}
      value={mode === 'range' ? values : values[0]!}
      onValueChange={(v, details) => setValues(Array.isArray(v) ? [...v] : [v], details)}
      onValueCommitted={(v, details) => onCommit?.(Array.isArray(v) ? [...v] : [v], details)}
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
        horizontal ? s.horizontal(height) : s.vertical(height),
        forced.state === 'pressed' && (forcedThumb === 0 ? s.forcePressed0 : s.forcePressed1),
        kbFocus === 0 && s.forcePressed0,
        kbFocus === 1 && s.forcePressed1,
        sx,
      )}
    >
      {spans.map((span, i) => (
        <span
          key={i}
          {...stylex.props(
            s.track,
            horizontal ? s.trackH(trackOffset, trackThickness) : s.trackV(trackOffset, trackThickness),
            horizontal ? s.spanH(span.start, span.end, span.size) : s.spanV(span.start, span.end, span.size),
            horizontal ? s.radiusH(span.startRadius, span.endRadius) : s.radiusV(span.startRadius, span.endRadius),
            span.role === 'active'
              ? disabled
                ? s.activeDisabled
                : s.active
              : disabled
                ? s.inactiveDisabled
                : s.inactive,
          )}
        >
          {span.dotStart && (
            <span
              {...stylex.props(
                s.dot,
                horizontal ? s.dotH : s.dotV,
                horizontal ? s.dotStartH : s.dotStartV,
                disabled && s.dotDisabled,
              )}
            />
          )}
          {span.dotEnd && (
            <span
              {...stylex.props(
                s.dot,
                horizontal ? s.dotH : s.dotV,
                horizontal ? s.dotEndH : s.dotEndV,
                disabled && s.dotDisabled,
              )}
            />
          )}
        </span>
      ))}
      {tickMarks}
      <BaseSlider.Control {...stylex.props(s.control, horizontal ? s.controlH : s.controlV)}>
        {values.map((v, i) => {
          const on = forced.state && forcedThumb === i;
          return (
            <BaseSlider.Thumb
              key={i}
              index={mode === 'range' ? i : undefined}
              aria-label={ariaLabel}
              aria-labelledby={getAriaLabel ? undefined : ariaLabelledby}
              getAriaLabel={getAriaLabel}
              getAriaValueText={valueText}
              onFocus={(e) => setKbFocus((e.target as Element).matches(':focus-visible') ? i : null)}
              onBlur={() => setKbFocus(null)}
              {...stylex.props(
                s.thumb,
                focusRing.within,
                i === 0 ? thumb0 : thumb1,
                stylex.defaultMarker(),
                !horizontal && s.thumbV,
                horizontal ? (i === 0 ? s.thumbH0 : s.thumbH1) : i === 0 ? s.thumbV0 : s.thumbV1,
                disabled && s.thumbDisabled,
                // The kit's thumb has hover and pressed layers only (no focus layer: focus halves it).
                on && forced.state === 'hovered' && stateLayerHost.forceHover,
                on && forced.state === 'pressed' && stateLayerHost.forcePressed,
              )}
            >
              <StateLayer />
              {labeled && (
                <span
                  aria-hidden
                  {...stylex.props(
                    s.indicator,
                    horizontal ? s.indicatorH : s.indicatorV,
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

/** Standard or centered slider (Base UI Slider underneath: keyboard, pointer, form, RTL). */
export function Slider({
  value,
  defaultValue,
  onValueChange,
  onValueCommitted,
  centered = false,
  min = 0,
  max = 100,
  ...rest
}: SliderProps) {
  const [current, setCurrent] = useControllableState<number, [ChangeDetails]>(
    value,
    defaultValue ?? (centered ? (min + max) / 2 : min),
    onValueChange,
  );
  return (
    <SliderImpl
      {...rest}
      min={min}
      max={max}
      mode={centered ? 'centered' : 'standard'}
      values={[current]}
      setValues={(next, details) => setCurrent(next[0]!, details)}
      onCommit={onValueCommitted && ((next, details) => onValueCommitted(next[0]!, details))}
    />
  );
}

/** Range slider: two handles with the active track between them. */
export function RangeSlider({
  value,
  defaultValue,
  onValueChange,
  onValueCommitted,
  min = 0,
  max = 100,
  ...rest
}: RangeSliderProps) {
  const [current, setCurrent] = useControllableState<[number, number], [ChangeDetails]>(
    value,
    defaultValue ?? [min, max],
    onValueChange,
  );
  return (
    <SliderImpl
      {...rest}
      min={min}
      max={max}
      mode="range"
      values={current[0] <= current[1] ? current : sortRange(current)}
      setValues={(next, details) => setCurrent([next[0]!, next[1]!], details)}
      onCommit={onValueCommitted && ((next, details) => onValueCommitted([next[0]!, next[1]!], details))}
    />
  );
}
