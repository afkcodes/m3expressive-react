import { Children, Fragment, isValidElement, type ReactNode } from 'react';

/**
 * Marks a component that renders a menu group (MenuGroup, MenuRadioGroup). An expressive menu's
 * loose items are wrapped in one implicit group; marked children are counted as groups instead.
 * Groups inside wrapper components are found at runtime (they register with the menu), so the
 * marker only spares those menus a corrective render.
 */
export const MENU_GROUP = Symbol.for('@m3x/react/menu-group');

/** Whether `node` is an element of a marked group component. */
export function isGroupElement(node: ReactNode): boolean {
  if (!isValidElement(node) || typeof node.type === 'string') return false;
  return (node.type as unknown as Record<symbol, unknown>)[MENU_GROUP] === true;
}

/** Children with fragments flattened (Children.toArray keeps a fragment as one child). */
export function flattenChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? flattenChildren(child.props.children)
      : [child],
  );
}

/** Number of marked groups among `children` (fragments looked through). */
export function countGroupElements(children: ReactNode): number {
  return flattenChildren(children).filter(isGroupElement).length;
}
