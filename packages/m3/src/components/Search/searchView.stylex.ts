import * as stylex from '@stylexjs/stylex';

export const searchViewVars = stylex.defineVars({
  /**
   * The full-screen view's surface. The kit's full-screen layout has no fill (it sits on the
   * screen), so this defaults to transparent; set it (e.g. Surface) when the view covers content —
   * it fades in with the expand progress (Compose contained search bar: surface alpha = progress).
   */
  containerColor: 'transparent',
});
