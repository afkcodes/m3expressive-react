import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Avatar,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardHeadline,
  CardMedia,
  CardText,
  IconButton,
  M3Provider,
  typescale,
  type CardVariant,
  type ColorSchemeMode,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import media from '../../../../figma/card/assets/media.png';
import cardAssets from '../../../../figma/card/assets.json';

const s = stylex.create({
  page: { minHeight: '100vh', backgroundColor: color.surface, color: color.onSurface, padding: 32, display: 'grid', gap: 24, alignContent: 'start' },
  panel: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'end', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainer },
  row: { display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'start' },
  muted: { color: color.onSurfaceVariant },
  w360: { width: 360 },
  grow: { flexGrow: 1 },
  tile: { width: 220, height: 140, padding: 16, boxSizing: 'border-box', justifyContent: 'space-between' },
});

function MoreVert() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d={cardAssets.moreVert} />
    </svg>
  );
}

export function CardPlayground() {
  const [variant, setVariant] = useState<CardVariant>('outlined');
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [dragged, setDragged] = useState(false);
  const [clicks, setClicks] = useState(0);
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;

  return (
    <M3Provider colorScheme={scheme}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}><a href="/" style={{ color: 'inherit' }}>← all</a></p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>Card playground</h1>
        <section {...stylex.props(s.panel)}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>variant</span>
            <select value={variant} onChange={(e) => setVariant(e.target.value as CardVariant)} style={field}>
              <option>outlined</option><option>elevated</option><option>filled</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour scheme</span>
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={field}>
              <option>light</option><option>dark</option><option>system</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>dragged (interactive card)</span>
            <input type="checkbox" checked={dragged} onChange={(e) => setDragged(e.target.checked)} />
          </label>
        </section>

        <div {...stylex.props(s.row)}>
          <Card variant={variant} sx={s.w360}>
            <CardHeader
              avatar={<Avatar>A</Avatar>}
              headline="Header"
              subhead="Subhead"
              action={<IconButton aria-label="More options"><MoreVert /></IconButton>}
            />
            <CardMedia src={media} fit="contain" blend="luminosity" />
            <CardContent>
              <CardHeadline title="Title" subtitle="Subtitle" />
              <CardText>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor</CardText>
              <CardActions>
                <Button variant="outlined">Secondary</Button>
                <Button>Primary</Button>
              </CardActions>
            </CardContent>
          </Card>

          <div style={{ display: 'grid', gap: 24 }}>
            <Card variant={variant} orientation="horizontal" sx={s.w360}>
              <CardHeader avatar={<Avatar>A</Avatar>} headline="Header" subhead="Subhead" sx={s.grow} />
              <CardMedia src={media} fit="contain" blend="luminosity" width={80} height={80} />
            </Card>
            <Card variant={variant} interactive dragged={dragged} onClick={() => setClicks((c) => c + 1)} sx={s.tile}>
              <span {...stylex.props(typescale.titleMedium)}>Interactive card</span>
              <span {...stylex.props(typescale.bodyMedium, s.muted)}>
                Hover, press, Tab to focus, toggle “dragged”. Clicked {clicks}×
              </span>
            </Card>
          </div>
        </div>
      </main>
    </M3Provider>
  );
}
