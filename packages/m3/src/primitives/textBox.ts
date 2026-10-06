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
