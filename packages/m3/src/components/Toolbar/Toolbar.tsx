import { useLayoutEffect, useRef, useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { ToolbarVariantContext, ToolbarFabContext, type ToolbarVariant } from './context.ts';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import { useRovingTabStop } from '../../hooks/useRovingTabStop.ts';
import type { SxProps } from '../../primitives/types.ts';

/*
 * Figma kit, "Toolbars" page (Toolbar set 58467:8206; Compose HorizontalFloatingToolbar /
 * VerticalFloatingToolbar / FlexibleBottomAppBar).
 *   Floating: ≥ 64px, fully rounded, 8px padding, 4px between items, Surface Container (standard) / Primary Container (vibrant), elevation 3 (the frame
 *   doesn't clip, so Figma drops the spread). Docked: full width, 64px, 16px padding, items
 *   spaced between (Compose FlexibleHorizontalArrangement), no shape or shadow.
 *   Items are the regular icon buttons / toggles; the toolbar recolours them (context).
 * Motion (Compose FloatingToolbarDefaults.animationSpec = FastSpatial): collapsing shrinks the
 * leading / trailing content away (expandHorizontally / shrinkHorizontally); horizontal leading
 * content enters from the start and leaves towards the end, trailing content enters from the end
 * and leaves towards the start; vertical leading content is anchored at the bottom, trailing at
 * the top (FloatingToolbar.kt AnimatedVisibility specs). With a FAB the whole toolbar shrinks into
 * the 8px-spaced FAB, which grows from 56 to 80px (FabSizeRange). Scroll-driven collapse:
 * useFloatingToolbarNestedScroll / useFloatingToolbarExitAlways (./scrollBehavior.ts).
 * Compose also balances the main content's padding when leading / trailing content hides
 * (minimumInteractiveBalancedPadding); that needs items with asymmetric touch-target insets
 * (alignment lines), which our items don't expose — for the kit's square 48px targets it adds 0.
 */
/** ToolbarFabContext values (module constants: the context changes only with `expanded`). */
const FAB_EXPANDED = { collapsed: false };
const FAB_COLLAPSED = { collapsed: true };
/** Compose: the toolbar and its FAB sit 8px apart; the FAB is 56px at rest (FabSizeRange start). */
const FAB_GAP = 8;
const FAB_SIZE = 56;

const s = stylex.create({
  root: {
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    color: color.onSurfaceVariant,
    backgroundColor: color.surfaceContainer,
  },
  vibrant: { color: color.onPrimaryContainer, backgroundColor: color.primaryContainer },
  // Compose ContentPadding (8 all round) with a 64px minimum: 48px items make the kit's 64px bar
  // (the kit's 12px cross-axis padding overflows its fixed 64px height by the same amount).
  floating: {
    minHeight: 64,
    padding: 8,
    borderRadius: 32,
    boxShadow: elevation.level3NoSpread,
  },
  floatingVertical: { flexDirection: 'column', minHeight: 0, minWidth: 64 },
  docked: {
    width: '100%',
    height: 64,
    paddingBlock: 12,
    paddingInline: 16,
    columnGap: 8,
    justifyContent: 'space-between',
  },
  group: { display: 'flex', alignItems: 'center', columnGap: 4, rowGap: 4 },
  groupVertical: { flexDirection: 'column' },
  // Collapsible leading / trailing content: a 0fr ⇄ 1fr track animates the intrinsic size.
  collapse: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    transitionProperty: 'grid-template-columns, grid-template-rows',
    transitionDuration: motion.fastSpatialDuration,
    transitionTimingFunction: motion.fastSpatialEasing,
  },
  collapseVertical: { gridTemplateColumns: 'auto', gridTemplateRows: '1fr' },
  collapsed: { gridTemplateColumns: '0fr' },
  collapsedVertical: { gridTemplateRows: '0fr' },
  clip: {
    display: 'flex',
    alignItems: 'center',
    columnGap: 4,
    rowGap: 4,
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
  // Which edge the content stays pinned to while the track resizes (Compose expandFrom /
  // shrinkTowards): the overflowing content is clipped from the other side.
  pinEnd: { justifyContent: 'flex-end' },
  // The 4px item gap travels with the collapsing content.
  leadGap: { paddingInlineEnd: 4 },
  trailGap: { paddingInlineStart: 4 },
  leadGapVertical: { paddingBlockEnd: 4 },
  trailGapVertical: { paddingBlockStart: 4 },
  // Constant size (Compose: toolbar + 8px + the 56px FAB): the toolbar shrinks towards the FAB,
  // which grows into the space instead of moving.
  withFab: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    columnGap: FAB_GAP,
    rowGap: FAB_GAP,
  },
  withFabVertical: { flexDirection: 'column' },
  fabStart: { flexDirection: 'row-reverse' },
  fabStartVertical: { flexDirection: 'column-reverse' },
  fabSize: (w: number, h: number) => ({ minWidth: w, minHeight: h }),
  // Compose shrinks the toolbar layer itself (shape + clip, padding included): a rounded shell cuts
  // the full-size bar, and its shadow lerps to none with the collapse (collapsed elevation 0).
  shell: {
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: 32,
    boxShadow: elevation.level3NoSpread,
    transitionProperty: 'box-shadow',
    transitionDuration: motion.fastSpatialDuration,
    transitionTimingFunction: motion.fastSpatialEasing,
  },
  shellCollapsed: { boxShadow: 'none' },
  barNatural: { width: 'max-content', height: 'max-content', boxShadow: 'none' },
  fabSlot: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

/**
 * `ref`, native props and `sx` go to the root: the `role="toolbar"` bar, or — with a `fab` — the
 * wrapper holding the bar and the FAB. `aria-label` / `aria-labelledby` always name the bar.
 */
export interface ToolbarProps extends SxProps<ComponentPropsWithRef<'div'>> {
  /** Floating (a rounded, elevated bar) or docked (full width, flat). */
  layout?: 'floating' | 'docked';
  /** Floating toolbars can be vertical. */
  orientation?: 'horizontal' | 'vertical';
  variant?: ToolbarVariant;
  /**
   * Floating: collapse to the main content (scroll away); with a FAB, to the FAB alone. Controlled
   * only: layout state the toolbar never changes itself (drive it from the app, or with
   * `useFloatingToolbarNestedScroll`).
   */
  expanded?: boolean;
  /** Floating: content shown only while expanded, before / after the main content. */
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Floating: a FAB 8px after (or before) the toolbar. */
  fab?: ReactNode;
  fabPosition?: 'end' | 'start';
  children?: ReactNode;
}

/**
 * A row (or column) of actions. Arrow keys move between items (mirrored in RTL; a text field keeps
 * them while its caret can move); Tab enters and leaves it once.
 */
export function Toolbar({
  layout = 'floating',
  orientation: orientationProp = 'horizontal',
  variant = 'standard',
  expanded = true,
  leading,
  trailing,
  fab,
  fabPosition = 'end',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  children,
  sx,
  ref: refProp,
  ...rest
}: ToolbarProps) {
  const floating = layout === 'floating';
  const vertical = floating && orientationProp === 'vertical';
  const orientation = vertical ? 'vertical' : 'horizontal';
  const hasFab = floating && fab != null;
  const ref = useRef<HTMLDivElement | null>(null);
  // Without a FAB the bar is the root.
  const setRef = useMergedRefs(ref, hasFab ? null : refProp);

  // The bar's natural size, for the constant-size FAB layout.
  const [natural, setNatural] = useState<[number, number] | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!hasFab || !el) return undefined;
    const measure = () => setNatural([el.offsetWidth, el.offsetHeight]);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined; // jsdom / very old engines: measured once
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasFab]);

  // Roving tab stop (WAI-ARIA toolbar): exactly one item is in the tab order.
  const { onFocus, onKeyDown } = useRovingTabStop(ref, vertical);

  const collapsible = (content: ReactNode, side: 'lead' | 'trail') => {
    // Horizontal: leading expandFrom Start / shrinkTowards End, trailing End / Start.
    // Vertical: leading Bottom / Bottom, trailing Top / Top.
    const pinEnd = vertical ? side === 'lead' : side === 'lead' ? !expanded : expanded;
    return (
      <div
        inert={!expanded || undefined}
        {...stylex.props(
          s.collapse,
          vertical && s.collapseVertical,
          !expanded && (vertical ? s.collapsedVertical : s.collapsed),
        )}
      >
        <div
          {...stylex.props(
            s.clip,
            vertical && s.groupVertical,
            pinEnd && s.pinEnd,
            side === 'lead' ? (vertical ? s.leadGapVertical : s.leadGap) : vertical ? s.trailGapVertical : s.trailGap,
          )}
        >
          {content}
        </div>
      </div>
    );
  };

  const bar = (
    <ToolbarVariantContext value={variant}>
      <div
        ref={setRef}
        role="toolbar"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-orientation={orientation}
        {...(hasFab ? null : rest)}
        // The roving tab stop runs after the app's own handlers (on the bar when it is the root).
        onFocus={(e) => {
          if (!hasFab) rest.onFocus?.(e);
          onFocus(e);
        }}
        onKeyDown={(e) => {
          if (!hasFab) rest.onKeyDown?.(e);
          onKeyDown(e);
        }}
        {...stylex.props(
          s.root,
          variant === 'vibrant' && s.vibrant,
          floating ? [s.floating, vertical && s.floatingVertical] : s.docked,
          hasFab ? s.barNatural : sx,
        )}
      >
        {floating && leading != null && collapsible(leading, 'lead')}
        {floating ? <div {...stylex.props(s.group, vertical && s.groupVertical)}>{children}</div> : children}
        {floating && trailing != null && collapsible(trailing, 'trail')}
      </div>
    </ToolbarVariantContext>
  );

  if (!hasFab) return bar;
  return (
    <div
      ref={refProp}
      {...rest}
      {...stylex.props(
        s.withFab,
        vertical && s.withFabVertical,
        fabPosition === 'start' && (vertical ? s.fabStartVertical : s.fabStart),
        natural &&
          (vertical ? s.fabSize(0, natural[1] + FAB_GAP + FAB_SIZE) : s.fabSize(natural[0] + FAB_GAP + FAB_SIZE, 0)),
        sx,
      )}
    >
      <div
        inert={!expanded || undefined}
        {...stylex.props(
          s.collapse,
          vertical && s.collapseVertical,
          !expanded && (vertical ? s.collapsedVertical : s.collapsed),
        )}
      >
        <div {...stylex.props(s.shell, !expanded && s.shellCollapsed)}>{bar}</div>
      </div>
      <div {...stylex.props(s.fabSlot)}>
        <ToolbarFabContext value={expanded ? FAB_EXPANDED : FAB_COLLAPSED}>{fab}</ToolbarFabContext>
      </div>
    </div>
  );
}

/** Testing: toolbar item colours without the bar (the kit's toolbar building blocks). */
export function ToolbarScope({ variant = 'standard', children }: { variant?: ToolbarVariant; children: ReactNode }) {
  return <ToolbarVariantContext value={variant}>{children}</ToolbarVariantContext>;
}
