/**
 * Computed-style readers for the live specs (values exactly as getComputedStyle serialises them:
 * durations in seconds, "0.369s").
 */
import type { Locator } from '@playwright/test';

export interface Transition {
  property: string;
  duration: string;
  delay: string;
  easing: string;
}

/** The computed transition lists of `target`, or of its `pseudo`-element ("::after"). */
export function transitionOf(target: Locator, pseudo?: string): Promise<Transition> {
  return target.evaluate((el, p) => {
    const cs = getComputedStyle(el, p);
    return {
      property: cs.transitionProperty,
      duration: cs.transitionDuration,
      delay: cs.transitionDelay,
      easing: cs.transitionTimingFunction,
    };
  }, pseudo ?? null);
}

/**
 * The transition of one property (the duration / easing lists repeat to the property list's
 * length), or null when it doesn't transition.
 */
export function transitionFor(target: Locator, property: string) {
  return target.evaluate((el, prop) => {
    const cs = getComputedStyle(el);
    const props = cs.transitionProperty.split(',').map((p) => p.trim());
    const i = props.indexOf(prop);
    if (i < 0) return null;
    const pick = (list: string) => {
      const parts = list.split(/,(?![^(]*\))/).map((p) => p.trim());
      return parts[i % parts.length]!;
    };
    return { duration: pick(cs.transitionDuration), easing: pick(cs.transitionTimingFunction) };
  }, property);
}

/** One computed property (CSS name, custom properties included) of `target` or its `pseudo`-element. */
export function computedStyle(target: Locator, property: string, pseudo?: string): Promise<string> {
  return target.evaluate((el, [prop, p]) => getComputedStyle(el, p).getPropertyValue(prop), [
    property,
    pseudo ?? null,
  ] as const);
}

/** The outline that draws the focus indicator. */
export function outlineOf(target: Locator) {
  return target.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, color: cs.outlineColor };
  });
}

/** The CSS `translate` of `target` as [x, y] px (the sheets' drag offset). */
export function translateOf(target: Locator): Promise<[number, number]> {
  return target.evaluate((el) => {
    const t = getComputedStyle(el).translate;
    if (!t || t === 'none') return [0, 0];
    const [x = '0', y = '0'] = t.split(' ');
    return [parseFloat(x), parseFloat(y)];
  });
}
