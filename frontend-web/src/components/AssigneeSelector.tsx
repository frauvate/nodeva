import React, { useState, useEffect, useRef } from 'react';
import { userAPI } from '../services/api';

export interface AssigneeMember {
    email: string;
    id: string;
    is_self?: boolean;
}

interface AssigneeSelectorProps {
    boardId: string;
    currentAssignee: string;           // e-posta
    currentUserEmail: string;
    onSelect: (email: string) => void; // '' = temizle
    onInvite?: (email: string) => void; // ekip üyesi değilse davet et
}

const getAvatar = (email: string) => email ? email[0].toUpperCase() : '?';
const avatarColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const getColor = (email: string) => avatarColors[email.charCodeAt(0) % avatarColors.length];

const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({
    boardId,
    currentAssignee,
    currentUserEmail: _,
    onSelect,
    onInvite,
}) => {
    const [open, setOpen] = useState(false);
    const [members, setMembers] = useState<AssigneeMember[]>([]);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState<AssigneeMember[]>([]);
    const [searching, setSearching] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Dışarı tıklayınca kapat
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Pano üyelerini yükle
    useEffect(() => {
        if (!open) return;
        setLoading(true);
        userAPI.getBoardMembers(boardId)
            .then(data => setMembers(Array.isArray(data) ? data : []))
            .catch(() => setMembers([]))
            .finally(() => setLoading(false));
    }, [open, boardId]);

    // Kullanıcı arama (debounce)
    useEffect(() => {
        if (searchEmail.length < 3) { setSearchResults([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await userAPI.searchUser(searchEmail);
                setSearchResults(Array.isArray(res) ? res : []);
            } catch { setSearchResults([]); }
            finally { setSearching(false); }
        }, 400);
        return () => clearTimeout(t);
    }, [searchEmail]);

    const displayList = searchEmail.length >= 3 ? searchResults : members;
    const isNonMember = searchEmail.length >= 3 && searchResults.length === 0 && !searching;

    const handleSelect = (email: string) => {
        onSelect(email);
        setOpen(false);
        setSearchEmail('');
        setSearchResults([]);
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* Trigger butonu */}
            <div
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid var(--glass-border)',
                    background: 'var(--bg-color)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
            >
                {currentAssignee ? (
                    <>
                        <span style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: getColor(currentAssignee),
                            color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>{getAvatar(currentAssignee)}</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {currentAssignee}
                        </span>
                        <span
                            onClick={e => { e.stopPropagation(); onSelect(''); }}
                            style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: 2 }}
                            title="Atamayı kaldır"
                        >✕</span>
                    </>
                ) : (
                    <span style={{ color: 'var(--text-muted)' }}>👤 Kişi seç...</span>
                )}
            </div>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    zIndex: 500,
                    overflow: 'hidden',
                    minWidth: 240,
                }}>
                    {/* Arama */}
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--glass-border)' }}>
                        <input
                            autoFocus
                            value={searchEmail}
                            onChange={e => setSearchEmail(e.target.value)}
                            placeholder="E-posta ile ara..."
                            onMouseDown={e => e.stopPropagation()}
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                padding: '6px 10px', borderRadius: 8,
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-color)',
                                color: 'var(--text-primary)',
                                fontSize: '0.82rem', outline: 'none',
                            }}
                        />
                    </div>

                    {/* Üye listesi */}
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        {loading && (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                Yükleniyor...
                            </div>
                        )}
                        {!loading && displayList.length === 0 && !isNonMember && searchEmail.length < 3 && (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                Üye bulunamadı
                            </div>
                        )}
                        {displayList.map(member => (
                            <div
                                key={member.email}
                                onClick={() => handleSelect(member.email)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '8px 12px', cursor: 'pointer',
                                    background: currentAssignee === member.email ? 'var(--accent-soft)' : 'transparent',
                                    transition: 'background 0.12s',
                                }}
                                onMouseEnter={e => { if (currentAssignee !== member.email) (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)'; }}
                                onMouseLeave={e => { if (currentAssignee !== member.email) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                                <span style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: getColor(member.email),
                                    color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>{getAvatar(member.email)}</span>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {member.email}
                                        {member.is_self && <span style={{ marginLeft: 6, fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 700 }}>(Siz)</span>}
                                    </div>
                                </div>
                                {currentAssignee === member.email && (
                                    <span style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>✓</span>
                                )}
                            </div>
                        ))}

                        {/* Üye değilse davet seçeneği */}
                        {isNonMember && searchEmail.includes('@') && (
                            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                                    "{searchEmail}" bu panoda üye değil.
                                </div>
                                {onInvite && (
                                    <button
                                        onClick={() => { onInvite(searchEmail); setOpen(false); setSearchEmail(''); }}
                                        style={{
                                            width: '100%', padding: '6px', borderRadius: 8,
                                            border: '1.5px solid var(--accent-primary)',
                                            background: 'transparent', color: 'var(--accent-primary)',
                                            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                                        }}
                                    >
                                        + Ekip daveti gönder
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssigneeSelector;
