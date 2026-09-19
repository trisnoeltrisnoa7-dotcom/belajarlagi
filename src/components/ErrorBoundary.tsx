import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CBT App ErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      window.location.href = '/';
    }
  };

  private handleResetCache = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('cbt_active_view_mode_v1');
        localStorage.removeItem('cbt_student_active_schedule_role');
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
      if (typeof caches !== 'undefined' && caches.keys) {
        caches.keys().then((keys) => {
          Promise.all(keys.map((k) => caches.delete(k))).finally(() => {
            window.location.href = '/';
          });
        }).catch(() => {
          window.location.href = '/';
        });
      } else {
        window.location.href = '/';
      }
    } catch {
      window.location.href = '/';
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold text-white">Terjadi Kendala Tampilan</h1>
              <p className="text-sm text-slate-400">
                Aplikasi mengalami kendala sementara saat memuat antarmuka. Anda dapat menyegarkan halaman atau mereset data sesi.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-left text-xs font-mono text-rose-300 max-h-28 overflow-y-auto">
                <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Reset Sesi</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
