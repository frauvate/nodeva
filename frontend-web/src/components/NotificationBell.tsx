import React, { useState, useEffect, useRef } from 'react';
import { notificationAPI } from '../services/api';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    board_id?: string;
    read: boolean;
    created_at: string;
    assigner_email?: string;
}

interface NotificationBellProps {
    onNavigateToBoard?: (boardId: string) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigateToBoard }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    const fetchNotifications = async () => {
        try {
            const data = await notificationAPI.getNotifications();
            setNotifications(Array.isArray(data) ? data : []);
        } catch { /* sessizce */ }
    };

    // İlk yükleme + 30s polling
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30_000);
        return () => clearInterval(interval);
    }, []);

    // Dışarı tıklayınca kapat
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen = () => {
        setOpen(o => !o);
    };

    const handleMarkRead = async (notif: Notification) => {
        if (!notif.read) {
            await notificationAPI.markRead(notif.id).catch(() => {});
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        }
        if (notif.board_id && onNavigateToBoard) {
            onNavigateToBoard(notif.board_id);
            setOpen(false);
        }
    };

    const handleMarkAllRead = async () => {
        await notificationAPI.markAllRead().catch(() => {});
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const formatTime = (iso: string) => {
        try {
            const d = new Date(iso);
            const diff = (Date.now() - d.getTime()) / 1000;
            if (diff < 60) return 'Az önce';
            if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
            return `${Math.floor(diff / 86400)}g`;
        } catch { return ''; }
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* Çan butonu */}
            <button
                id="notif-bell-btn"
                onClick={handleOpen}
                title="Bildirimler"
                style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px 8px',
                    borderRadius: 8,
                    color: 'var(--text-secondary)',
                    fontSize: '1.3rem',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: 2, right: 2,
                        background: '#ef4444', color: '#fff',
                        borderRadius: '50%', fontSize: '0.6rem',
                        fontWeight: 800, minWidth: 16, height: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px', lineHeight: 1, border: '2px solid var(--panel-bg)',
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 320,
                    maxHeight: 420,
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 14,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    zIndex: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderBottom: '1px solid var(--glass-border)',
                    }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            Bildirimler {unreadCount > 0 && <span style={{ color: 'var(--accent-primary)', marginLeft: 4 }}>({unreadCount})</span>}
                        </span>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                                Tümünü oku
                            </button>
                        )}
                    </div>

                    {/* Liste */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔔</div>
                                <div style={{ fontSize: '0.85rem' }}>Bildirim yok</div>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => handleMarkRead(n)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 10,
                                        padding: '10px 14px',
                                        cursor: n.board_id ? 'pointer' : 'default',
                                        background: n.read ? 'transparent' : 'var(--accent-soft)',
                                        borderBottom: '1px solid var(--glass-border)',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => { if (n.board_id) (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'var(--accent-soft)'; }}
                                >
                                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                                        {n.type === 'task_assigned' ? '📋' : '📩'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                                            {n.title}
                                            {!n.read && (
                                                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#6366f1', marginLeft: 6, verticalAlign: 'middle' }} />
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.body}</div>
                                        {n.assigner_email && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                                                {n.assigner_email} tarafından
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        {formatTime(n.created_at)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
