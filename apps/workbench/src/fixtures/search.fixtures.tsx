import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '@m3x/react/tokens/color.stylex';
import { searchViewVars } from '@m3x/react/components/Search/searchView.stylex';
import { Avatar, IconButton, ListItem, SearchBar, SearchView } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/search/manifest.json';
import assets from '../../../../figma/search/assets.json';
import placeholder350 from '../../../../figma/list/assets/placeholder-350.png';
import type { FixtureModule, FixtureVariant } from './types.ts';

const fx = stylex.create({
  monogram: { backgroundColor: color.primary, color: color.onPrimary, letterSpacing: '0.15px' },
  placeholderBg: { backgroundColor: color.surfaceContainerHigh },
  placeholderImg: { mixBlendMode: 'luminosity' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  fullOverlay: { position: 'absolute', inset: 0, paddingTop: 8, [searchViewVars.containerColor]: color.surface },
});

type IconName = keyof typeof assets.icons;
const Icon = ({ name }: { name: IconName }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons[name]} />
  </svg>
);
const Btn = ({ icon, label }: { icon: IconName; label: string }) => (
  <IconButton aria-label={label}>
    <Icon name={icon} />
  </IconButton>
);
const asForced = (s: string): ForcedState | undefined => (s === 'hovered' || s === 'focused' || s === 'pressed' ? s : undefined);

const results = [0, 1, 2].map((i) => (
  <ListItem
    key={i}
    leading={<Avatar size={40} src={placeholder350} alt="" sx={fx.placeholderBg} imageSx={fx.placeholderImg} />}
    supportingText="Supporting line text, lorem ipsum dolor"
    supportingMaxLines={1}
  >
    Label text
  </ListItem>
));

function render(name: string): ReactNode {
  const p = name.split('-');
  if (p[0] === 'bar') {
    // bar-{state}-{avatar|plain}
    return (
      <ForceState state={asForced(p[1]!)} ripplePath={p[1] === 'pressed' ? assets.ripple : undefined}>
        <SearchBar
          placeholder="Hinted search text"
          leading={<Btn icon="menu-24" label="Menu" />}
          trailing={<Btn icon="search-24" label="Search" />}
          avatar={
            p[2] === 'avatar' ? (
              <Avatar size={30} sx={fx.monogram}>
                A
              </Avatar>
            ) : undefined
          }
        />
      </ForceState>
    );
  }
  // {full|docked}-{input-text|supporting-text}
  const input = p.slice(1).join('-') === 'input-text';
  return (
    <ForceState state={input ? 'focused' : undefined}>
      <SearchView
        mode={p[0] === 'full' ? 'full-screen' : 'docked'}
        value={input ? 'Input text' : ''}
        onValueChange={() => {}}
        placeholder="Hinted search text"
        leading={<Btn icon="arrow_back-24" label="Back" />}
        trailing={
          input ? (
            <>
              <Btn icon="close-24" label="Clear" />
              {p[0] === 'docked' && <Btn icon="mic-24" label="Voice search" />}
            </>
          ) : (
            <Btn icon="mic-24" label="Voice search" />
          )
        }
      >
        {results}
      </SearchView>
    </ForceState>
  );
}

/**
 * Live: the kit's bar (enabled, no avatar) expanding into the docked view over it; typing filters,
 * Escape / back collapses (the view animates out, then unmounts).
 */
function LiveSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const bar = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) bar.current?.querySelector<HTMLElement>('[data-search-trigger]')?.focus();
    wasOpen.current = open;
  }, [open]);
  const close = () => {
    setOpen(false);
    setQ('');
  };
  const items = ['Savings account', 'Business card', 'Payments', 'Statements'].filter((t) => t.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <SearchBar
        ref={bar}
        placeholder="Hinted search text"
        leading={<Btn icon="menu-24" label="Menu" />}
        trailing={<Btn icon="search-24" label="Search" />}
        onActivate={() => setOpen(true)}
      />
      <SearchView
        mode="docked"
        open={open}
        expandedFrom={bar}
        value={q}
        onValueChange={setQ}
        onDismiss={close}
        placeholder="Hinted search text"
        autoFocus
        sx={fx.overlay}
        leading={
          <IconButton aria-label="Back" onClick={close}>
            <Icon name="arrow_back-24" />
          </IconButton>
        }
        trailing={
          q ? (
            <IconButton aria-label="Clear" onClick={() => setQ('')}>
              <Icon name="close-24" />
            </IconButton>
          ) : (
            <Btn icon="mic-24" label="Voice search" />
          )
        }
      >
        {items.map((t) => (
          <ListItem key={t} onClick={close}>
            {t}
          </ListItem>
        ))}
      </SearchView>
    </div>
  );
}

/** Live: the full-screen view expanding from the bar (Compose contained search). */
function LiveSearchFull() {
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', width: 412, height: 600, paddingTop: 8, boxSizing: 'border-box' }}>
      <div style={{ paddingInline: 16 }}>
        <SearchBar
          ref={bar}
          placeholder="Hinted search text"
          leading={<Btn icon="menu-24" label="Menu" />}
          trailing={<Btn icon="search-24" label="Search" />}
          onActivate={() => setOpen(true)}
        />
      </div>
      <SearchView
        open={open}
        expandedFrom={bar}
        value=""
        onValueChange={() => {}}
        onDismiss={() => setOpen(false)}
        placeholder="Hinted search text"
        sx={fx.fullOverlay}
        leading={
          <IconButton aria-label="Back" onClick={() => setOpen(false)}>
            <Icon name="arrow_back-24" />
          </IconButton>
        }
        trailing={<Btn icon="mic-24" label="Voice search" />}
      >
        {results}
      </SearchView>
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'search',
  variants: Object.fromEntries([
    ['live', { width: 360, height: 250, render: () => <LiveSearch /> } satisfies FixtureVariant],
    ['live-full', { width: 412, height: 600, render: () => <LiveSearchFull /> } satisfies FixtureVariant],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [w, h] = v.size as [number, number];
      return [
        name,
        {
          node: v.node,
          width: w,
          height: h,
          render: () => <div style={{ width: w, height: h, display: 'flex', flexDirection: 'column' }}>{render(name)}</div>,
        },
      ];
    }),
  ]),
};
export default fixture;
