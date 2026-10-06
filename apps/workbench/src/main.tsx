import './global.css';
import { createRoot } from 'react-dom/client';
import { Gallery } from './pages/Gallery';
import { Fixture } from './pages/Fixture';
import { Compare } from './pages/Compare';
import { ShapesDemo } from './pages/ShapesDemo';
import { ButtonPlayground } from './pages/ButtonPlayground';
import { BadgePlayground } from './pages/BadgePlayground';
import { CardPlayground } from './pages/CardPlayground';
import { ChipsPlayground } from './pages/ChipsPlayground';
import { OverlaysPlayground } from './pages/OverlaysPlayground';
import { CheckboxPlayground } from './pages/CheckboxPlayground';
import { ProgressPlayground } from './pages/ProgressPlayground';
import { SliderPlayground } from './pages/SliderPlayground';
import { TextFieldPlayground } from './pages/TextFieldPlayground';

// /fixture/:component/:variant — isolated render used by the Playwright parity suite
// /compare/:component        — Figma vs live, side by side + difference overlay
// /demo/button, /demo/shapes — interactive playgrounds
// /                          — index
const [, page, component = '', variant = ''] = location.pathname.split('/');

function App() {
  if (page === 'fixture') return <Fixture component={component} variant={variant} />;
  if (page === 'compare') return <Compare component={component} />;
  if (page === 'demo' && component === 'shapes') return <ShapesDemo />;
  if (page === 'demo' && component === 'button') return <ButtonPlayground />;
  if (page === 'demo' && component === 'badge') return <BadgePlayground />;
  if (page === 'demo' && component === 'card') return <CardPlayground />;
  if (page === 'demo' && component === 'chips') return <ChipsPlayground />;
  if (page === 'demo' && (component === 'overlays' || component === 'tooltip')) return <OverlaysPlayground />;
  if (page === 'demo' && (component === 'progress' || component === 'loading')) return <ProgressPlayground />;
  if (page === 'demo' && component === 'slider') return <SliderPlayground />;
  if (page === 'demo' && (component === 'textfield' || component === 'text-field')) return <TextFieldPlayground />;
  if (page === 'demo' && (component === 'checkbox' || component === 'radio' || component === 'switch')) return <CheckboxPlayground />;
  return <Gallery />;
}

createRoot(document.getElementById('root')!).render(<App />);
