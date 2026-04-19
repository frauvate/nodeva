import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Toolbar from '../components/Toolbar';
import Canvas from '../components/Canvas';
import { CreateBoardModal, ConfirmModal } from '../components/Modal';
import { ToastContainer, useToast } from '../components/Toast';
import { boardAPI } from '../services/api';
import { supabase } from '../lib/supabase';
import '../App.css';

const Dashboard: React.FC = () => {
    const [boards, setBoards] = useState<any[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [userEmail, setUserEmail] = useState('');

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserEmail(session?.user?.email || '');
        });
    }, []);

    const fetchBoards = async () => {
        try {
            const data = await boardAPI.getBoards();
            setBoards(data);
            if (data.length > 0 && !activeBoardId) {
                setActiveBoardId(data[0]._id);
            }
        } catch (error) {
            showToast('Panolar yüklenemedi. Lütfen tekrar deneyin.', 'error');
        }
    };

    useEffect(() => { fetchBoards(); }, [refreshKey]);

    const handleCreateBoard = async (title: string) => {
        try {
            const newBoard = await boardAPI.createBoard(title);
            setBoards(prev => [...prev, newBoard]);
            setActiveBoardId(newBoard._id);
            showToast(`"${title}" panosu oluşturuldu.`, 'success');
        } catch (error) {
            showToast('Pano oluşturulamadı. Lütfen tekrar deneyin.', 'error');
        }
    };

    const handleDeleteBoard = async () => {
        if (!deleteTarget) return;
        try {
            await boardAPI.deleteBoard(deleteTarget.id);
            const remaining = boards.filter(b => b._id !== deleteTarget.id);
            setBoards(remaining);
            if (activeBoardId === deleteTarget.id) {
                setActiveBoardId(remaining.length > 0 ? remaining[0]._id : null);
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
                    theme={theme}
                    onToggleTheme={toggleTheme}
                />
                <div className="main-content">
                    {activeBoardId ? (
                        <>
                            <Canvas boardId={activeBoardId} refreshKey={refreshKey} showToast={showToast} />
                            <Toolbar boardId={activeBoardId} onGenerate={handleGenerate} showToast={showToast} />
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

            {/* Toast notifications */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </>
    );
};

export default Dashboard;
