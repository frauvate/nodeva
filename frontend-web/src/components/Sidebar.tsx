import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Sidebar.css';

interface SidebarProps {
    boards: any[];
    activeBoardId: string | null;
    onSelectBoard: (id: string) => void;
    onCreateBoard: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ boards, activeBoardId, onSelectBoard, onCreateBoard }) => {
    const [isOpen, setIsOpen] = useState(true);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className={`sidebar glass-panel ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                <h2 className="brand">Nodeva</h2>
                <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? '◀' : '▶'}
                </button>
            </div>

            {isOpen && (
                <div className="sidebar-content">
                    <nav>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 className="nav-title" style={{ margin: 0 }}>Panolarım</h3>
                            <button onClick={onCreateBoard} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#4facfe' }}>+</button>
                        </div>
                        <ul className="board-list">
                            {boards.map(board => (
                                <li
                                    key={board._id}
                                    className={board._id === activeBoardId ? 'active' : ''}
                                    onClick={() => onSelectBoard(board._id)}
                                >
                                    {board.title}
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div className="user-section">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1 }}>
                            <div className="avatar">A</div>
                            <span>Kullanıcı</span>
                        </div>
                        <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', fontSize: '0.9rem' }}>Çıkış</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
