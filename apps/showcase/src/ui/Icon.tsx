import * as stylex from '@stylexjs/stylex';

/*
 * Material Symbols (Rounded) ligatures. global.css imports the package's stylesheet for its
 * @font-face only: its `.material-symbols-rounded` class is unlayered and would beat these
 * (layered) StyleX styles — every icon would render at its fixed 24px.
 */
const s = stylex.create({
  icon: (size: number, filled: boolean) => ({
    fontFamily: '"Material Symbols Rounded"',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontSize: size,
    width: size,
    height: size,
    lineHeight: 1,
    letterSpacing: 'normal',
    textTransform: 'none',
    display: 'inline-block',
    flexShrink: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    overflowWrap: 'normal',
    direction: 'ltr',
    userSelect: 'none',
    WebkitFontSmoothing: 'antialiased',
    fontFeatureSettings: '"liga"',
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`,
  }),
});

export interface IconProps {
  /** A Material Symbols name, e.g. `home`, `favorite`, `settings`. */
  name: string;
  size?: number;
  filled?: boolean;
}

/** Material Symbols (Rounded) glyph, decorative: the control it sits in carries the name. */
export function Icon({ name, size = 24, filled = false }: IconProps) {
  return (
    <span aria-hidden {...stylex.props(s.icon(size, filled))}>
      {name}
    </span>
  );
}
