import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Toolbar from '../components/Toolbar';
import Canvas from '../components/Canvas';
import { CreateBoardModal, ConfirmModal } from '../components/Modal';
import { ToastContainer, useToast } from '../components/Toast';
import TeamsPanel from '../components/TeamsPanel';
import NotificationBell from '../components/NotificationBell';
import { boardAPI, teamAPI } from '../services/api';
import { supabase } from '../lib/supabase';
import '../App.css';

const Dashboard: React.FC = () => {
    const [boards, setBoards] = useState<any[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [activeBoardTemplate, setActiveBoardTemplate] = useState<string>('basic');
    const [refreshKey, setRefreshKey] = useState(0);
    const [userEmail, setUserEmail] = useState('');
    const [userId, setUserId] = useState('');
    const [ownedTeams, setOwnedTeams] = useState<any[]>([]);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
    const [showTeamsPanel, setShowTeamsPanel] = useState(false);

    // Pending team request badge
    const [pendingRequestCount, setPendingRequestCount] = useState(0);

    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserEmail(session?.user?.email || '');
            setUserId(session?.user?.id || '');
        });
    }, []);

    const fetchTeamsData = async () => {
        if (!userId) return;
        try {
            const allTeams = await teamAPI.getTeams();
            setOwnedTeams(allTeams.filter((t: any) => t.owner_id === userId));
        } catch (error) {
            // Sessizce başarısız ol
        }
    };

    useEffect(() => {
        if (userId) {
            fetchTeamsData();
        }
    }, [userId]);

    const fetchBoards = async () => {
        try {
            const data = await boardAPI.getBoards();
            setBoards(data);
            if (data.length > 0 && !activeBoardId) {
                setActiveBoardId(data[0].id);
            }
        } catch (error) {
            showToast('Panolar yüklenemedi. Lütfen tekrar deneyin.', 'error');
        }
    };

    useEffect(() => { fetchBoards(); }, [refreshKey]);

    // Fetch full board data when active board changes to get template
    useEffect(() => {
        if (!activeBoardId) return;
        boardAPI.getBoard(activeBoardId).then((board: any) => {
            // If template is saved use it; otherwise detect from node types (legacy boards)
            if (board.template && board.template !== 'basic') {
                setActiveBoardTemplate(board.template);
            } else {
                const FLOW_TYPES = ['flow_start', 'flow_end', 'flow_process', 'flow_decision', 'flow_data'];
                const hasFlowNodes = (board.nodes || []).some((n: any) => FLOW_TYPES.includes(n.type));
                setActiveBoardTemplate(hasFlowNodes ? 'flowchart' : (board.template || 'basic'));
            }
        }).catch(() => setActiveBoardTemplate('basic'));
    }, [activeBoardId]);

    // Poll pending team requests every 30 seconds
    const fetchPendingRequests = async () => {
        try {
            const reqs = await teamAPI.getIncomingRequests();
            setPendingRequestCount(Array.isArray(reqs) ? reqs.length : 0);
        } catch {
            // Sessizce başarısız ol
        }
    };

    useEffect(() => {
        fetchPendingRequests();
        const interval = setInterval(fetchPendingRequests, 30_000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateBoard = async (title: string, teamId?: string, template?: string) => {
        try {
            const newBoard = await boardAPI.createBoard(title, teamId, template);
            setBoards(prev => [...prev, newBoard]);
            setActiveBoardId(newBoard.id);
            setActiveBoardTemplate(newBoard.template || template || 'basic');
            showToast(`"${title}" panosu oluşturuldu.`, 'success');
        } catch (error) {
            showToast('Pano oluşturulamadı. Lütfen tekrar deneyin.', 'error');
        }
    };

    const handleDeleteBoard = async () => {
        if (!deleteTarget) return;
        try {
            await boardAPI.deleteBoard(deleteTarget.id);
            const remaining = boards.filter(b => b.id !== deleteTarget.id);
            setBoards(remaining);
            if (activeBoardId === deleteTarget.id) {
                setActiveBoardId(remaining.length > 0 ? remaining[0].id : null);
            }
            showToast(`"${deleteTarget.title}" silindi.`, 'success');
        } catch (error) {
            showToast('Pano silinemedi.', 'error');
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleGenerate = () => {
        setRefreshKey(old => old + 1);
    };

    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        return (localStorage.getItem('theme') as 'light' | 'dark') ||
               (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleOpenTeams = () => {
        setShowTeamsPanel(true);
        setPendingRequestCount(0);
    };

    // Kullanıcıyı panoya ekip daveti ile davet et
    const handleInviteUser = async (email: string) => {
        // Mevcut panoya sahip ekip bulunur ve davet gönderilir
        const activeBoard = boards.find(b => b.id === activeBoardId);
        if (!activeBoard?.team_id) {
            showToast('Bu özellik sadece ekip panolarında kullanılabilir.', 'info');
            return;
        }
        try {
            await teamAPI.inviteMember(activeBoard.team_id, email);
            showToast(`${email} adresine ekip daveti gönderildi.`, 'success');
        } catch (err: any) {
            showToast(err?.response?.data?.detail || 'Davet gönderilemedi.', 'error');
        }
    };

    return (
        <>
            <div className="app-layout">
                <Sidebar
                    boards={boards}
                    activeBoardId={activeBoardId}
                    onSelectBoard={setActiveBoardId}
                    onCreateBoard={() => setShowCreateModal(true)}
                    onDeleteBoard={(id, title) => setDeleteTarget({ id, title })}
                    userEmail={userEmail}
                    userId={userId}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                />
                <div className="main-content">
                    {/* Teams floating icon — sağ üst */}
                    <button
                        id="teams-fab-btn"
                        className="teams-fab-icon"
                        onClick={handleOpenTeams}
                        title="Ekipler ve İşbirliği"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3"/>
                            <circle cx="6" cy="12" r="3"/>
                            <circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                        {pendingRequestCount > 0 && (
                            <span className="teams-fab-badge">{pendingRequestCount}</span>
                        )}
                    </button>
                    {/* Bildirim çanı */}
                    <div style={{ position: 'absolute', top: 16, right: 60, zIndex: 200 }}>
                        <NotificationBell
                            onNavigateToBoard={(boardId) => {
                                setActiveBoardId(boardId);
                            }}
                        />
                    </div>
                    {activeBoardId ? (
                        <>
                            <Canvas
                                boardId={activeBoardId}
                                refreshKey={refreshKey}
                                showToast={showToast}
                                currentUserEmail={userEmail}
                                onInviteUser={handleInviteUser}
                            />
                            <Toolbar 
                                boardId={activeBoardId} 
                                boardTemplate={activeBoardTemplate}
                                onGenerate={handleGenerate} 
                                showToast={showToast} 
                            />
                        </>
                    ) : (
                        <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#666' }}>
                            <h2>Henüz bir pano yok</h2>
                            <button className="ai-btn" style={{ marginTop: 16 }} onClick={() => setShowCreateModal(true)}>
                                Yeni Pano Oluştur
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreateBoardModal
                    onConfirm={handleCreateBoard}
                    onClose={() => setShowCreateModal(false)}
                    ownedTeams={ownedTeams}
                />
            )}
            {deleteTarget && (
                <ConfirmModal
                    message={`"${deleteTarget.title}" panosunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
                    confirmLabel="Sil"
                    danger
                    onConfirm={handleDeleteBoard}
                    onClose={() => setDeleteTarget(null)}
                />
            )}

            {/* Teams Panel */}
            {showTeamsPanel && (
                <TeamsPanel
                    onClose={() => {
                        setShowTeamsPanel(false);
                        fetchPendingRequests();
                        fetchBoards();
                    }}
                    currentUserEmail={userEmail}
                    showToast={showToast}
                />
            )}

            {/* Toast notifications */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </>
    );
};

export default Dashboard;
