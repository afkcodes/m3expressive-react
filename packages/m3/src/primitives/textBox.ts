import * as stylex from '@stylexjs/stylex';
import { typeMetrics } from '../tokens/typeMetrics.stylex';

/**
 * Figma text-box geometry for hug ("auto width") text.
 *
 * Figma sizes an auto-width text node as ceil(advance width − trailing letter
 * spacing); CSS includes the trailing spacing and never rounds. Verified on all
 * 30 M3 text styles in the kit. Every hugging layout (button, chip, tab…) depends on this,
 * so labels must use `textBox.hug`.
 *
 * Needs calc-size() (Chromium 129+). Elsewhere it falls back to fit-content,
 * which can be up to 1px off Figma.
 */
export const textBox = stylex.create({
  hug: {
    whiteSpace: 'nowrap',
    flexShrink: 0,
    width: {
      default: 'fit-content',
      '@supports (width: calc-size(fit-content, size))': `calc-size(fit-content, round(up, size - ${typeMetrics.tracking}, 1px))`,
    },
  },
});

/**
 * Figma's legacy line height (older text layers in the kit, e.g. snackbar and list supporting
 * text): the first baseline sits at ascent × size instead of half-leading + ascent, so glyphs
 * render higher than in CSS. Measured from the kit's glyph outlines (14/20 → baseline 13.0 vs
 * 14.83 in CSS with our Roboto metrics). Shifts the text without changing layout.
 */
const ASCENT_CSS = 0.9832; // fonts.css ascent-override
const DESCENT_CSS = 0.2941; // fonts.css descent-override
const ASCENT_FIGMA = 0.927734; // Roboto hhea ascender (1900 / 2048)
export const legacyLeading = stylex.create({
  shift: (fontSize: number, lineHeight: number) => ({
    position: 'relative',
    top: `${-((lineHeight - (ASCENT_CSS + DESCENT_CSS) * fontSize) / 2 + (ASCENT_CSS - ASCENT_FIGMA) * fontSize)}px`,
  }),
});
