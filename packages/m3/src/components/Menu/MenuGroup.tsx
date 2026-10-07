import { useCallback, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { GroupCountContext, GroupRegistryContext, MenuContext, type MenuVariant } from './context.ts';
import { countGroupElements, MENU_GROUP } from './groups.ts';

/* Expressive menu groups and section labels — kit geometry and motion in ./Menu.tsx. */
const s = stylex.create({
  // The menu's shadow is cast by the union of its groups (the 2px gaps show it, as in the kit):
  // every group draws its shadow on a layer below all of them.
  group: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    paddingBlock: 2,
    borderTopLeftRadius: { default: 8, ':first-child': 16 },
    borderTopRightRadius: { default: 8, ':first-child': 16 },
    borderBottomLeftRadius: { default: 8, ':last-child': 16 },
    borderBottomRightRadius: { default: 8, ':last-child': 16 },
    transitionProperty: 'border-radius',
    transitionDuration: motion.fastSpatialDuration,
    transitionTimingFunction: motion.fastSpatialEasing,
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      zIndex: -1,
      borderRadius: 'inherit',
      boxShadow: elevation.level3NoSpread,
      pointerEvents: 'none',
    },
  },
  // Figma draws the menu's level-3 shadow with its 3px spread only when the menu is one group.
  groupSolo: { '::before': { boxShadow: elevation.level3 } },
  groupInactive: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  groupStandard: { backgroundColor: color.surfaceContainerLow },
  groupVibrant: { backgroundColor: color.tertiaryContainer },
  // Kit "Label-basic": a 26px text box 6px from the top with its 20px line centred (line at y 9).
  sectionLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    height: 32,
    paddingTop: 9,
    paddingInline: 16,
    margin: 0,
    color: color.onSurfaceVariant,
  },
  sectionLabelVibrant: { color: color.onTertiaryContainer },
});

/**
 * Wraps loose items of an expressive menu in a single group (a menu is always ≥ 1 group). Groups
 * among the children (fragments looked through) are known at once; groups rendered by wrapper
 * components register on mount, and the implicit group then steps aside (before paint).
 */
export function Grouped({ variant, children }: { variant: MenuVariant; children: ReactNode }) {
  const [registered, setRegistered] = useState(0);
  const register = useCallback(() => {
    setRegistered((n) => n + 1);
    return () => setRegistered((n) => n - 1);
  }, []);
  if (variant === 'baseline') return children;
  const groups = Math.max(countGroupElements(children), registered);
  return (
    <GroupRegistryContext value={register}>
      {groups > 0 ? (
        <GroupCountContext value={groups}>{children}</GroupCountContext>
      ) : (
        <GroupCountContext value={1}>
          <GroupFrame implicit>{children}</GroupFrame>
        </GroupCountContext>
      )}
    </GroupRegistryContext>
  );
}

/** A real group counts itself in its menu (see Grouped). */
function useRegisterGroup(enabled: boolean) {
  const register = useContext(GroupRegistryContext);
  useLayoutEffect(() => (enabled && register ? register() : undefined), [enabled, register]);
}

/** A group's section label (kit "Label-basic" / "Label-vibrant"): 32px, label-large. */
export function MenuSectionLabel({ children, sx }: { children: ReactNode; sx?: StyleXStyles }) {
  const { variant, live } = useContext(MenuContext);
  const labelProps = stylex.props(
    typescale.labelLarge,
    s.sectionLabel,
    variant === 'vibrant' && s.sectionLabelVibrant,
    sx,
  );
  return live ? (
    <BaseMenu.GroupLabel {...labelProps}>{children}</BaseMenu.GroupLabel>
  ) : (
    <div {...labelProps}>{children}</div>
  );
}

// ── Group ─────────────────────────────────────────────────────────────────────────────────────

export interface MenuGroupProps {
  /** Section label shown above the group's items. */
  label?: ReactNode;
  children: ReactNode;
  sx?: StyleXStyles;
}

/** Group container props + label, shared by MenuGroup and MenuRadioGroup. */
function useGroup(label: ReactNode, sx: StyleXStyles | undefined) {
  const { variant, live } = useContext(MenuContext);
  const solo = useContext(GroupCountContext) === 1;
  // Compose DropdownMenuGroup: once hovered and left, the group settles on its inactive shape.
  const [hovered, setHovered] = useState(false);
  const [hasBeenHovered, setHasBeenHovered] = useState(false);
  const labelEl = label != null && <MenuSectionLabel>{label}</MenuSectionLabel>;
  const props = {
    onPointerEnter: () => {
      setHovered(true);
      setHasBeenHovered(true);
    },
    onPointerLeave: () => setHovered(false),
    ...stylex.props(
      s.group,
      solo && s.groupSolo,
      variant === 'vibrant' ? s.groupVibrant : s.groupStandard,
      hasBeenHovered && !hovered && s.groupInactive,
      sx,
    ),
  };
  return { variant, live, labelEl, props };
}

/** A group's frame; `implicit`: the group a menu wraps loose items in (not counted as a group). */
function GroupFrame({ label, children, sx, implicit = false }: MenuGroupProps & { implicit?: boolean }) {
  const { variant, live, labelEl, props } = useGroup(label, sx);
  useRegisterGroup(!implicit);
  if (variant === 'baseline') return <>{children}</>;
  // Groups inside a group aren't the menu's groups; the implicit one lets wrapped groups through.
  const content = implicit ? children : <GroupRegistryContext value={null}>{children}</GroupRegistryContext>;
  if (live) {
    return (
      <BaseMenu.Group {...props}>
        {labelEl}
        {content}
      </BaseMenu.Group>
    );
  }
  return (
    <div role="group" {...props}>
      {labelEl}
      {content}
    </div>
  );
}

/** A segment of an expressive menu (baseline menus render their items directly). */
export function MenuGroup(props: MenuGroupProps) {
  return <GroupFrame {...props} />;
}
(MenuGroup as unknown as Record<symbol, boolean>)[MENU_GROUP] = true;

export interface MenuRadioGroupProps extends MenuGroupProps {
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: (value: unknown) => void;
}

/** Single-choice options (`MenuRadioItem`); renders as a menu group. */
export function MenuRadioGroup({ value, defaultValue, onValueChange, label, children, sx }: MenuRadioGroupProps) {
  const { variant, live, labelEl, props } = useGroup(label, sx);
  useRegisterGroup(true);
  const content = <GroupRegistryContext value={null}>{children}</GroupRegistryContext>;
  if (!live)
    return variant === 'baseline' ? (
      <>{children}</>
    ) : (
      <div role="group" {...props}>
        {labelEl}
        {content}
      </div>
    );
  return (
    <BaseMenu.RadioGroup
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (v) => onValueChange(v) : undefined}
      {...(variant === 'baseline' ? {} : props)}
    >
      {labelEl}
      {content}
    </BaseMenu.RadioGroup>
  );
}
(MenuRadioGroup as unknown as Record<symbol, boolean>)[MENU_GROUP] = true;
