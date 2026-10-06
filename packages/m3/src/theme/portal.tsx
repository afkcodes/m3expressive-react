import { createContext, useContext } from 'react';

/**
 * The element popups portal into. It sits inside <M3Provider>'s root, so menus, tooltips and
 * snackbars inherit the provider's colour scheme, contrast and motion themes (a portal to
 * <body> would escape them). `null` outside a provider: popups fall back to <body>.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export const usePortalContainer = () => useContext(PortalContainerContext) ?? undefined;
