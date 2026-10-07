import { createContext } from 'react';

/**
 * Set by a standard ButtonGroup. Icon buttons inside it keep their 48px touch target as an
 * overlay instead of a layout width (the kit's grouped XS icon buttons are 40px wide; the
 * group's gap and padding hold the touch area).
 */
export const ButtonGroupContext = createContext<{ inGroup: boolean }>({ inGroup: false });

/**
 * Marks the visual box of a button inside a standard ButtonGroup (the element the group resizes
 * while a neighbour is pressed). The value is the item's compression limit in px — Compose
 * `animateWidth(…, compressionLimit)`: the end content padding of buttons, and
 * `ButtonDefaults.ContentPadding` end (24dp) for icon buttons (Compose's default).
 */
export const GROUP_BOX_ATTR = 'data-m3-group-box';
