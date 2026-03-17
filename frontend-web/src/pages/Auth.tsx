import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ToastContainer, useToast } from '../components/Toast';
import './Auth.css';

interface AuthProps {
    onSession: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSession }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const { toasts, showToast, removeToast } = useToast();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                showToast('Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
                setIsSignUp(false);
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onSession();
            }
        } catch (error: any) {
            showToast(error.error_description || error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass-panel">
                <h2 className="brand" style={{ marginBottom: '16px' }}>Nodeva</h2>
                <h3 className="auth-title">{isSignUp ? 'Yeni Hesap Oluştur' : 'Giriş Yap'}</h3>

                <form onSubmit={handleAuth} className="auth-form">
                    <input
                        type="email"
                        placeholder="E-posta"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="auth-input"
                    />
                    <input
                        type="password"
                        placeholder="Şifre"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="auth-input"
                    />
                    <button type="submit" disabled={loading} className="auth-submit-btn">
                        {loading ? 'Bekleniyor...' : (isSignUp ? 'Kayıt Ol' : 'Giriş')}
                    </button>
                </form>

                <p className="auth-switch">
                    {isSignUp ? 'Zaten hesabınız var mı? ' : 'Hesabınız yok mu? '}
                    <button type="button" className="auth-switch-btn" onClick={() => setIsSignUp(!isSignUp)}>
                        {isSignUp ? 'Giriş Yap' : 'Kayıt Ol'}
                    </button>
                </p>
            </div>
            {/* Toast notifications */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
    );
};

export default Auth;
