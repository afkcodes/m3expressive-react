import { Component, Suspense, type ReactNode } from 'react';

interface BoundaryState {
  /** Boxed: anything can be thrown, including undefined. */
  error?: { thrown: unknown };
}

/**
 * Suspense for lazily loaded pages and fixture modules, plus an error boundary: a module that fails
 * to load, or a variant that throws, shows its error in place instead of blanking the page.
 */
export class Boundary extends Component<{ children: ReactNode }, BoundaryState> {
  override state: BoundaryState = {};

  static getDerivedStateFromError(thrown: unknown): BoundaryState {
    return { error: { thrown } };
  }

  override render() {
    const { error } = this.state;
    if (!error) return <Suspense fallback={null}>{this.props.children}</Suspense>;
    const { thrown } = error;
    return (
      <pre data-fixture-error="" role="alert" style={{ margin: 0, color: '#B3261E', whiteSpace: 'pre-wrap' }}>
        {thrown instanceof Error ? (thrown.stack ?? thrown.message) : String(thrown)}
      </pre>
    );
  }
}
