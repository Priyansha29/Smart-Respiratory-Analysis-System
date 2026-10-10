import { Component, type ErrorInfo, type ReactNode } from "react";
import styles from "./ErrorBoundary.module.css";

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * When this value changes, a previously caught error is cleared so the
   * boundary can try rendering again (e.g. the user switches tabs).
   */
  resetKey?: unknown;
  /** Short context label shown in the fallback (e.g. "Preprocessing"). */
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Prevents a runtime error in one view from blanking the whole dashboard.
 * React unmounts the entire tree on an uncaught render error, so wrapping
 * each detail view keeps the rest of the analysis usable.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the real error visible for developers.
    console.error(
      "[SmartRespiratory] view render error:",
      error,
      info.componentStack
    );
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    const heading = this.props.label
      ? `${this.props.label} view could not be rendered`
      : "This view could not be rendered";

    return (
      <div className={styles.fallback} role="alert">
        <div className={styles.title}>{heading}</div>
        <p className={styles.text}>
          An unexpected error occurred while displaying this section. The rest
          of the analysis is unaffected — switch to another tab or re-run the
          analysis.
        </p>
        {error.message && <pre className={styles.detail}>{error.message}</pre>}
      </div>
    );
  }
}
