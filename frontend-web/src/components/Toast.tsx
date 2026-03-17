import React, { useCallback, useState } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastProps {
    toasts: ToastItem[];
    onRemove: (id: string) => void;
}

// ── Rendered toast stack ──────────────────────────────────────────
export const ToastContainer: React.FC<ToastProps> = ({ toasts, onRemove }) => (
    <div className="toast-container">
        {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
                <span className="toast-icon">
                    {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
                </span>
                <span className="toast-message">{t.message}</span>
                <button className="toast-close" onClick={() => onRemove(t.id)}>×</button>
            </div>
        ))}
    </div>
);

// ── Hook ──────────────────────────────────────────────────────────
export function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, showToast, removeToast };
}
