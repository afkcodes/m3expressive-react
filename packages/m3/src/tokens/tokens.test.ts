import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadSnapshot, render, tokensDir } from '../../../../scripts/gen-tokens.ts';

describe('Figma tokens', () => {
  const files = render(loadSnapshot());

  it.each(Object.keys(files))('%s is in sync with figma/_tokens/foundations.json (run `pnpm gen:tokens`)', (file) => {
    expect(readFileSync(tokensDir + file, 'utf8')).toBe(files[file]);
  });

  it('covers all 49 Figma colour roles in every contrast level', () => {
    const roles = Object.keys(loadSnapshot().schemes).length;
    expect(roles).toBe(49);
    expect(files['color.stylex.ts']!.match(/^ {2}\w+: '/gm)).toHaveLength(roles);
    expect(files['color-themes.ts']!.match(/^ {2}\w+: '/gm)).toHaveLength(roles * 2);
  });
});
