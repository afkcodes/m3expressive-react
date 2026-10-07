import './global.css';
import { createRoot } from 'react-dom/client';
import { Gallery } from './pages/Gallery.tsx';
import { Fixture } from './pages/Fixture.tsx';
import { Compare } from './pages/Compare.tsx';
import { ShapesDemo } from './pages/ShapesDemo.tsx';
import { ButtonPlayground } from './pages/ButtonPlayground.tsx';
import { BadgePlayground } from './pages/BadgePlayground.tsx';
import { CardPlayground } from './pages/CardPlayground.tsx';
import { ChipsPlayground } from './pages/ChipsPlayground.tsx';
import { OverlaysPlayground } from './pages/OverlaysPlayground.tsx';
import { CheckboxPlayground } from './pages/CheckboxPlayground.tsx';
import { ProgressPlayground } from './pages/ProgressPlayground.tsx';
import { SliderPlayground } from './pages/SliderPlayground.tsx';
import { TextFieldPlayground } from './pages/TextFieldPlayground.tsx';
import { ListPlayground } from './pages/ListPlayground.tsx';
import { MenuPlayground } from './pages/MenuPlayground.tsx';
import { TabsPlayground } from './pages/TabsPlayground.tsx';
import { NavigationPlayground } from './pages/NavigationPlayground.tsx';
import { AppBarPlayground } from './pages/AppBarPlayground.tsx';
import { SearchPlayground } from './pages/SearchPlayground.tsx';
import { ToolbarPlayground } from './pages/ToolbarPlayground.tsx';
import { SheetsPlayground } from './pages/SheetsPlayground.tsx';
import { DialogsPlayground } from './pages/DialogsPlayground.tsx';
import { CarouselPlayground } from './pages/CarouselPlayground.tsx';
import { DatePickerPlayground } from './pages/DatePickerPlayground.tsx';
import { TimePickerPlayground } from './pages/TimePickerPlayground.tsx';
import { ThemePlayground } from './pages/ThemePlayground.tsx';

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
  if (page === 'demo' && (component === 'list' || component === 'lists')) return <ListPlayground />;
  if (page === 'demo' && (component === 'menu' || component === 'menus')) return <MenuPlayground />;
  if (page === 'demo' && component === 'tabs') return <TabsPlayground />;
  if (page === 'demo' && (component === 'navigation' || component === 'nav')) return <NavigationPlayground />;
  if (page === 'demo' && (component === 'app-bar' || component === 'appbar')) return <AppBarPlayground />;
  if (page === 'demo' && component === 'search') return <SearchPlayground />;
  if (page === 'demo' && (component === 'toolbar' || component === 'toolbars')) return <ToolbarPlayground />;
  if (page === 'demo' && (component === 'sheets' || component === 'sheet')) return <SheetsPlayground />;
  if (page === 'demo' && (component === 'dialogs' || component === 'dialog')) return <DialogsPlayground />;
  if (page === 'demo' && component === 'carousel') return <CarouselPlayground />;
  if (page === 'demo' && (component === 'theme' || component === 'dynamic-color')) return <ThemePlayground />;
  if (page === 'demo' && (component === 'date-picker' || component === 'date-pickers')) return <DatePickerPlayground />;
  if (page === 'demo' && (component === 'time-picker' || component === 'time-pickers')) return <TimePickerPlayground />;
  if (page === 'demo' && (component === 'checkbox' || component === 'radio' || component === 'switch')) return <CheckboxPlayground />;
  return <Gallery />;
}

createRoot(document.getElementById('root')!).render(<App />);
