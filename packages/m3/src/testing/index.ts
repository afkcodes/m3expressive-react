export { ForceState, ForceStateBoundary, useForcedState } from './ForceState.tsx';
export type { ForcedState, ForceStateValue, ForcedProgressFrame, ForcedPosition } from './ForceState.tsx';

// Static building blocks the kit's state sheets draw outside their containers (docs/API-CONVENTIONS.md §7).
// One section per component family, so additions don't collide.

// — Actions, bars, communication (buttons, chips, toolbar, tabs, search, snackbar…)

// — Lists, menus, navigation, surfaces
export { SwipeActions } from '../components/List/SwipeActions.tsx';
export type { SwipeActionsProps } from '../components/List/SwipeActions.tsx';
export { swipeOffset } from '../components/List/swipeGeometry.ts';
export { MenuScope } from '../components/Menu/Menu.tsx';
export type { MenuScopeProps } from '../components/Menu/Menu.tsx';
export { NavigationScope } from '../components/Navigation/NavigationItem.tsx';
export type { NavigationScopeProps } from '../components/Navigation/NavigationItem.tsx';

// — Selection, pickers, inputs, media
