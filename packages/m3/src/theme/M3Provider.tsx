import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { MotionSchemeContext } from '../motion/context.tsx';
import type { MotionSchemeName } from '../motion/tokens.ts';
import { highContrastTheme, mediumContrastTheme } from '../tokens/color-themes';
import { expressiveMotionTheme, standardMotionTheme } from '../tokens/motion-themes';
import { PortalContainerContext } from './portal.tsx';

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
  /** Product-level motion scheme. Nest another provider to swap per subtree (M3 "level 3"). */
  motionScheme?: MotionSchemeName;
  children: ReactNode;
}

export function M3Provider({
  colorScheme = 'system',
  contrast = 'standard',
  motionScheme = 'expressive',
  children,
}: M3ProviderProps) {
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  return (
    <MotionSchemeContext value={motionScheme}>
      <div
        {...stylex.props(
          styles.root,
          styles[colorScheme],
          contrastThemes[contrast],
          motionScheme === 'standard' ? standardMotionTheme : expressiveMotionTheme,
        )}
      >
        <PortalContainerContext value={portal}>{children}</PortalContainerContext>
        {/* Popups render here, inside the themed root. */}
        <div ref={setPortal} data-m3-portal="" />
      </div>
    </MotionSchemeContext>
  );
}
