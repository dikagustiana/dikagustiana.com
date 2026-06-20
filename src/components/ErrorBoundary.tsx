import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Global render-error boundary. A thrown error in any route renders a calm,
 * recoverable fallback instead of a white screen. Errors are logged only in
 * development to keep the production console clean.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, info.componentStack);
    }
  }

  reset = () => {
    // A failed lazy/dynamic import caches the rejected module promise, so a soft
    // state reset would immediately re-throw. For chunk-load errors, a full reload
    // is the only real recovery; for ordinary render errors, a soft reset is enough.
    const msg = this.state.error?.message ?? '';
    const isChunkError = /dynamically imported module|Loading chunk|importing a module|Failed to fetch/i.test(msg);
    if (isChunkError) {
      window.location.reload();
      return;
    }
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return (
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
        >
          <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl font-display font-semibold">Something went wrong</h1>
            <p className="max-w-md text-sm text-muted-foreground">
              An unexpected error occurred while rendering this page. You can try again, or return to
              the homepage.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.reset}>
              Try again
            </Button>
            <Button onClick={() => (window.location.href = "/")}>Go home</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
