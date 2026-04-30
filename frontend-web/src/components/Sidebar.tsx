import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Sidebar.css';

interface SidebarProps {
    boards: any[];
    activeBoardId: string | null;
    onSelectBoard: (id: string) => void;
    onCreateBoard: () => void;
    onDeleteBoard: (id: string, title: string) => void;
    userEmail: string;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    boards,
    activeBoardId,
    onSelectBoard,
    onCreateBoard,
    onDeleteBoard,
    userEmail,
    theme,
    onToggleTheme,
}) => {
    const [isOpen, setIsOpen] = useState(true);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const avatarLetter = userEmail ? userEmail[0].toUpperCase() : '?';

    return (
        <div className={`sidebar glass-panel ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 className="brand">Nodeva</h2>
                    <button className="theme-toggle" onClick={onToggleTheme} title="Temayı değiştir">
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                </div>
                <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? '◀' : '▶'}
                </button>
            </div>

            {isOpen && (
                <div className="sidebar-content">
                    <nav>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 className="nav-title" style={{ margin: 0 }}>Kişisel Panolar</h3>
                            <button
                                onClick={onCreateBoard}
                                title="Yeni pano oluştur"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#4facfe' }}
                            >+</button>
                        </div>
                        <ul className="board-list">
                            {boards.filter(b => !b.team_id).length === 0 && (
                                <li style={{ color: '#888', fontSize: '0.85rem', padding: '4px 0' }}>
                                    Henüz kişisel pano yok
                                </li>
                            )}
                            {boards.filter(b => !b.team_id).map(board => (
                                <li
                                    key={board.id}
                                    className={board.id === activeBoardId ? 'active' : ''}
                                    onClick={() => onSelectBoard(board.id)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={board.title}>
                                        {board.title}
                                    </span>
                                    <button
                                        title="Panoyu sil"
                                        onClick={(e) => { e.stopPropagation(); onDeleteBoard(board.id, board.title); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', fontSize: '1rem', marginLeft: 6, flexShrink: 0 }}
                                    >×</button>
                                </li>
                            ))}
                        </ul>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
                            <h3 className="nav-title" style={{ margin: 0 }}>Ekip Panoları</h3>
                        </div>
                        <ul className="board-list">
                            {boards.filter(b => b.team_id).length === 0 && (
                                <li style={{ color: '#888', fontSize: '0.85rem', padding: '4px 0' }}>
                                    Henüz ortak pano yok
                                </li>
                            )}
                            {boards.filter(b => b.team_id).map(board => (
                                <li
                                    key={board.id}
                                    className={board.id === activeBoardId ? 'active' : ''}
                                    onClick={() => onSelectBoard(board.id)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={board.title}>
                                        🤝 {board.title}
                                    </span>
                                    <button
                                        title="Panoyu sil"
                                        onClick={(e) => { e.stopPropagation(); onDeleteBoard(board.id, board.title); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', fontSize: '1rem', marginLeft: 6, flexShrink: 0 }}
                                    >×</button>
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
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', fontSize: '0.9rem', flexShrink: 0 }}
                        >Çıkış</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;

