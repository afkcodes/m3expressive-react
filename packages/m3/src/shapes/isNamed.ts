/** An `aria-label` / `aria-labelledby` names a shape (`role="img"`); without one it is decorative. */
export const isNamed = (props: { 'aria-label'?: string; 'aria-labelledby'?: string }) =>
  props['aria-label'] != null || props['aria-labelledby'] != null;
