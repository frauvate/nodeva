import React from 'react';
import { supabase } from '../lib/supabase';
import './Sidebar.css';

interface SidebarProps {
    boards: any[];
    activeBoardId: string | null;
    onSelectBoard: (id: string) => void;
    onCreateBoard: () => void;
    onDeleteBoard: (id: string, title: string) => void;
    userEmail: string;
    userId: string;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    currentView: string;
    onSelectView: (view: string) => void;
    isOpen: boolean;
    onToggleOpen: () => void;
}

const BoardIcon: React.FC<{ isTeam: boolean }> = ({ isTeam }) => {
    if (isTeam) {
        return (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle', flexShrink: 0 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        );
    }
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle', flexShrink: 0 }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
};

const Sidebar: React.FC<SidebarProps> = ({
    boards,
    activeBoardId,
    onSelectBoard,
    onCreateBoard,
    onDeleteBoard,
    userEmail,
    userId,
    theme,
    onToggleTheme,
    currentView,
    onSelectView,
    isOpen,
    onToggleOpen,
}) => {

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const avatarLetter = userEmail ? userEmail[0].toUpperCase() : '?';

    // Kişisel: Kullanıcının kendi oluşturduğu ve bir ekibe atanmamış panolar
    const personalBoards = boards.filter(b => b.user_id === userId && !b.team_id);
    
    // Ekip/Ortak: Bir ekibe atanmış panolar VEYA başkası tarafından oluşturulup kullanıcıya paylaşılan (görev atanan) panolar
    const teamBoards = boards.filter(b => b.team_id || b.user_id !== userId);

    return (
        <div className={`sidebar glass-panel ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 className="brand">Nodeva</h2>
                    <button className="theme-toggle" onClick={onToggleTheme} title="Temayı değiştir">
                        {theme === 'light' ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        )}
                    </button>
                </div>
                <button className="toggle-btn" onClick={onToggleOpen}>
                    {isOpen ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    )}
                </button>
            </div>

            {isOpen && (
                <div className="sidebar-content">
                    <nav>
                        <div className="sidebar-nav-tabs">
                            <button 
                                className={`sidebar-nav-tab ${currentView === 'board' ? 'active' : ''}`}
                                onClick={() => {
                                    onSelectView('board');
                                    if (!activeBoardId && boards.length > 0) {
                                        onSelectBoard(boards[0].id);
                                    }
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="7" height="7" />
                                    <rect x="14" y="3" width="7" height="7" />
                                    <rect x="14" y="14" width="7" height="7" />
                                    <rect x="3" y="14" width="7" height="7" />
                                </svg>
                                <span>Panolarım</span>
                            </button>
                            <button 
                                className={`sidebar-nav-tab ${currentView === 'templates' ? 'active' : ''}`}
                                onClick={() => onSelectView('templates')}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                    <polyline points="2 17 12 22 22 17" />
                                    <polyline points="2 12 12 17 22 12" />
                                </svg>
                                <span>Şablonlar</span>
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 className="nav-title" style={{ margin: 0 }}>Kişisel Panolar</h3>
                            <button
                                onClick={onCreateBoard}
                                title="Yeni pano oluştur"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#4facfe', display: 'flex', alignItems: 'center' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>
                        </div>
                        <ul className="board-list">
                            {personalBoards.length === 0 && (
                                <li style={{ color: '#888', fontSize: '0.85rem', padding: '4px 0' }}>
                                    Henüz kişisel pano yok
                                </li>
                            )}
                            {personalBoards.map(board => (
                                <li
                                    key={board.id}
                                    className={board.id === activeBoardId && currentView === 'board' ? 'active' : ''}
                                    onClick={() => {
                                        onSelectBoard(board.id);
                                        onSelectView('board');
                                    }}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center' }} title={board.title}>
                                        <BoardIcon isTeam={false} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{board.title}</span>
                                    </span>
                                    <button
                                        title="Panoyu sil"
                                        onClick={(e) => { e.stopPropagation(); onDeleteBoard(board.id, board.title); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 6, transition: 'all 0.2s', marginLeft: 6, flexShrink: 0 }}
                                        className="sidebar-delete-btn"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
                            <h3 className="nav-title" style={{ margin: 0 }}>Ekip Panoları</h3>
                        </div>
                        <ul className="board-list">
                            {teamBoards.length === 0 && (
                                <li style={{ color: '#888', fontSize: '0.85rem', padding: '4px 0' }}>
                                    Henüz ortak pano yok
                                </li>
                            )}
                            {teamBoards.map(board => (
                                <li
                                    key={board.id}
                                    className={board.id === activeBoardId && currentView === 'board' ? 'active' : ''}
                                    onClick={() => {
                                        onSelectBoard(board.id);
                                        onSelectView('board');
                                    }}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center' }} title={board.title}>
                                        <BoardIcon isTeam={!!board.team_id} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{board.title}</span>
                                    </span>
                                    {board.user_id === userId && (
                                        <button
                                            title="Panoyu sil"
                                            onClick={(e) => { e.stopPropagation(); onDeleteBoard(board.id, board.title); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 6, transition: 'all 0.2s', marginLeft: 6, flexShrink: 0 }}
                                            className="sidebar-delete-btn"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className="user-section">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1, overflow: 'hidden' }}>
                            <div className="avatar">{avatarLetter}</div>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                {userEmail || 'Kullanıcı'}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Çıkış yap"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', fontSize: '0.9rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            <span>Çıkış</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;

