import React from 'react';
import { folderAPI } from '../services/api';
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

const FolderIcon = ({ color }: { color?: string }) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, flexShrink: 0 }}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
);

const FolderOpenIcon = ({ color }: { color?: string }) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, flexShrink: 0 }}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <path d="M2 10h20" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const ChevronUpIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
        <polyline points="18 15 12 9 6 15" />
    </svg>
);

const EjectIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v14M19 9l-7-7-7 7M5 21h14" />
    </svg>
);

const FOLDER_COLORS = [
  'var(--accent-primary)', 'var(--node-text-blue)', 'var(--node-text-green)',
  '#a16207', '#be185d', '#c2410c',
];

const Sidebar: React.FC<SidebarProps> = ({
    boards,
    activeBoardId,
    onSelectBoard,
    onCreateBoard,
    onDeleteBoard,
    userEmail: _userEmail,
    userId,
    theme: _theme,
    onToggleTheme: _onToggleTheme,
    currentView,
    onSelectView,
    isOpen,
    onToggleOpen,
}) => {
    const [folders, setFolders] = React.useState<any[]>([]);
    const [openFolderIds, setOpenFolderIds] = React.useState<string[]>([]);
    const [editingFolderId, setEditingFolderId] = React.useState<string | null>(null);
    const [colorPickerFor, setColorPickerFor] = React.useState<string | null>(null);
    const [dropTarget, setDropTarget] = React.useState<string | null>(null);

    const fetchFolders = async () => {
        try {
            const data = await folderAPI.getFolders();
            setFolders(data);
        } catch (err) {
            console.error("Failed to fetch folders", err);
        }
    };

    React.useEffect(() => {
        if (userId) {
            fetchFolders();
        }
    }, [boards, userId]);

    const handleCreateFolder = async () => {
        const name = prompt("Yeni klasör adı:");
        if (!name?.trim()) return;
        try {
            await folderAPI.createFolder(name.trim());
            fetchFolders();
        } catch (err) {
            console.error("Failed to create folder", err);
        }
    };

    const handleRenameFolder = async (folderId: string, newName: string) => {
        if (!newName.trim()) return;
        try {
            await folderAPI.updateFolder(folderId, { name: newName.trim() });
            fetchFolders();
        } catch (err) {
            console.error("Failed to rename folder", err);
        }
    };

    const handleColorFolder = async (folderId: string, color: string) => {
        try {
            await folderAPI.updateFolder(folderId, { color });
            fetchFolders();
        } catch (err) {
            console.error("Failed to update folder color", err);
        }
    };

    const handleDeleteFolder = async (folderId: string, folderName: string) => {
        if (!window.confirm(`"${folderName}" klasörünü silmek istediğinize emin misiniz? Panolarınız silinmeyecektir.`)) return;
        try {
            await folderAPI.deleteFolder(folderId);
            fetchFolders();
        } catch (err) {
            console.error("Failed to delete folder", err);
        }
    };

    const handleRemoveBoardFromFolder = async (folderId: string, boardId: string) => {
        try {
            await folderAPI.removeBoardFromFolder(folderId, boardId);
            fetchFolders();
        } catch (err) {
            console.error("Failed to remove board from folder", err);
        }
    };

    const toggleFolder = (folderId: string) => {
        setOpenFolderIds(prev => 
            prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
        );
    };



    // Kişisel: Kullanıcının kendi oluşturduğu ve bir ekibe atanmamış panolar
    const personalBoards = boards.filter(b => b.user_id === userId && !b.team_id);
    
    // Ekip/Ortak: Bir ekibe atanmış panolar VEYA başkası tarafından oluşturulup kullanıcıya paylaşılan (görev atanan) panolar
    const teamBoards = boards.filter(b => b.team_id || b.user_id !== userId);

    const personalFolders = folders.filter(f => !f.is_team_folder);
    const teamFolders = folders.filter(f => f.is_team_folder);

    // Track which board IDs are in personal folders
    const personalFolderBoardIds = new Set<string>(
        personalFolders.flatMap(f => f.board_ids || [])
    );

    // Personal boards that are not inside any folder
    const folderlessPersonalBoards = personalBoards.filter(b => !personalFolderBoardIds.has(b.id));

    return (
        <div className={`sidebar glass-panel ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 className="brand">Nodeva</h2>
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

                        {/* Kişisel Panolar Bölümü */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 className="nav-title" style={{ margin: 0 }}>Kişisel Panolar</h3>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                    onClick={handleCreateFolder}
                                    title="Yeni klasör oluştur"
                                    className="add-folder-btn-nav"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', padding: 2 }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                        <line x1="12" y1="11" x2="12" y2="17" />
                                        <line x1="9" y1="14" x2="15" y2="14" />
                                    </svg>
                                </button>
                                <button
                                    onClick={onCreateBoard}
                                    title="Yeni pano oluştur"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', padding: 2 }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Kişisel Klasörler */}
                        <ul className="board-list" style={{ marginBottom: 0 }}>
                            {personalFolders.map(folder => {
                                const isExpanded = openFolderIds.includes(folder.id);
                                const folderBoards = personalBoards.filter(b => (folder.board_ids || []).includes(b.id));
                                const isOver = dropTarget === folder.id;

                                return (
                                    <li key={folder.id} style={{ display: 'block', padding: 0, background: 'none', marginBottom: 6 }}>
                                        {/* Folder Header */}
                                        <div 
                                            className={`folder-row ${isExpanded ? 'open' : ''} ${isOver ? 'folder-row-drop-target' : ''}`}
                                            onClick={() => toggleFolder(folder.id)}
                                            onDragOver={(e) => { e.preventDefault(); setDropTarget(folder.id); }}
                                            onDragLeave={() => setDropTarget(null)}
                                            onDrop={async (e) => {
                                                e.preventDefault();
                                                const boardId = e.dataTransfer.getData('text/plain');
                                                if (boardId) {
                                                    try {
                                                        await folderAPI.addBoardToFolder(folder.id, boardId);
                                                        fetchFolders();
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }
                                                setDropTarget(null);
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', position: 'relative' }}
                                        >
                                            {/* Renk Noktası */}
                                            <div 
                                                className="folder-color-dot"
                                                style={{ backgroundColor: folder.color || 'var(--text-muted)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setColorPickerFor(colorPickerFor === folder.id ? null : folder.id);
                                                }}
                                            />

                                            {/* Renk Seçici Popover */}
                                            {colorPickerFor === folder.id && (
                                                <div className="folder-color-picker glass-panel" onClick={e => e.stopPropagation()}>
                                                    {FOLDER_COLORS.map(c => (
                                                        <div 
                                                            key={c} 
                                                            style={{ width: 14, height: 14, borderRadius: '50%', background: c, cursor: 'pointer', border: '1px solid var(--glass-border)' }}
                                                            onClick={() => {
                                                                handleColorFolder(folder.id, c);
                                                                setColorPickerFor(null);
                                                            }} 
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {isExpanded ? <FolderOpenIcon color={folder.color} /> : <FolderIcon color={folder.color} />}
                                            
                                            {/* Klasör Başlığı (Inline Düzenleme) */}
                                            {editingFolderId === folder.id ? (
                                                <input
                                                    autoFocus
                                                    defaultValue={folder.name}
                                                    onBlur={(e) => {
                                                        handleRenameFolder(folder.id, e.target.value);
                                                        setEditingFolderId(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') e.currentTarget.blur();
                                                        if (e.key === 'Escape') setEditingFolderId(null);
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', border: '1px solid var(--accent-primary)',
                                                      background: 'var(--bg-color)', borderRadius: 6, padding: '2px 6px', color: 'var(--text-primary)', width: '60%' }}
                                                />
                                            ) : (
                                                <span 
                                                    onDoubleClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); }}
                                                    style={{ fontSize: '0.88rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                >
                                                    {folder.name}
                                                </span>
                                            )}

                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 4 }}>
                                                ({folderBoards.length})
                                            </span>

                                            {/* Silme Butonu */}
                                            <button
                                                title="Klasörü sil"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginLeft: 'auto', padding: 2 }}
                                                className="sidebar-delete-btn"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>

                                            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                        </div>

                                        {/* Klasörün Panoları */}
                                        {isExpanded && (
                                            <div className="folder-board-indent">
                                                <ul className="board-list" style={{ paddingLeft: 0, border: 'none' }}>
                                                    {folderBoards.length === 0 && (
                                                        <li style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '6px 8px', listStyle: 'none' }}>
                                                            Klasör boş. Panoları sürükleyip bırakın.
                                                        </li>
                                                    )}
                                                    {folderBoards.map(board => (
                                                        <li
                                                            key={board.id}
                                                            className={board.id === activeBoardId && currentView === 'board' ? 'active' : ''}
                                                            draggable
                                                            onDragStart={(e) => { e.dataTransfer.setData('text/plain', board.id); }}
                                                            onClick={() => {
                                                                onSelectBoard(board.id);
                                                                onSelectView('board');
                                                            }}
                                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 8 }}
                                                        >
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center' }} title={board.title}>
                                                                <BoardIcon isTeam={false} />
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{board.title}</span>
                                                            </span>
                                                            <div style={{ display: 'flex', gap: 4 }}>
                                                                <button
                                                                    title="Klasörden çıkar"
                                                                    onClick={(e) => { e.stopPropagation(); handleRemoveBoardFromFolder(folder.id, board.id); }}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 6 }}
                                                                >
                                                                    <EjectIcon />
                                                                </button>
                                                                <button
                                                                    title="Panoyu sil"
                                                                    onClick={(e) => { e.stopPropagation(); onDeleteBoard(board.id, board.title); }}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 6 }}
                                                                    className="sidebar-delete-btn"
                                                                >
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Klasörsüz Kişisel Panolar */}
                        <ul className="board-list" style={{ marginTop: 0 }}>
                            {folderlessPersonalBoards.length === 0 && personalFolders.length === 0 && (
                                <li style={{ color: '#888', fontSize: '0.85rem', padding: '4px 0' }}>
                                    Henüz kişisel pano yok
                                </li>
                            )}
                            {folderlessPersonalBoards.map(board => (
                                <li
                                    key={board.id}
                                    className={board.id === activeBoardId && currentView === 'board' ? 'active' : ''}
                                    draggable
                                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', board.id); }}
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

                        {/* Ekip Panoları Bölümü */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
                            <h3 className="nav-title" style={{ margin: 0 }}>Ekip Panoları</h3>
                        </div>

                        {/* Ekip Klasörleri */}
                        <ul className="board-list" style={{ marginBottom: 0 }}>
                            {teamFolders.map(folder => {
                                const isExpanded = openFolderIds.includes(folder.id);
                                const folderBoards = teamBoards.filter(b => (folder.board_ids || []).includes(b.id));

                                return (
                                    <li key={folder.id} style={{ display: 'block', padding: 0, background: 'none', marginBottom: 6 }}>
                                        {/* Folder Header */}
                                        <div 
                                            className={`folder-row ${isExpanded ? 'open' : ''}`}
                                            onClick={() => toggleFolder(folder.id)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                                        >
                                            {isExpanded ? <FolderOpenIcon color={folder.color || 'var(--accent-primary)'} /> : <FolderIcon color={folder.color || 'var(--accent-primary)'} />}
                                            
                                            {/* Ekip klasörü inline düzenleme (sadece owner ise) */}
                                            {editingFolderId === folder.id ? (
                                                <input
                                                    autoFocus
                                                    defaultValue={folder.name}
                                                    onBlur={(e) => {
                                                        handleRenameFolder(folder.id, e.target.value);
                                                        setEditingFolderId(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') e.currentTarget.blur();
                                                        if (e.key === 'Escape') setEditingFolderId(null);
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', border: '1px solid var(--accent-primary)',
                                                      background: 'var(--bg-color)', borderRadius: 6, padding: '2px 6px', color: 'var(--text-primary)', width: '60%' }}
                                                />
                                            ) : (
                                                <span 
                                                    onDoubleClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (folder.user_id === userId) {
                                                            setEditingFolderId(folder.id); 
                                                        }
                                                    }}
                                                    style={{ fontSize: '0.88rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                >
                                                    {folder.name}
                                                </span>
                                            )}

                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 4 }}>
                                                ({folderBoards.length})
                                            </span>

                                            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                        </div>

                                        {/* Klasörün Panoları */}
                                        {isExpanded && (
                                            <div className="folder-board-indent">
                                                <ul className="board-list" style={{ paddingLeft: 0, border: 'none' }}>
                                                    {folderBoards.length === 0 && (
                                                        <li style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '6px 8px', listStyle: 'none' }}>
                                                            Ekibe ait pano yok.
                                                        </li>
                                                    )}
                                                    {folderBoards.map(board => (
                                                        <li
                                                            key={board.id}
                                                            className={board.id === activeBoardId && currentView === 'board' ? 'active' : ''}
                                                            onClick={() => {
                                                                onSelectBoard(board.id);
                                                                onSelectView('board');
                                                            }}
                                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 8 }}
                                                        >
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center' }} title={board.title}>
                                                                <BoardIcon isTeam={true} />
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{board.title}</span>
                                                            </span>
                                                            {board.user_id === userId && (
                                                                <button
                                                                    title="Panoyu sil"
                                                                    onClick={(e) => { e.stopPropagation(); onDeleteBoard(board.id, board.title); }}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 6 }}
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
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Klasörsüz Ortak/Ekip Panoları (Örn: paylaşılan panolar) */}
                        <ul className="board-list" style={{ marginTop: 0 }}>
                            {teamBoards.filter(b => !teamFolders.some(tf => (tf.board_ids || []).includes(b.id))).map(board => (
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
                </div>
            )}
        </div>
    );
};

export default Sidebar;

