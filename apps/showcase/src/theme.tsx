import { createContext, use, useMemo, useState, type ReactNode } from 'react';
import { M3Provider, type ColorSchemeMode, type ContrastLevel } from '@m3x/react';
import { useDynamicScheme, type SchemeVariant } from '@m3x/react/dynamic-color';

export type MotionSchemeName = 'expressive' | 'standard';

export interface ThemeSettings {
  mode: ColorSchemeMode;
  contrast: ContrastLevel;
  /** Seed colour for a dynamic scheme; null = the M3 baseline (the Figma kit's colours). */
  seed: string | null;
  variant: SchemeVariant;
  motion: MotionSchemeName;
}

const DEFAULTS: ThemeSettings = {
  mode: 'system',
  contrast: 'standard',
  seed: null,
  variant: 'tonal-spot',
  motion: 'expressive',
};

interface ThemeApi {
  settings: ThemeSettings;
  update: (patch: Partial<ThemeSettings>) => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);

export function useTheme(): ThemeApi {
  const api = use(ThemeContext);
  if (!api) throw new Error('useTheme outside <ThemeRoot>');
  return api;
}

/** Holds the showcase's theme settings and applies them through `<M3Provider>`. */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const colors = useDynamicScheme(settings.seed, { variant: settings.variant, contrast: settings.contrast });
  const api = useMemo<ThemeApi>(
    () => ({ settings, update: (patch) => setSettings((current) => ({ ...current, ...patch })) }),
    [settings],
  );
  return (
    <ThemeContext value={api}>
      <M3Provider
        colorScheme={settings.mode}
        contrast={settings.contrast}
        colors={colors}
        motionScheme={settings.motion}
      >
        {children}
      </M3Provider>
    </ThemeContext>
  );
}
