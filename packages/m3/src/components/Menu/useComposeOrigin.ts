import { useLayoutEffect, useState } from 'react';

/** One axis of Compose `calculateTransformOrigin` (Menu.kt), in px from the menu's start edge. */
function pivot(anchorStart: number, anchorEnd: number, menuStart: number, menuEnd: number) {
  if (menuStart >= anchorEnd) return 0;
  if (menuEnd <= anchorStart) return menuEnd - menuStart;
  if (menuEnd === menuStart) return 0;
  return (Math.max(anchorStart, menuStart) + Math.min(anchorEnd, menuEnd)) / 2 - menuStart;
}

/**
 * Compose's popup transform origin, recomputed whenever Base UI (re)positions the menu — it
 * writes the positioner's inline style, so a MutationObserver sees every placement before paint.
 * Written to the popup as `--m3x-menu-origin` (Base UI's own `--transform-origin` is the aligned
 * edge offset by the side gap).
 */
export function useComposeOrigin(): {
  anchorRef: (el: HTMLElement | null) => void;
  positionerRef: (el: HTMLDivElement | null) => void;
} {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [positioner, setPositioner] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!positioner) return undefined;
    const update = () => {
      const popup = positioner.querySelector<HTMLElement>(':scope > [role="menu"]');
      if (!anchor || !popup) return;
      const a = anchor.getBoundingClientRect();
      // The positioner isn't scaled: its box is the menu's laid-out bounds.
      const m = positioner.getBoundingClientRect();
      popup.style.setProperty(
        '--m3x-menu-origin',
        `${pivot(a.left, a.right, m.left, m.right)}px ${pivot(a.top, a.bottom, m.top, m.bottom)}px`,
      );
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(positioner, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [positioner, anchor]);
  return { anchorRef: setAnchor, positionerRef: setPositioner };
}
