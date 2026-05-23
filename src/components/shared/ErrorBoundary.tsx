"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "../ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught ERP UI error boundary caught exception:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in">
          <div className="p-4 bg-rose-50 rounded-full text-rose-500 dark:bg-rose-950/20 mb-6 border border-rose-100 dark:border-rose-900/30">
            <AlertTriangle className="h-10 w-10" />
          </div>
          
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Something went wrong in the console
          </h1>
          
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6 leading-relaxed">
            The ERP operations interface encountered an unexpected rendering exception. Our automatic integrity bounds prevented data corruption.
          </p>

          {this.state.error && (
            <div className="w-full max-w-lg mb-8 p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-150 dark:border-zinc-800 text-left font-mono text-xs text-rose-600 dark:text-rose-400 overflow-x-auto shadow-inner max-h-40">
              {this.state.error.stack || this.state.error.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={this.handleReset}
              className="flex items-center gap-2 font-bold shadow-md shadow-primary/20"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/dashboard")}
              className="flex items-center gap-2 font-bold"
            >
              <Home className="h-4 w-4" />
              Go to Home Screen
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
