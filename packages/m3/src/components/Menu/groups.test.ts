import { createElement, Fragment } from 'react';
import { describe, expect, test } from 'vitest';
import { countGroupElements, flattenChildren, isGroupElement, MENU_GROUP } from './groups.ts';

const Group = Object.assign(() => null, { [MENU_GROUP]: true });
const Item = () => null;
const Wrapper = () => null;

describe('menu group detection', () => {
  test('marked components are groups; items, wrappers and host elements are not', () => {
    expect(isGroupElement(createElement(Group))).toBe(true);
    expect(isGroupElement(createElement(Item))).toBe(false);
    expect(isGroupElement(createElement(Wrapper))).toBe(false);
    expect(isGroupElement(createElement('div'))).toBe(false);
    expect(isGroupElement('text')).toBe(false);
  });
  test('fragments are looked through; empty children are dropped', () => {
    const children = [
      createElement(Fragment, { key: 'f' }, createElement(Group), createElement(Group)),
      false,
      null,
      createElement(Group, { key: 'g' }),
    ];
    expect(flattenChildren(children)).toHaveLength(3);
    expect(countGroupElements(children)).toBe(3);
  });
  test('loose items count no groups', () => {
    expect(countGroupElements([createElement(Item, { key: 1 }), createElement(Item, { key: 2 })])).toBe(0);
  });
});
