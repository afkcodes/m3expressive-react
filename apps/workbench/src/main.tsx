import './global.css';
import { lazy, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { findDemo } from './demos.ts';
import { Boundary } from './pages/Boundary.tsx';
import { Compare } from './pages/Compare.tsx';
import { Fixture } from './pages/Fixture.tsx';
import { Gallery } from './pages/Gallery.tsx';

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
const demo = page === 'demo' ? findDemo(component) : undefined;
const Demo =
  demo &&
  lazy(async () => {
    const load = playgrounds[`./pages/${demo.page}.tsx`];
    if (!load) throw new Error(`No module pages/${demo.page}.tsx`);
    const Page = (await load())[demo.page];
    if (!Page) throw new Error(`pages/${demo.page}.tsx exports no ${demo.page}`);
    return { default: Page };
  });

function App() {
  if (page === 'fixture') return <Fixture component={component} variant={variant} />;
  if (page === 'compare') return <Compare component={component} />;
  if (Demo) return <Demo />;
  return <Gallery />;
}

createRoot(document.getElementById('root')!).render(
  <Boundary>
    <App />
  </Boundary>,
);
