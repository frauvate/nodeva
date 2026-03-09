import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Toolbar from '../components/Toolbar';
import Canvas from '../components/Canvas';
import { boardAPI } from '../services/api';
import '../App.css';

const Dashboard: React.FC = () => {
    const [boards, setBoards] = useState<any[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchBoards = async () => {
        try {
            const data = await boardAPI.getBoards();
            setBoards(data);
            if (data.length > 0 && !activeBoardId) {
                setActiveBoardId(data[0]._id);
            }
        } catch (error) {
            console.error("Failed to fetch boards", error);
        }
    };

    useEffect(() => {
        fetchBoards();
    }, [refreshKey]);

    const handleCreateBoard = async () => {
        const title = prompt("Yeni pano adı:");
        if (title) {
            const newBoard = await boardAPI.createBoard(title);
            setBoards([...boards, newBoard]);
            setActiveBoardId(newBoard._id);
        }
    };

    const handleGenerate = () => {
        setRefreshKey(old => old + 1);
    };

    return (
        <div className="app-layout">
            <Sidebar
                boards={boards}
                activeBoardId={activeBoardId}
                onSelectBoard={setActiveBoardId}
                onCreateBoard={handleCreateBoard}
            />
            <div className="main-content">
                {activeBoardId ? (
                    <>
                        <Canvas boardId={activeBoardId} refreshKey={refreshKey} />
                        <Toolbar boardId={activeBoardId} onGenerate={handleGenerate} />
                    </>
                ) : (
                    <div style={{ margin: "auto", display: "flex", flexDirection: "column", alignItems: "center", color: "#666" }}>
                        <h2>Henüz bir pano yok</h2>
                        <button className="ai-btn" style={{ marginTop: 16 }} onClick={handleCreateBoard}>Yeni Pano Oluştur</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
