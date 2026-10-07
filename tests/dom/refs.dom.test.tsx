import { act, createRef, type ReactNode, type RefObject } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import {
  AssistChip,
  Avatar,
  Badge,
  BottomAppBar,
  BottomSheet,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  CircularProgress,
  Dialog,
  Divider,
  ExtendedFab,
  Fab,
  FilterChip,
  IconButton,
  InputChip,
  LinearProgress,
  List,
  ListItem,
  LoadingIndicator,
  MenuSurface,
  ModalSideSheet,
  NavigationBar,
  NavigationItem,
  PlainTooltipSurface,
  Radio,
  RadioGroup,
  SearchBar,
  SegmentedButton,
  SegmentedButtonItem,
  Shape,
  SideSheet,
  Slider,
  Snackbar,
  SuggestionChip,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleIconButton,
  Toolbar,
  TopAppBar,
} from '../../packages/m3/src/index.ts';

/*
 * docs/API-CONVENTIONS.md §1–2: `ref` and the native props land on the same element. Base UI's
 * trigger composition (Menu `trigger`, Tooltip children) puts both on one element and returns
 * focus through the ref, so a split (ref on a wrapper, handlers on the row) breaks focus return.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(node: ReactNode) {
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  await act(async () => root.render(node));
  return { host, unmount: () => act(async () => root.unmount()) };
}

const icon = <svg aria-hidden />;
const probe = { 'data-probe': 'it' } as const;
type Case = (ref: RefObject<never>) => ReactNode;

/** Each case renders the component with `ref` and `data-probe`; both must reach one element. */
const cases: Record<string, Case> = {
  Button: (ref) => (
    <Button ref={ref} {...probe}>
      Save
    </Button>
  ),
  IconButton: (ref) => (
    <IconButton ref={ref} aria-label="Edit" {...probe}>
      {icon}
    </IconButton>
  ),
  ToggleButton: (ref) => (
    <ToggleButton ref={ref} {...probe}>
      Bold
    </ToggleButton>
  ),
  ToggleIconButton: (ref) => (
    <ToggleIconButton ref={ref} aria-label="Bold" {...probe}>
      {icon}
    </ToggleIconButton>
  ),
  Fab: (ref) => (
    <Fab ref={ref} aria-label="Compose" {...probe}>
      {icon}
    </Fab>
  ),
  ExtendedFab: (ref) => (
    <ExtendedFab ref={ref} icon={icon} {...probe}>
      Compose
    </ExtendedFab>
  ),
  ButtonGroup: (ref) => (
    <ButtonGroup ref={ref} {...probe}>
      <Button>One</Button>
    </ButtonGroup>
  ),
  SegmentedButton: (ref) => (
    <SegmentedButton ref={ref} aria-label="Range" {...probe}>
      <SegmentedButtonItem value="day">Day</SegmentedButtonItem>
    </SegmentedButton>
  ),
  SegmentedButtonItem: (ref) => (
    <SegmentedButton aria-label="Range">
      <SegmentedButtonItem ref={ref} value="day" {...probe}>
        Day
      </SegmentedButtonItem>
    </SegmentedButton>
  ),
  AssistChip: (ref) => (
    <AssistChip ref={ref} {...probe}>
      Book
    </AssistChip>
  ),
  FilterChip: (ref) => (
    <FilterChip ref={ref} {...probe}>
      Wi-Fi
    </FilterChip>
  ),
  InputChip: (ref) => (
    <InputChip ref={ref} {...probe}>
      Ada
    </InputChip>
  ),
  SuggestionChip: (ref) => (
    <SuggestionChip ref={ref} {...probe}>
      Reply
    </SuggestionChip>
  ),
  Badge: (ref) => <Badge ref={ref} {...probe} />,
  Avatar: (ref) => (
    <Avatar ref={ref} {...probe}>
      A
    </Avatar>
  ),
  Card: (ref) => (
    <Card ref={ref} {...probe}>
      Body
    </Card>
  ),
  Divider: (ref) => <Divider ref={ref} {...probe} />,
  Checkbox: (ref) => <Checkbox ref={ref} aria-label="Agree" {...probe} />,
  Radio: (ref) => (
    <RadioGroup aria-label="Size">
      <Radio ref={ref} value="s" aria-label="Small" {...probe} />
    </RadioGroup>
  ),
  RadioGroup: (ref) => (
    <RadioGroup ref={ref} aria-label="Size" {...probe}>
      <Radio value="s" aria-label="Small" />
    </RadioGroup>
  ),
  Switch: (ref) => <Switch ref={ref} aria-label="Wi-Fi" {...probe} />,
  TextField: (ref) => <TextField ref={ref} label="Name" {...probe} />,
  Slider: (ref) => <Slider ref={ref} aria-label="Volume" defaultValue={50} {...probe} />,
  LinearProgress: (ref) => <LinearProgress ref={ref} aria-label="Loading" {...probe} />,
  CircularProgress: (ref) => <CircularProgress ref={ref} aria-label="Loading" {...probe} />,
  LoadingIndicator: (ref) => <LoadingIndicator ref={ref} aria-label="Loading" {...probe} />,
  List: (ref) => (
    <List ref={ref} aria-label="Mail" {...probe}>
      <ListItem>Inbox</ListItem>
    </List>
  ),
  Tabs: (ref) => (
    <Tabs ref={ref} defaultValue={0} {...probe}>
      <Tab value={0} label="One" />
    </Tabs>
  ),
  Tab: (ref) => (
    <Tabs defaultValue={0}>
      <Tab ref={ref} value={0} label="One" {...probe} />
    </Tabs>
  ),
  NavigationBar: (ref) => (
    <NavigationBar ref={ref} defaultValue="home" {...probe}>
      <NavigationItem value="home" icon={icon} label="Home" />
    </NavigationBar>
  ),
  NavigationItem: (ref) => (
    <NavigationBar defaultValue="home">
      <NavigationItem ref={ref} value="home" icon={icon} label="Home" {...probe} />
    </NavigationBar>
  ),
  Toolbar: (ref) => (
    <Toolbar ref={ref} aria-label="Format" {...probe}>
      <IconButton aria-label="Bold">{icon}</IconButton>
    </Toolbar>
  ),
  TopAppBar: (ref) => <TopAppBar ref={ref} headline="Inbox" {...probe} />,
  BottomAppBar: (ref) => (
    <BottomAppBar ref={ref} actions={<IconButton aria-label="Search">{icon}</IconButton>} {...probe} />
  ),
  SearchBar: (ref) => <SearchBar ref={ref} placeholder="Search mail" {...probe} />,
  Snackbar: (ref) => (
    <Snackbar ref={ref} {...probe}>
      Saved
    </Snackbar>
  ),
  PlainTooltipSurface: (ref) => (
    <PlainTooltipSurface ref={ref} {...probe}>
      Tip
    </PlainTooltipSurface>
  ),
  MenuSurface: (ref) => (
    <MenuSurface ref={ref} {...probe}>
      {null}
    </MenuSurface>
  ),
  BottomSheet: (ref) => (
    <BottomSheet ref={ref} {...probe}>
      Content
    </BottomSheet>
  ),
  SideSheet: (ref) => <SideSheet ref={ref} headline="Filters" {...probe} />,
  Shape: (ref) => <Shape ref={ref} shape="circle" {...probe} />,
  // Popups: the popup element (docs/API-CONVENTIONS.md §1).
  Dialog: (ref) => (
    <Dialog ref={ref} open headline="Discard draft?" {...probe}>
      Body
    </Dialog>
  ),
  ModalSideSheet: (ref) => <ModalSideSheet ref={ref} open headline="Filters" {...probe} />,
};

