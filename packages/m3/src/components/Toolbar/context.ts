import { createContext } from 'react';

export type ToolbarVariant = 'standard' | 'vibrant';

/**
 * Set by a toolbar: its icon buttons, toggle icon buttons and toggle buttons take the toolbar's
 * colours (Compose FloatingToolbarColors → LocalContentColor) and keep their shape when selected.
 */
export const ToolbarVariantContext = createContext<ToolbarVariant | null>(null);

/** Set around a toolbar's FAB: collapsed, the FAB grows from 56 to 80px (Compose FabSizeRange). */
export const ToolbarFabContext = createContext<{ collapsed: boolean } | null>(null);
