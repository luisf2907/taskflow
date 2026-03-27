"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8">
          <div
            className="w-14 h-14 rounded-[20px] flex items-center justify-center"
            style={{ background: "var(--tf-danger-bg)" }}
          >
            <AlertTriangle size={24} style={{ color: "var(--tf-danger)" }} />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-bold" style={{ color: "var(--tf-text)" }}>
              Algo deu errado
            </p>
            <p className="text-[13px] mt-1 max-w-sm" style={{ color: "var(--tf-text-tertiary)" }}>
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            {this.state.error && (
              <p className="text-[11px] mt-2 font-mono max-w-md truncate" style={{ color: "var(--tf-text-tertiary)" }}>
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-[10px] text-white"
            style={{ background: "var(--tf-accent)" }}
          >
            <RotateCcw size={14} />
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
