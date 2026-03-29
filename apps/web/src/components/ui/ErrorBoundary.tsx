import { AlertCircle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

type ErrorBoundaryProps = {
  children: ReactNode;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const msg = this.state.error.message;
      return (
        <div className="flex min-h-[120px] flex-col items-center justify-center gap-4 px-4 py-8 text-center">
          <AlertCircle size={48} className="text-kern-danger" aria-hidden />
          <p className="text-sm font-medium text-kern-text">Something went wrong</p>
          {import.meta.env.DEV ? (
            <code className="max-w-sm break-all rounded-kern-md bg-kern-surface-2 p-3 text-left text-xs text-kern-text-2">
              {msg}
            </code>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
