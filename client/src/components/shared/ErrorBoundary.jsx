import { Component } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In production, forward to an error-tracking service (Sentry, etc.)
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="card max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-50 rounded-full">
              <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-5">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <button className="btn-secondary" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
