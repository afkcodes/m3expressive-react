export { M3Provider } from './theme/M3Provider.tsx';
export type { M3ProviderProps, ColorSchemeMode, ContrastLevel } from './theme/M3Provider.tsx';
export { defaultLabels, useLabels } from './theme/labels.tsx';
export type { M3Labels } from './theme/labels.tsx';
// Dynamic colour scheme generation lives in '@m3x/react/dynamic-color'; the core only knows the roles.
export { COLOR_ROLES } from './theme/colorRoles.ts';
export type { ColorRole, DynamicColorScheme, RoleColors } from './theme/colorRoles.ts';
// Interaction primitives: '@m3x/react/primitives'; the shape engine: '@m3x/react/shapes'.
export { typescale } from './tokens/typescale.ts';
export type { TypescaleRole } from './tokens/typescale.ts';
export { Shape } from './shapes/Shape.tsx';
export type { ShapeProps } from './shapes/Shape.tsx';
export type { ShapeName } from './shapes/figmaPaths.ts';
export { Button } from './components/Button/index.ts';
export type { ButtonProps, ButtonVariant, ButtonSize, ButtonShape } from './components/Button/index.ts';
export { materialShapes } from './shapes/materialShapes.ts';
export type { MaterialShapeName } from './shapes/materialShapes.ts';
export { MorphingShape } from './shapes/MorphingShape.tsx';
export type { MorphingShapeProps } from './shapes/MorphingShape.tsx';
export { Badge } from './components/Badge/index.ts';
export type { BadgeProps } from './components/Badge/index.ts';
export {
  Card,
  CardHeader,
  CardMedia,
  CardContent,
  CardHeadline,
  CardText,
  CardActions,
} from './components/Card/index.ts';
export type {
  CardHeaderProps,
  CardMediaProps,
  CardContentProps,
  CardHeadlineProps,
  CardTextProps,
  CardActionsProps,
} from './components/Card/index.ts';
export type { CardProps, CardVariant } from './components/Card/index.ts';
export { IconButton } from './components/IconButton/index.ts';
export type { IconButtonProps, IconButtonVariant, IconButtonWidth } from './components/IconButton/index.ts';
export { Avatar } from './components/Avatar/index.ts';
export type { AvatarProps } from './components/Avatar/index.ts';
export { Checkbox } from './components/Checkbox/index.ts';
export type { CheckboxProps } from './components/Checkbox/index.ts';
export { ToggleButton } from './components/ToggleButton/index.ts';
export type { ToggleButtonProps, ToggleButtonVariant } from './components/ToggleButton/index.ts';
export { ToggleIconButton } from './components/ToggleIconButton/index.ts';
export type { ToggleIconButtonProps } from './components/ToggleIconButton/index.ts';
export { SplitButton, SplitButtonLeading, SplitButtonTrailing } from './components/SplitButton/index.ts';
export { Fab, ExtendedFab } from './components/Fab/index.ts';
export { FabMenu, FabMenuItem } from './components/FabMenu/index.ts';
export { ButtonGroup, ConnectedButtonGroup, ConnectedButtonGroupItem } from './components/ButtonGroup/index.ts';
export { SegmentedButton, SegmentedButtonItem } from './components/SegmentedButton/index.ts';
export { Radio, RadioGroup } from './components/Radio/index.ts';
export { Switch } from './components/Switch/index.ts';
export { Divider } from './components/Divider/index.ts';
export { Snackbar, SnackbarAction, SnackbarClose, SnackbarProvider, useSnackbar } from './components/Snackbar/index.ts';
export type {
  SnackbarProps,
  SnackbarActionProps,
  SnackbarCloseProps,
  SnackbarProviderProps,
  ShowSnackbarOptions,
  SnackbarDuration,
} from './components/Snackbar/index.ts';
export { Tooltip, RichTooltip, PlainTooltipSurface, RichTooltipSurface } from './components/Tooltip/index.ts';
export type {
  TooltipProps,
  RichTooltipProps,
  PlainTooltipSurfaceProps,
  RichTooltipSurfaceProps,
} from './components/Tooltip/index.ts';
export {
  AssistChip,
  FilterChip,
  InputChip,
  SuggestionChip,
  ChipAvatarPlaceholder,
  ChipGroup,
} from './components/Chip/index.ts';
export { LinearProgress, CircularProgress, LoadingIndicator } from './components/Progress/index.ts';
export { Slider, RangeSlider } from './components/Slider/index.ts';
export { TextField } from './components/TextField/index.ts';
export {
  List,
  ListItem,
  ListItemImage,
  ListItemVideo,
  ListItemMonogram,
  ExpandableListItem,
  AccordionButton,
  SwipeableListItem,
  SwipeActions,
  swipeLayout,
  swipeOffset,
} from './components/List/index.ts';
export type {
  ListProps,
  ListItemProps,
  ListItemVariant,
  ExpandableListItemProps,
  AccordionButtonProps,
  SwipeableListItemProps,
  SwipeActionsProps,
  SwipeAction,
  SwipeRevealState,
} from './components/List/index.ts';
export {
  Menu,
  MenuCheckboxItem,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuScope,
  MenuSectionLabel,
  MenuSurface,
  Submenu,
} from './components/Menu/index.ts';
export type {
  MenuCheckboxItemProps,
  MenuDensity,
  MenuGroupProps,
  MenuItemProps,
  MenuProps,
  MenuRadioGroupProps,
  MenuRadioItemProps,
  MenuSurfaceProps,
  MenuVariant,
  SubmenuProps,
} from './components/Menu/index.ts';
export { Tab, TabPanel, Tabs, TabScope } from './components/Tabs/index.ts';
export type { TabProps, TabsProps, TabsVariant } from './components/Tabs/index.ts';
export {
  NavigationBar,
  NavigationItem,
  NavigationRail,
  NavigationRailSection,
  NavigationScope,
} from './components/Navigation/index.ts';
export type {
  NavigationBarProps,
  NavigationItemLayout,
  NavigationItemProps,
  NavigationRailProps,
  NavigationRailSectionProps,
} from './components/Navigation/index.ts';
export { AppBarTitle, BottomAppBar, TopAppBar, useAppBarScroll } from './components/AppBar/index.ts';
export type { AppBarTitleProps, BottomAppBarProps, TopAppBarProps, TopAppBarSize } from './components/AppBar/index.ts';
export { SearchBar, SearchView } from './components/Search/index.ts';
export type { SearchBarProps, SearchViewProps } from './components/Search/index.ts';
export {
  Toolbar,
  ToolbarScope,
  useFloatingToolbarExitAlways,
  useFloatingToolbarNestedScroll,
} from './components/Toolbar/index.ts';
export type {
  ToolbarColor,
  ToolbarProps,
  FloatingToolbarExitDirection,
  FloatingToolbarNestedScrollOptions,
} from './components/Toolbar/index.ts';
export { BottomSheet, ModalBottomSheet, ModalSideSheet, SideSheet } from './components/Sheet/index.ts';
export type {
  BottomSheetProps,
  ModalBottomSheetProps,
  ModalSideSheetProps,
  SideSheetProps,
} from './components/Sheet/index.ts';
export { Dialog, DialogSurface } from './components/Dialog/index.ts';
export type { DialogProps, DialogSurfaceProps } from './components/Dialog/index.ts';
export { Carousel, CarouselItem } from './components/Carousel/index.ts';
export type { CarouselItemProps, CarouselLayout, CarouselProps } from './components/Carousel/index.ts';
export * from './components/DatePicker/index.ts';
export { ModalTimePicker, TimeInput, TimePicker, normalizeTime } from './components/TimePicker/index.ts';
export type {
  ModalTimePickerProps,
  Time,
  TimeInputProps,
  TimePickerProps,
  TimePickerSelection,
} from './components/TimePicker/index.ts';
export type { TextFieldProps, TextFieldVariant } from './components/TextField/index.ts';
export type { SliderProps, RangeSliderProps, SliderSize, SliderOrientation } from './components/Slider/index.ts';
export type {
  LinearProgressProps,
  CircularProgressProps,
  LoadingIndicatorProps,
  ProgressType,
  ProgressThickness,
} from './components/Progress/index.ts';
export type {
  AssistChipProps,
  FilterChipProps,
  InputChipProps,
  SuggestionChipProps,
  ChipGroupProps,
} from './components/Chip/index.ts';
export type { DividerProps, DividerInset } from './components/Divider/index.ts';
export type { SwitchProps } from './components/Switch/index.ts';
export type { RadioProps, RadioGroupProps } from './components/Radio/index.ts';
export type {
  SegmentedButtonProps,
  SegmentedButtonItemProps,
  SegmentedButtonDensity,
} from './components/SegmentedButton/index.ts';
export type {
  ButtonGroupProps,
  ConnectedButtonGroupProps,
  ConnectedButtonGroupItemProps,
} from './components/ButtonGroup/index.ts';
export type { FabMenuProps, FabMenuItemProps, FabMenuColor } from './components/FabMenu/index.ts';
export type { FabProps, ExtendedFabProps, FabColor, FabSize, ExtendedFabSize } from './components/Fab/index.ts';
export type {
  SplitButtonProps,
  SplitButtonLeadingProps,
  SplitButtonTrailingProps,
  SplitButtonVariant,
} from './components/SplitButton/index.ts';
