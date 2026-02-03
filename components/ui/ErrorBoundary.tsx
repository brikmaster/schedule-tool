"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--ss-background)] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-2xl font-semibold text-[var(--ss-text)] mb-4">
                Something went wrong
              </h2>
              <p className="text-[var(--ss-text-light)] mb-6">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="ss-button-primary"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
