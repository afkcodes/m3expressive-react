/**
 * @m3x/react/dynamic-color — M3 dynamic colour (Material You): generate the full colour scheme
 * from a seed colour or an image, then apply it with `<M3Provider colors>`. A separate entry so
 * material-color-utilities only loads in apps that use it.
 */
export {
  COLOR_ROLES,
  schemeFromSeed,
  seedColorsFromImage,
  seedColorsFromPixels,
  type ColorRole,
  type DynamicColorScheme,
  type DynamicSchemeOptions,
  type ImageSeedOptions,
  type ImageSeedSource,
  type RoleColors,
  type SchemeContrast,
  type SchemeVariant,
} from './theme/dynamicColor.ts';
export { useDynamicScheme, useSeedColorsFromImage, type ImageSeedState } from './theme/useDynamicColor.ts';
