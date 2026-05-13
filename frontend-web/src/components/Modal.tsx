import React, { useState, useEffect, useRef } from 'react';
import './Modal.css';

/* ── Generic Modal ─────────────────────────────────────────────── */
interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

export const Modal: React.FC<ModalProps> = ({ title, onClose, children, className = '' }) => {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className={`modal-card glass-panel ${className}`} onClick={e => e.stopPropagation()}>
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
    onConfirm: (title: string, teamId?: string, template?: string) => void;
    onClose: () => void;
    ownedTeams?: { id: string; name: string }[];
}

const TEMPLATES = [
    {
        id: 'basic',
        title: 'Temel İş Akışı',
        desc: 'Standart dikdörtgen görev ve not panosu.',
        preview: (
            <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: 40, height: 30, background: 'var(--node-blue)', borderRadius: 4, border: '1px solid var(--glass-border-subtle)' }} />
                <div style={{ width: 40, height: 30, background: 'var(--node-green)', borderRadius: 4, border: '1px solid var(--glass-border-subtle)' }} />
            </div>
        )
    },
    {
        id: 'flowchart',
        title: 'Akış Şeması (Flowchart)',
        desc: 'Kapsül, elmas ve dikdörtgen şekillerle karar akışları.',
        preview: (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <div style={{ width: 30, height: 20, background: 'var(--node-blue)', borderRadius: 20, border: '1px solid var(--glass-border-subtle)' }} />
                <div style={{ width: 12, height: 2, background: 'var(--text-muted)' }} />
                <div style={{ width: 20, height: 20, background: 'var(--node-purple)', transform: 'rotate(45deg)', border: '1px solid var(--glass-border-subtle)' }} />
                <div style={{ width: 12, height: 2, background: 'var(--text-muted)' }} />
                <div style={{ width: 30, height: 20, background: 'var(--node-pink)', borderRadius: 4, border: '1px solid var(--glass-border-subtle)' }} />
            </div>
        )
    }
];

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ onConfirm, onClose, ownedTeams = [] }) => {
    const [value, setValue] = useState('');
    const [teamId, setTeamId] = useState<string>('');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('basic');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) { 
            onConfirm(value.trim(), teamId || undefined, selectedTemplate); 
            onClose(); 
        }
    };

    return (
        <Modal title="Yeni Pano Oluştur" onClose={onClose} className="modal-card-large">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="template-grid">
                    {TEMPLATES.map(t => (
                        <div 
                            key={t.id} 
                            className={`template-card ${selectedTemplate === t.id ? 'selected' : ''}`}
                            onClick={() => setSelectedTemplate(t.id)}
                        >
                            <div className="template-preview">
                                {t.preview}
                            </div>
                            <div className="template-title">{t.title}</div>
                            <div className="template-desc">{t.desc}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 14, flexDirection: 'column' }}>
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
                </div>
                
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: '10px' }}>
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
