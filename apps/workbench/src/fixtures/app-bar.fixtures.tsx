import { useRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '@m3x/react/tokens/color.stylex';
import {
  AppBarTitle,
  Avatar,
  BottomAppBar,
  Fab,
  IconButton,
  TopAppBar,
  typescale,
  type TopAppBarSize,
} from '@m3x/react';
import manifest from '../../../../figma/app-bar/manifest.json';
import assets from '../../../../figma/app-bar/assets.json';
import placeholder700 from '../../../../figma/list/assets/placeholder-700.png';
import placeholder350 from '../../../../figma/list/assets/placeholder-350.png';
import type { FixtureModule, FixtureVariant } from './types.ts';

const fx = stylex.create({
  /** The kit's placeholder art: LUMINOSITY blend over Surface Container High. */
  placeholderBg: { backgroundColor: color.surfaceContainerHigh },
  placeholderImg: { mixBlendMode: 'luminosity' },
  monogram: { backgroundColor: color.primary, color: color.onPrimary, letterSpacing: '0.15px' },
  // Kit "Search bar - Modified" (the Search page's search bar, restyled for the app bar).
  searchPill: {
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    width: '100%',
    height: 56,
    paddingInline: 24,
    borderRadius: 28,
    color: color.onSurfaceVariant,
    backgroundColor: color.surfaceContainer,
  },
  searchScrolled: { backgroundColor: color.surfaceContainerHighest },
  searchCentred: { justifyContent: 'center' },
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
const AvatarSlot = () => (
  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48 }}>
    <Avatar size={32} src={placeholder350} alt="" sx={fx.placeholderBg} imageSx={fx.placeholderImg} />
  </span>
);
const Placeholder = ({ w, h, src }: { w: number; h: number; src: string }) => (
  <span {...stylex.props(fx.placeholderBg)} style={{ display: 'block', width: w, height: h, overflow: 'hidden' }}>
    <img
      src={src}
      alt=""
      {...stylex.props(fx.placeholderImg)}
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
    />
  </span>
);
const SearchPill = ({ scrolled, centred }: { scrolled: boolean; centred?: boolean }) => (
  <span {...stylex.props(fx.searchPill, scrolled && fx.searchScrolled, centred && fx.searchCentred)}>
    <span {...stylex.props(typescale.bodyLarge)}>Search product</span>
  </span>
);

function render(name: string): ReactNode {
  const p = name.split('-');
  if (p[0] === 'appbar') {
    const scrolled = name.endsWith('on-scroll');
    const config = p.slice(1, scrolled ? -2 : -1).join('-');
    if (config === 'small-centered')
      return (
        <TopAppBar
          centered
          title="Label"
          scrolled={scrolled}
          navigationIcon={<Btn icon="menu-24" label="Menu" />}
          actions={<AvatarSlot />}
        />
      );
    if (config === 'search')
      return (
        <TopAppBar
          scrolled={scrolled}
          navigationIcon={<Btn icon="menu-24" label="Menu" />}
          search={<SearchPill scrolled={scrolled} />}
          actions={<AvatarSlot />}
        />
      );
    if (config === 'small-image')
      return (
        <TopAppBar
          scrolled={scrolled}
          navigationIcon={<Btn icon="arrow_back-24" label="Back" />}
          content={<Placeholder w={300} h={40} src={placeholder700} />}
          actions={<Btn icon="search-24" label="Search" />}
        />
      );
    return (
      <TopAppBar
        size={config as TopAppBarSize}
        title="Label"
        scrolled={scrolled}
        navigationIcon={<Btn icon="arrow_back-24" label="Back" />}
        actions={<Btn icon="search-24" label="Search" />}
      />
    );
  }
  if (p[0] === 'text') {
    return (
      <AppBarTitle size={p[1] as TopAppBarSize} centered={p[2] === 'centered'} subtitle="Supporting text">
        Label
      </AppBarTitle>
    );
  }
  if (p[0] === 'search') return <SearchPill scrolled={p[1] === 'onscroll'} centred={p[2] === 'centered'} />;
  if (p[0] === 'thumbnail') return <Placeholder w={278} h={40} src={placeholder700} />;
  if (p[0] === 'avatar') {
    return p[1] === 'image' ? (
      <Avatar size={32} src={placeholder350} alt="" sx={fx.placeholderBg} imageSx={fx.placeholderImg} />
    ) : (
      <Avatar size={32} sx={fx.monogram}>
        A
      </Avatar>
    );
  }
  // bottom-{n}
  const icons: IconName[] = ['search-24', 'delete-24', 'archive-24', 'forward-24'];
  return (
    <BottomAppBar
      actions={icons.slice(0, Number(p[1])).map((i) => (
        <Btn key={i} icon={i} label={i.replace('-24', '')} />
      ))}
      fab={
        <Fab aria-label="Add" color="secondary-container" elevated={false}>
          <Icon name="add-24" />
        </Fab>
      }
    />
  );
}

/** Live: a medium bar over a scroll container — scrolling collapses it (Compose). */
function LiveAppBar() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ width: 412, height: 400, display: 'flex', flexDirection: 'column' }}>
      <TopAppBar
        size="medium"
        title="Label"
        navigationIcon={<Btn icon="arrow_back-24" label="Back" />}
        actions={<Btn icon="search-24" label="Search" />}
        scrollTarget={ref}
      />
      <div ref={ref} data-scroll style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ height: 1200, padding: 16 }}>Content</div>
      </div>
    </div>
  );
}

/** Live (motion): the kit's 3-action bottom bar under a scroll container — it hides with the scroll. */
function LiveBottomAppBar() {
  const ref = useRef<HTMLDivElement>(null);
  const icons: IconName[] = ['search-24', 'delete-24', 'archive-24'];
  return (
    <div style={{ width: 412, height: 400, display: 'flex', flexDirection: 'column' }}>
      <div ref={ref} data-scroll style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ height: 1200, padding: 16 }}>Content</div>
      </div>
      <BottomAppBar
        scrollTarget={ref}
        actions={icons.map((i) => (
          <Btn key={i} icon={i} label={i.replace('-24', '')} />
        ))}
        fab={
          <Fab aria-label="Add" color="secondary-container" elevated={false}>
            <Icon name="add-24" />
          </Fab>
        }
      />
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'app-bar',
  variants: Object.fromEntries([
    ['live', { width: 412, height: 400, render: () => <LiveAppBar /> } satisfies FixtureVariant],
    ['live-bottom', { width: 412, height: 400, render: () => <LiveBottomAppBar /> } satisfies FixtureVariant],
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
