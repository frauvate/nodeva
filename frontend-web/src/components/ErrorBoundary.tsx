import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
    public state: State = { hasError: false, error: null };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    height: '100vh', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center', fontFamily: 'Inter, sans-serif', gap: 16
                }}>
                    <h2 style={{ color: '#d32f2f' }}>Bir hata oluştu</h2>
                    <p style={{ color: '#555', maxWidth: 400, textAlign: 'center' }}>{this.state.error?.message}</p>
                    <button onClick={() => window.location.reload()} style={{
                        padding: '10px 24px', borderRadius: 8, border: 'none',
                        background: '#4facfe', color: 'white', cursor: 'pointer'
                    }}>
                        Yenile
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
