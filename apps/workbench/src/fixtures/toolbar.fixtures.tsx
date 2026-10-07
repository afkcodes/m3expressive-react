import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '@m3x/react/tokens/color.stylex';
import { Fab, IconButton, ToggleButton, ToggleIconButton, Toolbar, ToolbarScope, type ToolbarColor } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/toolbar/manifest.json';
import assets from '../../../../figma/toolbar/assets.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

const fx = stylex.create({
  // The kit's call example overrides the tertiaryContainer FAB with Error Container.
  errorFab: { backgroundColor: color.errorContainer, color: color.onErrorContainer },
  // The kit squeezes the 52px wide icon button into a 48px slot (its container overflows 2px).
  squeeze: { marginInline: -2 },
});

type IconName = keyof typeof assets.icons;
const Icon = ({ name, size = 24 }: { name: string; size?: 20 | 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox={`0 0 ${size} ${size}`}
    fill="currentColor"
    aria-hidden
    style={{ display: 'block' }}
  >
    <path d={assets.icons[`${name}-${size}` as IconName]} />
  </svg>
);
const Btn = ({ icon, label }: { icon: string; label: string }) => (
  <IconButton aria-label={label}>
    <Icon name={icon} />
  </IconButton>
);
const Toggle = ({ icon, label, on = false }: { icon: string; label: string; on?: boolean }) => (
  <ToggleIconButton aria-label={label} defaultPressed={on}>
    <Icon name={icon} />
  </ToggleIconButton>
);
const asForced = (s: string): ForcedState | undefined =>
  s === 'hovered' || s === 'focused' || s === 'pressed' ? s : undefined;
const shareRow = (
  <>
    <Btn icon="share" label="Share" />
    <Btn icon="comment" label="Comment" />
    <Btn icon="download" label="Download" />
  </>
);

function block(name: string, tone: ToolbarColor, kind: string, sel: boolean, state: string): ReactNode {
  const disabled = state === 'disabled';
  return (
    <ToolbarScope color={tone}>
      <ForceState
        state={asForced(state)}
        ripplePath={state === 'pressed' ? assets.ripples[name as keyof typeof assets.ripples] : undefined}
      >
        {kind === 'icon' ? (
          <IconButton aria-label="Favourite" disabled={disabled}>
            <Icon name="stars_filled" />
          </IconButton>
        ) : kind === 'toggle' ? (
          <ToggleIconButton
            aria-label="Favourite"
            pressed={sel}
            disabled={disabled}
            selectedIcon={<Icon name="stars_filled" />}
          >
            <Icon name="stars" />
          </ToggleIconButton>
        ) : (
          <ToggleButton
            pressed={sel}
            disabled={disabled}
            icon={<Icon name="stars" size={20} />}
            selectedIcon={<Icon name="stars_filled" size={20} />}
          >
            Label
          </ToggleButton>
        )}
      </ForceState>
    </ToolbarScope>
  );
}

function render(name: string): ReactNode {
  const p = name.split('-');
  if (p[0] === 'toolbar') {
    // toolbar-{floating-h|floating-v|docked}-{standard|vibrant}
    const tone = p[p.length - 1] as ToolbarColor;
    return (
      <Toolbar
        type={p[1] === 'docked' ? 'docked' : 'floating'}
        orientation={p[2] === 'v' ? 'vertical' : 'horizontal'}
        color={tone}
        aria-label="Actions"
      >
        {shareRow}
      </Toolbar>
    );
  }
  if (p[0] === 'std' || p[0] === 'vib') {
    // {std|vib}-{icon|toggle|button}[-{sel|unsel}]-{state}
    return block(name, p[0] === 'std' ? 'standard' : 'vibrant', p[1]!, p[2] === 'sel', p[p.length - 1]!);
  }
  switch (name) {
    case 'ex-fab-share':
      return (
        <Toolbar
          aria-label="Actions"
          fab={
            <Fab aria-label="Add" color="tertiaryContainer">
              <Icon name="add" />
            </Fab>
          }
        >
          {shareRow}
        </Toolbar>
      );
    case 'ex-fab-archive':
      return (
        <Toolbar
          aria-label="Message actions"
          fab={
            <Fab aria-label="Reply" color="tertiaryContainer">
              <Icon name="reply" />
            </Fab>
          }
        >
          <Btn icon="archive" label="Archive" />
          <Btn icon="delete" label="Delete" />
          <Btn icon="mark_email_unread" label="Mark unread" />
        </Toolbar>
      );
    case 'ex-fab-call':
      return (
        <Toolbar
          aria-label="Call controls"
          fab={
            <Fab aria-label="End call" color="tertiaryContainer" sx={fx.errorFab}>
              <Icon name="call_end" />
            </Fab>
          }
        >
          <Toggle icon="share_outline" label="Share" />
          <Toggle icon="comment_outline" label="Chat" />
          <Toggle icon="front_hand" label="Raise hand" on />
          <Toggle icon="more_vert" label="More" />
        </Toolbar>
      );
    case 'ex-wide-add':
      return (
        <Toolbar aria-label="Actions">
          <Btn icon="share" label="Share" />
          <Btn icon="comment" label="Comment" />
          <IconButton aria-label="Add" variant="filled" width="wide" sx={fx.squeeze}>
            <Icon name="add" />
          </IconButton>
        </Toolbar>
      );
    case 'ex-vib-format':
      return (
        <Toolbar color="vibrant" aria-label="Text formatting">
          <Btn icon="format_bold" label="Bold" />
          <Btn icon="format_italic" label="Italic" />
          <Btn icon="format_underlined" label="Underline" />
        </Toolbar>
      );
    case 'ex-vib-call':
      return (
        <Toolbar color="vibrant" aria-label="Call controls">
          <Btn icon="videocam_off" label="Camera off" />
          <Btn icon="mic" label="Microphone" />
          <Toggle icon="front_hand" label="Raise hand" on />
        </Toolbar>
      );
    case 'ex-vertical':
      return (
        <Toolbar orientation="vertical" aria-label="Edit">
          <Btn icon="undo" label="Undo" />
          <Btn icon="redo" label="Redo" />
          <Btn icon="add" label="Add" />
        </Toolbar>
      );
  }
  return null;
}

/** Live: the kit's floating toolbar with a FAB; the checkbox collapses it into the FAB. */
function LiveToolbar() {
  const [expanded, setExpanded] = useState(true);
  return (
    <div style={{ display: 'grid', gap: 24, justifyItems: 'start', alignContent: 'start' }}>
      <Toolbar
        aria-label="Actions"
        expanded={expanded}
        fab={
          <Fab aria-label="Add" color="tertiaryContainer">
            <Icon name="add" />
          </Fab>
        }
      >
        <Btn icon="share" label="Share" />
        <Toggle icon="comment" label="Comment" />
        <Btn icon="download" label="Download" />
      </Toolbar>
      <label style={{ fontSize: 12 }}>
        <input type="checkbox" checked={!expanded} onChange={(e) => setExpanded(!e.target.checked)} /> collapse
      </label>
    </div>
  );
}

/**
 * Live (keyboard): a toolbar with a text field between its buttons, and the same toolbar in RTL;
 * "Re-render" re-renders both (the roving tab stop must not rewrite unchanged tabindex values).
 */
function LiveToolbarInput() {
  const [renders, setRenders] = useState(0);
  const bar = (label: string) => (
    <Toolbar aria-label={label}>
      <Btn icon="share" label="Share" />
      <input aria-label="Find" defaultValue="" style={{ width: 96, font: 'inherit' }} />
      <Btn icon="comment" label="Comment" />
      <Btn icon="download" label="Download" />
    </Toolbar>
  );
  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start', alignContent: 'start' }}>
      {bar('Find tools')}
      <div dir="rtl">{bar('RTL tools')}</div>
      <button type="button" data-renders={renders} onClick={() => setRenders((n) => n + 1)}>
        Re-render
      </button>
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'toolbar',
  variants: Object.fromEntries([
    ['live', { width: 320, height: 120, render: () => <LiveToolbar /> } satisfies FixtureVariant],
    ['live-input', { width: 360, height: 220, render: () => <LiveToolbarInput /> } satisfies FixtureVariant],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [w, h] = v.size as [number, number];
      return [
        name,
        {
          node: v.node,
          width: w,
          height: h,
          render: () => <div style={{ width: w, height: h, display: 'flex' }}>{render(name)}</div>,
        },
      ];
    }),
  ]),
};
export default fixture;
