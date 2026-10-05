import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Farm2Home Startup Exception Caught by ErrorBoundary]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: '480px', width: '100%', backgroundColor: '#121418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#34d399' }}>Farm2Home Interface Recovery</h2>
            <p style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '16px' }}>The application encountered an unexpected startup state. You can reload the interface or reset session cache.</p>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', backgroundColor: '#000000', padding: '12px', borderRadius: '8px', color: '#f87171', textAlign: 'left', marginBottom: '16px', maxHeight: '120px', overflowY: 'auto' }}>
              {this.state.error?.message || 'Unknown error'}
            </div>
            <button
              onClick={() => {
                try { localStorage.removeItem('f2h_auth_session_token'); } catch {}
                try { localStorage.removeItem('f2h_logged_out'); } catch {}
                window.location.reload();
              }}
              style={{ padding: '10px 20px', backgroundColor: '#10b981', color: '#09090b', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
