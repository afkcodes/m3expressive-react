import { createContext } from 'react';

/**
 * Set by containers that list items sit on directly (a dialog's content): baseline items drop
 * their Surface fill and show the container (the kit's list dialogs).
 */
export const InheritSurfaceContext = createContext(false);
