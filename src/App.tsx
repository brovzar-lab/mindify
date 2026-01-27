import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Component, type ReactNode } from 'react';
import { ItemsProvider } from '@/context/items-context';
import { CapturePage } from '@/pages/capture';
import { ActionsPage } from '@/pages/actions';
import { InboxPage } from '@/pages/inbox-new';

// Error Boundary to catch crashes and show recovery UI
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[MINDIFY] App crashed:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center p-6"
          style={{ backgroundColor: '#F5F0E8' }}
        >
          <div className="bg-white rounded-2xl p-8 shadow-sm max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-[#FEE2E2] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-[#1A1A1A] mb-2">
              Something went wrong
            </h1>
            <p className="text-[#6B6B6B] mb-6">
              Don't worry, your thoughts are safe. Let's get back on track.
            </p>
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-4 bg-[#1A1A1A] text-white rounded-xl font-medium"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-[#EDE8DF] text-[#1A1A1A] rounded-xl font-medium"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F0E8', color: '#1A1A1A' }}>
      <Routes>
        <Route path="/" element={<CapturePage />} />
        <Route path="/actions" element={<ActionsPage />} />
        <Route path="/inbox" element={<InboxPage />} />
      </Routes>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ItemsProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ItemsProvider>
    </ErrorBoundary>
  );
}

export default App;
