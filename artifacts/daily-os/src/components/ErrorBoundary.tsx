import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card rounded-2xl p-6 mb-6 flex items-center gap-4 border border-red-500/20 bg-red-500/5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="text-red-400" size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-red-300">
              {this.props.name ?? "Component"} failed to load
            </p>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              {this.state.error?.message ?? "Unknown error"}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="ml-auto text-xs text-slate-400 hover:text-slate-300 underline"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
