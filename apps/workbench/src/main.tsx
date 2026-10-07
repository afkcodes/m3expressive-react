import './global.css';
import { StrictMode, type ComponentType, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { findDemo, type Demo } from './demos.ts';
import { importBeforeLoad } from './load.ts';
import { Boundary, ErrorMessage } from './pages/Boundary.tsx';
import { Compare } from './pages/Compare.tsx';
import { Fixture } from './pages/Fixture.tsx';
import { Gallery } from './pages/Gallery.tsx';
import { loadAllFixtures, loadFixture } from './registry.ts';

// /fixture/:component/:variant — isolated render used by the Playwright parity suite
// /fixture/:component          — every variant of a component (console spec)
// /compare/:component          — Figma vs live, side by side + difference overlay
// /demo/:name                  — interactive playgrounds (demos.ts)
// /                            — index
// Fixture modules and playgrounds load on demand: a module that fails to load only breaks the
// pages that use it.
const [, page, component = '', variant = ''] = location.pathname.split('/');

const playgrounds = import.meta.glob<Record<string, ComponentType>>([
  './pages/*Playground.tsx',
  './pages/ShapesDemo.tsx',
]);

async function loadDemo(demo: Demo): Promise<ComponentType> {
  const path = `./pages/${demo.page}.tsx`;
  const load = playgrounds[path];
  if (!load) throw new Error(`No module pages/${demo.page}.tsx`);
  const Page = (await importBeforeLoad(load, new URL(path, import.meta.url)))[demo.page];
  if (!Page) throw new Error(`pages/${demo.page}.tsx exports no ${demo.page}`);
  return Page;
}

/** This URL's page, once the modules it needs have loaded. */
async function route(): Promise<ReactNode> {
  if (page === 'fixture') return <Fixture mod={await loadFixture(component)} component={component} variant={variant} />;
  if (page === 'compare') return <Compare mod={await loadFixture(component)} component={component} />;
  const demo = page === 'demo' ? findDemo(component) : undefined;
  if (demo) {
    const Page = await loadDemo(demo);
    return <Page />;
  }
  return <Gallery all={await loadAllFixtures()} />;
}

const root = createRoot(document.getElementById('root')!);
void route()
  .catch((error: unknown) => <ErrorMessage error={error} />)
  .then((content) =>
    // StrictMode: in development React renders twice and mounts, unmounts and remounts every effect,
    // so every spec also checks that components clean up after themselves.
    root.render(
      <StrictMode>
        <Boundary>{content}</Boundary>
      </StrictMode>,
    ),
  );
