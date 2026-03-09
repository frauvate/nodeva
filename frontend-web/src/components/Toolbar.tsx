import React, { useState } from 'react';
import { boardAPI } from '../services/api';
import './Toolbar.css';

interface ToolbarProps {
    boardId: string;
    onGenerate: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ boardId, onGenerate }) => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        try {
            await boardAPI.generateAIWorkflow(boardId, prompt);
            setPrompt('');
            onGenerate(); // tell dashboard to refresh canvas
        } catch (error) {
            console.error("AI Generation failed", error);
            alert("AI üretimi başarısız oldu.");
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, type: string) => {
        e.dataTransfer.setData('nodeType', type);
    };

    return (
        <div className="toolbar glass-panel">
            <div className="drag-items">
                {/* We use HTML5 Drag&Drop for elements coming from the toolbar to Canvas */}
                <div
                    className="drag-item node-task"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'task')}
                >
                    Görev Ekle
                </div>
                <div
                    className="drag-item node-note"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'note')}
                >
                    Not Ekle
                </div>
            </div>

            <div className="ai-section">
                <input
                    type="text"
                    placeholder="Yapay Zeka ile İş Akışı Oluştur..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    className="ai-input"
                    disabled={loading}
                />
                <button className="ai-btn" onClick={handleGenerate} disabled={loading}>
                    {loading ? 'Üretiliyor...' : 'Üret'}
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
