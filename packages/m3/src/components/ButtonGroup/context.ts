import { createContext } from 'react';

/**
 * Set by a standard ButtonGroup. Icon buttons inside it keep their 48px touch target as an
 * overlay instead of a layout width (the kit's grouped XS icon buttons are 40px wide; the
 * group's gap and padding hold the touch area).
 */
export const ButtonGroupContext = createContext<{ inGroup: boolean }>({ inGroup: false });
