import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { MotionSchemeContext } from '../motion/context.tsx';
import type { MotionSchemeName } from '../motion/tokens.ts';
import { color } from '../tokens/color.stylex';
import { highContrastTheme, mediumContrastTheme } from '../tokens/color-themes';
import { expressiveMotionTheme, standardMotionTheme } from '../tokens/motion-themes';
import { PortalContainerContext } from './portal.tsx';
import { COLOR_ROLES, type DynamicColorScheme } from './colorRoles.ts';

export type ColorSchemeMode = 'light' | 'dark' | 'system';
/** Figma "M3" collection contrast modes. */
export type ContrastLevel = 'standard' | 'medium' | 'high';

const styles = stylex.create({
  root: {
    display: 'contents',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  },
  light: { colorScheme: 'light' },
  dark: { colorScheme: 'dark' },
  system: { colorScheme: 'light dark' },
});

const contrastThemes = {
  standard: null,
  medium: mediumContrastTheme,
  high: highContrastTheme,
} as const;

export interface M3ProviderProps {
  colorScheme?: ColorSchemeMode;
  contrast?: ContrastLevel;
  /**
   * A dynamic colour scheme: every colour role, light and dark — generate it from a seed colour
   * or an image with `@m3x/react/dynamic-color` (`useDynamicScheme`, `schemeFromSeed`,
   * `useSeedColorsFromImage`), Material You's "colour from wallpaper". The scheme carries its own
   * contrast, so `contrast` only selects the baseline's contrast themes. Omit it for the M3
   * baseline (Figma kit) colours.
   */
  colors?: DynamicColorScheme;
  /** Product-level motion scheme. Nest another provider to swap per subtree (M3 "level 3"). */
  motionScheme?: MotionSchemeName;
  children: ReactNode;
}

/** The CSS custom property behind a StyleX var reference (`var(--x1abc)` → `--x1abc`). */
const varName = (ref: string) => /^var\((--[^),\s]+)/.exec(ref)?.[1];

/** Inline custom properties that re-point every colour var at a dynamic scheme. */
function useSchemeStyle(colors: DynamicColorScheme | undefined) {
  return useMemo(() => {
    if (colors == null) return undefined;
    const style: Record<string, string> = {};
    for (const role of COLOR_ROLES) {
      const name = varName(color[role]);
      if (name) style[name] = `light-dark(${colors[role].light}, ${colors[role].dark})`;
    }
    return style as CSSProperties;
  }, [colors]);
}

export function M3Provider({
  colorScheme = 'system',
  contrast = 'standard',
  colors,
  motionScheme = 'expressive',
  children,
}: M3ProviderProps) {
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const seeded = useSchemeStyle(colors);
  return (
    <MotionSchemeContext value={motionScheme}>
      <div
        {...stylex.props(
          styles.root,
          styles[colorScheme],
          // A dynamic scheme carries its own contrast; the kit's contrast themes are for the baseline.
          !seeded && contrastThemes[contrast],
          motionScheme === 'standard' ? standardMotionTheme : expressiveMotionTheme,
        )}
        style={seeded}
      >
        <PortalContainerContext value={portal}>{children}</PortalContainerContext>
        {/* Popups render here, inside the themed root. */}
        <div ref={setPortal} data-m3-portal="" />
      </div>
    </MotionSchemeContext>
  );
}
