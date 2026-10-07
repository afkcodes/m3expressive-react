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
import { ListPlayground } from './pages/ListPlayground';
import { MenuPlayground } from './pages/MenuPlayground';
import { TabsPlayground } from './pages/TabsPlayground';
import { NavigationPlayground } from './pages/NavigationPlayground';
import { AppBarPlayground } from './pages/AppBarPlayground';
import { SearchPlayground } from './pages/SearchPlayground';
import { ToolbarPlayground } from './pages/ToolbarPlayground';
import { SheetsPlayground } from './pages/SheetsPlayground';
import { DialogsPlayground } from './pages/DialogsPlayground';
import { CarouselPlayground } from './pages/CarouselPlayground';
import { DatePickerPlayground } from './pages/DatePickerPlayground';
import { TimePickerPlayground } from './pages/TimePickerPlayground';
import { ThemePlayground } from './pages/ThemePlayground';

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
