import { useCallback, useState } from 'react';

/**
 * Controlled / uncontrolled state with one rule everywhere: a prop is controlled when it is not
 * `undefined` (so `null` is a valid controlled value — e.g. "no date selected"), as in Base UI.
 *
 * Returns the current value and a setter that updates the internal state when uncontrolled and
 * always notifies `onChange` (extra arguments such as Base UI event details are passed through).
 *
 * @example
 * const [checked, setChecked] = useControllableState(props.checked, props.defaultChecked ?? false, props.onCheckedChange);
 */
export function useControllableState<T, Args extends unknown[] = []>(
  value: T | undefined,
  defaultValue: T | (() => T),
  onChange?: (next: T, ...args: Args) => void,
): readonly [T, (next: T, ...args: Args) => void] {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;

  const setValue = useCallback(
    (next: T, ...args: Args) => {
      if (!controlled) setInner(() => next);
      onChange?.(next, ...args);
    },
    [controlled, onChange],
  );

  return [current, setValue] as const;
}
