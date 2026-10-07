import { act, Profiler, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Carousel, CarouselItem, TopAppBar } from '../../packages/m3/src/index.ts';
import { isNoDragTarget } from '../../packages/m3/src/motion/dragGuard.ts';
import { ownsKey } from '../../packages/m3/src/hooks/useRovingTabStop.ts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

const html = (markup: string) => {
  const host = document.body.appendChild(document.createElement('div'));
  host.innerHTML = markup;
  return host;
};

describe('sheet drag guard (isNoDragTarget)', () => {
  it('leaves text entry, sliders and data-m3-no-drag content to themselves', () => {
    const sheet = html(`
      <input id="input"><textarea id="area"></textarea><select id="select"></select>
      <div contenteditable id="edit"><b id="bold">x</b></div><div contenteditable="false" id="readonly"></div>
      <div role="slider" id="slider"><span id="thumb"></span></div>
      <div data-m3-no-drag id="pad"><span id="ink"></span></div>
      <p id="text">plain</p>`);
    const at = (id: string) => ({ target: sheet.querySelector(`#${id}`), defaultPrevented: false });
    for (const id of ['input', 'area', 'select', 'edit', 'bold', 'slider', 'thumb', 'pad', 'ink'])
      expect(isNoDragTarget(at(id), sheet), id).toBe(true);
    for (const id of ['readonly', 'text']) expect(isNoDragTarget(at(id), sheet), id).toBe(false);
    expect(isNoDragTarget({ target: sheet.querySelector('#text'), defaultPrevented: true }, sheet)).toBe(true);
    expect(isNoDragTarget({ target: null, defaultPrevented: false }, sheet)).toBe(false);
  });

  it('only counts data-m3-no-drag inside the sheet', () => {
    const outer = html(`<div data-m3-no-drag><section id="sheet"><p id="text">plain</p></section></div>`);
    const sheet = outer.querySelector('#sheet')!;
    expect(isNoDragTarget({ target: sheet.querySelector('#text'), defaultPrevented: false }, sheet)).toBe(false);
  });

  it('a descendant that captured the pointer owns it (touch: not the implicitly captured target)', () => {
    const sheet = html(`<div id="control"><span id="thumb"></span></div><p id="text"></p>`);
    const control = sheet.querySelector<HTMLElement>('#control')!;
    const thumb = sheet.querySelector<HTMLElement>('#thumb')!;
    const captured = new Set<Element>();
    for (const el of [control, thumb, sheet.querySelector('#text')!])
      (el as Element & { hasPointerCapture: (id: number) => boolean }).hasPointerCapture = () => captured.has(el);
    const press = (target: Element, pointerType: string) => ({
      target,
      defaultPrevented: false,
      pointerId: 1,
      pointerType,
    });
    expect(isNoDragTarget(press(thumb, 'mouse'), sheet)).toBe(false);
    captured.add(control);
    expect(isNoDragTarget(press(thumb, 'mouse'), sheet)).toBe(true);
    expect(isNoDragTarget(press(thumb, 'touch'), sheet)).toBe(true);
    captured.clear();
    captured.add(thumb);
    expect(isNoDragTarget(press(thumb, 'mouse'), sheet)).toBe(true);
    expect(isNoDragTarget(press(thumb, 'touch'), sheet)).toBe(false);
  });
});

describe('toolbar roving: keys a focused item keeps (ownsKey)', () => {
  it('text fields keep arrows while the caret can move, and Home / End', () => {
    const host = html(`<input id="text" value="abc"><textarea id="area">ab</textarea>`);
    const input = host.querySelector<HTMLInputElement>('#text')!;
    input.setSelectionRange(1, 1);
    expect([ownsKey(input, 'next'), ownsKey(input, 'prev')]).toEqual([true, true]);
    input.setSelectionRange(0, 0);
    expect([ownsKey(input, 'next'), ownsKey(input, 'prev')]).toEqual([true, false]);
    input.setSelectionRange(3, 3);
    expect([ownsKey(input, 'next'), ownsKey(input, 'prev')]).toEqual([false, true]);
    expect([ownsKey(input, 'first'), ownsKey(input, 'last')]).toEqual([true, true]);
    input.setSelectionRange(0, 3); // a selection collapses first
    expect([ownsKey(input, 'next'), ownsKey(input, 'prev')]).toEqual([true, true]);
    const area = host.querySelector<HTMLTextAreaElement>('#area')!;
    area.setSelectionRange(2, 2);
    expect(ownsKey(area, 'next')).toBe(false);
  });

  it('selects, sliders, radios and contenteditable keep every arrow; buttons and checkboxes none', () => {
    const host = html(`<select id="s"></select><input type="range" id="r"><input type="radio" id="o">
      <div contenteditable="true" id="e"></div><button id="b"></button><input type="checkbox" id="c">`);
    const el = (id: string) => host.querySelector(`#${id}`)!;
    // jsdom has no isContentEditable: stand in for the browser's.
    Object.defineProperty(el('e'), 'isContentEditable', { value: true });
    for (const id of ['s', 'r', 'o', 'e']) expect(ownsKey(el(id), 'next'), id).toBe(true);
    for (const id of ['b', 'c']) expect(ownsKey(el(id), 'next'), id).toBe(false);
  });
});

describe('top app bar scroll state', () => {
  it('scroll events that change nothing do not re-render the bar', async () => {
    let scrollTop = 0;
    let commits = 0;
    let scroller!: HTMLDivElement;
    function Page() {
      const ref = useRef<HTMLDivElement>(null);
      return (
        <>
          <Profiler id="bar" onRender={() => commits++}>
            <TopAppBar headline="Title" scrollTarget={ref} />
          </Profiler>
          <div
            ref={(el) => {
              ref.current = el;
              if (el) {
                scroller = el;
                Object.defineProperty(el, 'scrollTop', { get: () => scrollTop, configurable: true });
              }
            }}
          />
        </>
      );
    }
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    await act(async () => root.render(<Page />));
    const header = host.querySelector('header')!;
    const scroll = async (top: number) => {
      scrollTop = top;
      await act(async () => scroller.dispatchEvent(new Event('scroll')));
    };
    await scroll(40);
    const scrolledClass = header.className;
    const afterFirst = commits;
    for (const top of [40, 60, 80, 120]) await scroll(top); // still overlapped, small bar: fraction 0
    expect(commits).toBe(afterFirst);
    await scroll(0);
    expect(commits).toBe(afterFirst + 1);
    expect(header.className).not.toBe(scrolledClass);
    await act(async () => root.unmount());
  });
});

describe('carousel before it is measured', () => {
  it('keyline layouts render their slides in a row at the preferred width (jsdom: width 0)', async () => {
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    await act(async () =>
      root.render(
        <Carousel aria-label="Photos" preferredItemWidth={120}>
          {['a', 'b', 'c'].map((k) => (
            <CarouselItem key={k}>{k}</CarouselItem>
          ))}
        </Carousel>,
      ),
    );
    const slides = host.querySelectorAll('[aria-roledescription="slide"]');
    expect([...slides].map((s) => s.textContent)).toEqual(['a', 'b', 'c']);
    expect(host.querySelector('[aria-roledescription="carousel"]')!.hasAttribute('data-m3-no-drag')).toBe(true);
    await act(async () => root.unmount());
  });
});
