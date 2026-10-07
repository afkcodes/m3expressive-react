import * as stylex from '@stylexjs/stylex';

const s = stylex.create({
  icon: (size: number, filled: boolean) => ({
    fontSize: size,
    width: size,
    height: size,
    lineHeight: 1,
    display: 'inline-block',
    flexShrink: 0,
    overflow: 'hidden',
    userSelect: 'none',
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
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
  const { className, style } = stylex.props(s.icon(size, filled));
  return (
    <span aria-hidden className={`material-symbols-rounded ${className ?? ''}`} style={style}>
      {name}
    </span>
  );
}