describe('ref and native props reach the same element', () => {
  for (const [name, render] of Object.entries(cases)) {
    it(name, async () => {
      const ref = createRef<never>() as RefObject<HTMLElement | null>;
      const { unmount } = await mount(render(ref as RefObject<never>));
      expect(ref.current, 'ref attached').toBeInstanceOf(Element);
      expect(ref.current!.getAttribute('data-probe'), 'native props on the ref element').toBe('it');
      await unmount();
    });
  }
});

describe('ListItem ref and native props', () => {
  const rows = {
    button: { onClick: () => {} },
    link: { href: '#inbox' },
    static: {},
  };

  for (const [kind, props] of Object.entries(rows)) {
    for (const inList of [true, false]) {
      it(`${kind} row ${inList ? 'inside' : 'outside'} a List: ref is the element with the props`, async () => {
        const ref = createRef<HTMLElement>();
        const item = (
          <ListItem ref={ref} data-probe="row" {...props}>
            Inbox
          </ListItem>
        );
        const { unmount } = await mount(inList ? <List aria-label="Mail">{item}</List> : item);
        expect(ref.current).not.toBeNull();
        expect(ref.current!.getAttribute('data-probe')).toBe('row');
        expect(ref.current!.tagName).not.toBe('LI');
        await unmount();
      });
    }
  }
});
