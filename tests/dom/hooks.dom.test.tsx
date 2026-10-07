import { act, createRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useControllableState } from '../../packages/m3/src/hooks/useControllableState.ts';
import { useMergedRefs } from '../../packages/m3/src/hooks/useMergedRefs.ts';
import { useSpringChannel, type SpringChannel } from '../../packages/m3/src/motion/useSpringChannel.ts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(node: React.ReactNode) {
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  await act(async () => root.render(node));
  return { host, unmount: () => act(async () => root.unmount()) };
}

describe('useControllableState', () => {
  it('uncontrolled: owns the value, still notifies', async () => {
    const onChange = vi.fn<(n: number, reason?: string) => void>();
    let api!: readonly [number, (n: number, reason?: string) => void];
    function Probe() {
      api = useControllableState<number, [string?]>(undefined, 1, onChange);
      return <output>{api[0]}</output>;
    }
    const { host, unmount } = await mount(<Probe />);
    await act(async () => api[1](5, 'click'));
    expect(host.textContent).toBe('5');
    expect(onChange).toHaveBeenCalledWith(5, 'click');
    await unmount();
  });

  it('controlled (incl. null): the prop wins, the setter only notifies', async () => {
    const onChange = vi.fn<(n: number | null) => void>();
    let set!: (n: number | null) => void;
    function Probe({ value }: { value: number | null }) {
      const [v, s] = useControllableState<number | null>(value, 7, onChange);
      set = s;
      return <output>{String(v)}</output>;
    }
    const { host, unmount } = await mount(<Probe value={null} />);
    expect(host.textContent).toBe('null');
    await act(async () => set(3));
    expect(host.textContent).toBe('null');
    expect(onChange).toHaveBeenCalledWith(3);
    await unmount();
  });

  it('switching from uncontrolled to controlled uses the prop', async () => {
    function Parent() {
      const [value, setValue] = useState<number | undefined>(undefined);
      const [v] = useControllableState(value, 1);
      return (
        <button type="button" onClick={() => setValue(9)}>
          {v}
        </button>
      );
    }
    const { host, unmount } = await mount(<Parent />);
    expect(host.textContent).toBe('1');
    await act(async () => host.querySelector('button')!.click());
    expect(host.textContent).toBe('9');
    await unmount();
  });
});

describe('useMergedRefs', () => {
  it('feeds object and callback refs, and clears them on unmount', async () => {
    const objectRef = createRef<HTMLSpanElement>();
    const seen: Array<HTMLSpanElement | null> = [];
    function Probe() {
      return (
        <span
          ref={useMergedRefs(objectRef, (n: HTMLSpanElement | null) => {
            seen.push(n);
          })}
        />
      );
    }
    const { unmount } = await mount(<Probe />);
    expect(objectRef.current).toBeInstanceOf(HTMLSpanElement);
    expect(seen[0]).toBe(objectRef.current);
    await unmount();
    expect(objectRef.current).toBeNull();
  });
});

describe('useSpringChannel', () => {
  const SPRING = { dampingRatio: 1, stiffness: 1600 };
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('springs to the target, reports rest, jumps without a spring, stops on unmount', async () => {
    const seen: number[] = [];
    const rested: number[] = [];
    let channel!: SpringChannel;
    function Probe() {
      channel = useSpringChannel((v) => seen.push(v), { onRest: (v) => rested.push(v) });
      return null;
    }
    const { unmount } = await mount(<Probe />);
    await act(async () => channel.to(10, SPRING));
    await act(async () => wait(600));
    expect(seen.at(-1)).toBe(10);
    expect(rested).toEqual([10]);
    expect(seen.length).toBeGreaterThan(2); // animated, not jumped

    await act(async () => channel.to(3, null));
    expect(seen.at(-1)).toBe(3);
    expect(channel.animating).toBe(false);

    await act(async () => channel.to(50, SPRING));
    const count = seen.length;
    await unmount();
    await wait(200);
    expect(seen.length - count).toBeLessThanOrEqual(1); // stopped on unmount
  });
});
