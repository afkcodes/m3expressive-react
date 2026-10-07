export { ForceState, ForceStateBoundary, useForcedState } from './ForceState.tsx';
export type { ForcedState, ForceStateValue, ForcedProgressFrame, ForcedPosition } from './ForceState.tsx';

// Static building blocks the kit's state sheets draw outside their containers (docs/API-CONVENTIONS.md §7).
// One section per component family, so additions don't collide.

// — Actions, bars, communication (buttons, chips, toolbar, tabs, search, snackbar…)
export { ConnectedButtonGroupScope } from '../components/ButtonGroup/ConnectedButtonGroup.tsx';
export { ChipAvatarPlaceholder } from '../components/Chip/InputChip.tsx';
export { TabScope } from '../components/Tabs/Tab.tsx';
export { ToolbarScope } from '../components/Toolbar/Toolbar.tsx';

// — Lists, menus, navigation, surfaces

// — Selection, pickers, inputs, media
