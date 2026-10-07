import { useMemo, useState } from 'react';
import { makeDate } from './calendar.ts';

/**
 * Today's date (local midnight) for a picker: the `today` prop, else the date when the picker
 * mounted. Read once (not on every render) so renders stay pure; the result keeps its identity
 * while the day is the same, even when `today` is passed as a new Date each render.
 */
export function useToday(today?: Date): Date {
  const [mounted] = useState(() => new Date());
  const t = today ?? mounted;
  const [y, m, d] = [t.getFullYear(), t.getMonth(), t.getDate()];
  return useMemo(() => makeDate(y, m, d), [y, m, d]);
}
