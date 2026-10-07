import { Component, type ReactNode } from 'react';

/** A load or render error, shown in place. */
export function ErrorMessage({ error }: { error: unknown }) {
  return (
    <pre data-fixture-error="" role="alert" style={{ margin: 0, color: '#B3261E', whiteSpace: 'pre-wrap' }}>
      {error instanceof Error ? (error.stack ?? error.message) : String(error)}
    </pre>
  );
}

interface BoundaryState {
  /** Boxed: anything can be thrown, including undefined. */
  caught?: { error: unknown };
}

/** A part that throws while rendering shows its error instead of blanking the page. */
export class Boundary extends Component<{ children: ReactNode }, BoundaryState> {
  override state: BoundaryState = {};

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { caught: { error } };
  }

  override render() {
    const { caught } = this.state;
    return caught ? <ErrorMessage error={caught.error} /> : this.props.children;
  }
}
