/*
 * The 49 M3 colour roles (`color.stylex.ts`), and the shape of a generated scheme — kept free of
 * material-color-utilities so the core entry stays small. Generate schemes with
 * `@m3x/react/dynamic-color` and apply them with `<M3Provider colors>`.
 */

/** The colour roles of `color.stylex.ts`, named as in MaterialDynamicColors. */
export const COLOR_ROLES = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'background', 'onBackground', 'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'outline', 'outlineVariant', 'surfaceTint', 'shadow', 'scrim',
  'inverseSurface', 'inverseOnSurface', 'inversePrimary',
  'primaryFixed', 'onPrimaryFixed', 'primaryFixedDim', 'onPrimaryFixedVariant',
  'secondaryFixed', 'onSecondaryFixed', 'secondaryFixedDim', 'onSecondaryFixedVariant',
  'tertiaryFixed', 'onTertiaryFixed', 'tertiaryFixedDim', 'onTertiaryFixedVariant',
  'surfaceDim', 'surfaceBright',
  'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest',
] as const;

export type ColorRole = (typeof COLOR_ROLES)[number];

/** One role's light and dark values (#RRGGBB). */
export interface RoleColors {
  light: string;
  dark: string;
}

export type DynamicColorScheme = Record<ColorRole, RoleColors>;
