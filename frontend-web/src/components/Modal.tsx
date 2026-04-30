import React, { useState, useEffect, useRef } from 'react';
import './Modal.css';

/* ── Generic Modal ─────────────────────────────────────────────── */
interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card glass-panel" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
};

/* ── Create Board Modal ────────────────────────────────────────── */
interface CreateBoardModalProps {
    onConfirm: (title: string, teamId?: string) => void;
    onClose: () => void;
    ownedTeams?: { id: string; name: string }[];
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ onConfirm, onClose, ownedTeams = [] }) => {
    const [value, setValue] = useState('');
    const [teamId, setTeamId] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) { 
            onConfirm(value.trim(), teamId || undefined); 
            onClose(); 
        }
    };

    return (
        <Modal title="Yeni Pano Oluştur" onClose={onClose}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Pano adı..."
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    className="modal-input"
                    maxLength={60}
                />
                
                {ownedTeams.length > 0 && (
                    <select 
                        value={teamId} 
                        onChange={e => setTeamId(e.target.value)}
                        className="modal-input"
                        style={{ cursor: 'pointer' }}
                    >
                        <option value="">Kişisel Pano</option>
                        {ownedTeams.map(t => (
                            <option key={t.id} value={t.id}>{t.name} Ekibi</option>
                        ))}
                    </select>
                )}
                
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" className="modal-btn-secondary" onClick={onClose}>İptal</button>
                    <button type="submit" className="modal-btn-primary" disabled={!value.trim()}>Oluştur</button>
                </div>
            </form>
        </Modal>
    );
};

/* ── Confirm Modal ─────────────────────────────────────────────── */
interface ConfirmModalProps {
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    message,
    confirmLabel = 'Evet',
    danger = false,
    onConfirm,
    onClose,
}) => (
    <Modal title="Onay" onClose={onClose}>
        <p style={{ marginBottom: 20, fontSize: '0.9rem', color: '#444' }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="modal-btn-secondary" onClick={onClose}>İptal</button>
            <button
                className={danger ? 'modal-btn-danger' : 'modal-btn-primary'}
                onClick={() => { onConfirm(); onClose(); }}
            >{confirmLabel}</button>
        </div>
    </Modal>
);
